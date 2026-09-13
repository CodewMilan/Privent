import type { Executor } from "@privent/blockchain";
import type { ExecutionMode, TransactionStatus } from "@privent/shared";
import { Hono } from "hono";
import { authorize } from "./authorize.js";
import { broadcast, buildPermit } from "./broadcast.js";
import {
  completeTransaction,
  getApproval,
  reservePendingTransaction,
  type SignerDatabase,
} from "./db.js";

export interface SignerAppConfig {
  db: SignerDatabase;
  executor: Executor;
  chainId: number;
  bearerToken: string;
}

export interface SignResponseSuccess {
  ok: true;
  actionRequestId: string;
  hash: string | null;
  status: TransactionStatus;
  fromAddress: string | null;
  toAddress: string | null;
  mode: ExecutionMode;
  reused?: boolean;
}

export interface SignResponseError {
  ok: false;
  code: string;
  reason: string;
}

/**
 * The signer service. It exposes a single narrow endpoint plus a health
 * check. It does NOT accept arbitrary transactions — the caller may only
 * name an action-request id and its owning agent id.
 */
export function createSignerApp(config: SignerAppConfig): Hono {
  const app = new Hono();

  const requireBearer = (authorization: string | undefined): boolean => {
    if (!authorization) return false;
    const [scheme, token] = authorization.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token) return false;
    // Constant-time compare to avoid timing hints.
    if (token.length !== config.bearerToken.length) return false;
    let diff = 0;
    for (let i = 0; i < token.length; i += 1) {
      diff |= token.charCodeAt(i) ^ config.bearerToken.charCodeAt(i);
    }
    return diff === 0;
  };

  app.get("/health", (c) =>
    c.json({
      ok: true,
      chainId: config.chainId,
      mode: config.executor.mode,
      fromAddress: config.executor.fromAddress,
    }),
  );

  app.post("/sign", async (c) => {
    if (!requireBearer(c.req.header("authorization"))) {
      return c.json<SignResponseError>(
        { ok: false, code: "UNAUTHORIZED", reason: "Missing or invalid bearer token." },
        401,
      );
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json<SignResponseError>(
        { ok: false, code: "BAD_REQUEST", reason: "Body must be JSON." },
        400,
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      typeof (body as { actionRequestId?: unknown }).actionRequestId !== "string" ||
      typeof (body as { agentId?: unknown }).agentId !== "string"
    ) {
      return c.json<SignResponseError>(
        {
          ok: false,
          code: "BAD_REQUEST",
          reason: "actionRequestId and agentId (strings) are required.",
        },
        400,
      );
    }

    const { actionRequestId, agentId } = body as {
      actionRequestId: string;
      agentId: string;
    };

    const result = authorize({
      db: config.db,
      actionRequestId,
      agentId,
      signerChainId: config.chainId,
    });

    if (!result.ok) {
      if (result.code === "DUPLICATE_TRANSACTION" && result.existingTransaction?.hash) {
        // Idempotency: return the prior receipt instead of double-broadcasting.
        return c.json<SignResponseSuccess>(
          {
            ok: true,
            actionRequestId,
            hash: result.existingTransaction.hash,
            status: result.existingTransaction.status,
            fromAddress: result.existingTransaction.fromAddress,
            toAddress: result.existingTransaction.toAddress,
            mode: result.existingTransaction.mode ?? config.executor.mode,
            reused: true,
          },
          200,
        );
      }
      const status = result.code === "ACTION_NOT_FOUND" ? 404 : 403;
      return c.json<SignResponseError>(
        { ok: false, code: result.code, reason: result.reason },
        status,
      );
    }

    // Reserve BEFORE we broadcast. This gives us anti-replay via the
    // UNIQUE(action_request_id) constraint on the transactions table.
    const reservation = reservePendingTransaction(config.db, actionRequestId);
    if (!reservation.reserved) {
      const existing = reservation.existing;
      if (existing?.hash) {
        return c.json<SignResponseSuccess>(
          {
            ok: true,
            actionRequestId,
            hash: existing.hash,
            status: existing.status,
            fromAddress: existing.fromAddress,
            toAddress: existing.toAddress,
            mode: existing.mode ?? config.executor.mode,
            reused: true,
          },
          200,
        );
      }
      return c.json<SignResponseError>(
        {
          ok: false,
          code: "DUPLICATE_TRANSACTION",
          reason: "A signing attempt is already in progress for this action.",
        },
        409,
      );
    }

    const approval = getApproval(config.db, actionRequestId);
    let permit;
    try {
      permit = buildPermit(result.action!, result.agent!, result.controls!, approval);
    } catch (error) {
      completeTransaction(config.db, actionRequestId, {
        hash: null,
        status: "failed",
        fromAddress: null,
        toAddress: null,
        mode: null,
        error: error instanceof Error ? error.message : "buildPermit failed",
      });
      return c.json<SignResponseError>(
        {
          ok: false,
          code: "PERMIT_BUILD_FAILED",
          reason: error instanceof Error ? error.message : "buildPermit failed",
        },
        400,
      );
    }

    try {
      const receipt = await broadcast(config.executor, permit);
      completeTransaction(config.db, actionRequestId, {
        hash: receipt.hash,
        status: receipt.status,
        fromAddress: receipt.fromAddress,
        toAddress: receipt.toAddress,
        mode: receipt.mode,
        error: receipt.error,
      });
      return c.json<SignResponseSuccess>(
        {
          ok: true,
          actionRequestId,
          hash: receipt.hash,
          status: receipt.status,
          fromAddress: receipt.fromAddress,
          toAddress: receipt.toAddress,
          mode: receipt.mode,
        },
        200,
      );
    } catch (error) {
      completeTransaction(config.db, actionRequestId, {
        hash: null,
        status: "failed",
        fromAddress: null,
        toAddress: null,
        mode: null,
        error: error instanceof Error ? error.message : String(error),
      });
      return c.json<SignResponseError>(
        {
          ok: false,
          code: "BROADCAST_FAILED",
          reason: error instanceof Error ? error.message : "broadcast failed",
        },
        502,
      );
    }
  });

  return app;
}

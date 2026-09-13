import type { Executor } from "@privent/blockchain";
import {
  authorize,
  broadcast,
  buildPermit,
  completeTransaction,
  getApproval,
  reservePendingTransaction,
  type SignerDatabase,
} from "@privent/signer";
import type { SignerClient } from "./signer-client.js";

/**
 * In-process signer used by tests. It runs the SAME independent
 * verification code as the HTTP signer, so tests really exercise the
 * boundary — they just skip the network hop.
 */
export function createInlineSignerClient(config: {
  db: SignerDatabase;
  executor: Executor;
  chainId: number;
}): SignerClient {
  return {
    kind: "inline",
    endpoint: "inline://signer",
    isolated: false,
    async sign(input) {
      const auth = authorize({
        db: config.db,
        actionRequestId: input.actionRequestId,
        agentId: input.agentId,
        signerChainId: config.chainId,
      });
      if (!auth.ok) {
        if (auth.code === "DUPLICATE_TRANSACTION" && auth.existingTransaction?.hash) {
          return {
            ok: true,
            reused: true,
            result: {
              hash: auth.existingTransaction.hash,
              status: auth.existingTransaction.status,
              fromAddress: auth.existingTransaction.fromAddress ?? "",
              toAddress: auth.existingTransaction.toAddress ?? "",
              mode: (auth.existingTransaction.mode ?? config.executor.mode),
              error: null,
            },
          };
        }
        return {
          ok: false,
          code: auth.code,
          reason: auth.reason,
          httpStatus: null,
        };
      }
      const reservation = reservePendingTransaction(config.db, input.actionRequestId);
      if (!reservation.reserved) {
        const existing = reservation.existing;
        if (existing?.hash) {
          return {
            ok: true,
            reused: true,
            result: {
              hash: existing.hash,
              status: existing.status,
              fromAddress: existing.fromAddress ?? "",
              toAddress: existing.toAddress ?? "",
              mode: (existing.mode ?? config.executor.mode),
              error: null,
            },
          };
        }
        return {
          ok: false,
          code: "DUPLICATE_TRANSACTION",
          reason: "A signing attempt is already in progress for this action.",
          httpStatus: null,
        };
      }
      const approval = getApproval(config.db, input.actionRequestId);
      try {
        const permit = buildPermit(auth.action!, auth.agent!, auth.controls!, approval);
        const receipt = await broadcast(config.executor, permit);
        completeTransaction(config.db, input.actionRequestId, {
          hash: receipt.hash,
          status: receipt.status,
          fromAddress: receipt.fromAddress,
          toAddress: receipt.toAddress,
          mode: receipt.mode,
          error: receipt.error,
        });
        return { ok: true, reused: false, result: receipt };
      } catch (error) {
        completeTransaction(config.db, input.actionRequestId, {
          hash: null,
          status: "failed",
          fromAddress: null,
          toAddress: null,
          mode: null,
          error: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          code: "BROADCAST_FAILED",
          reason: error instanceof Error ? error.message : String(error),
          httpStatus: null,
        };
      }
    },
  };
}

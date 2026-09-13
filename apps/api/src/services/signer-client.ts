import type { ExecutionResult } from "@privent/blockchain";

export interface SignerRequest {
  actionRequestId: string;
  agentId: string;
}

export interface SignerClientSuccess {
  ok: true;
  result: ExecutionResult;
  reused: boolean;
}

export interface SignerClientFailure {
  ok: false;
  code: string;
  reason: string;
  httpStatus: number | null;
}

export type SignerClientResponse = SignerClientSuccess | SignerClientFailure;

/**
 * Narrow interface: the API can only ask the signer to sign an
 * already-persisted action by id. It cannot pass a hand-crafted
 * transaction, a recipient, or an amount.
 */
export interface SignerClient {
  readonly kind: "http" | "inline";
  readonly endpoint: string;
  readonly isolated: boolean;
  sign(input: SignerRequest): Promise<SignerClientResponse>;
}

export interface HttpSignerClientConfig {
  endpoint: string;
  bearerToken: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

interface WireSuccess {
  ok: true;
  actionRequestId: string;
  hash: string | null;
  status: ExecutionResult["status"];
  fromAddress: string | null;
  toAddress: string | null;
  mode: ExecutionResult["mode"];
  reused?: boolean;
}

interface WireError {
  ok: false;
  code: string;
  reason: string;
}

export function createHttpSignerClient(config: HttpSignerClientConfig): SignerClient {
  const fetchImpl = config.fetchImpl ?? fetch;
  const endpoint = config.endpoint.replace(/\/$/, "");
  return {
    kind: "http",
    endpoint,
    isolated: true,
    async sign(input) {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        config.timeoutMs ?? 30_000,
      );
      try {
        const response = await fetchImpl(`${endpoint}/sign`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${config.bearerToken}`,
          },
          body: JSON.stringify(input),
          signal: controller.signal,
        });
        const body = (await response.json().catch(() => null)) as
          | WireSuccess
          | WireError
          | null;
        if (!body) {
          return {
            ok: false,
            code: "SIGNER_BAD_RESPONSE",
            reason: `Signer returned a non-JSON response (HTTP ${response.status}).`,
            httpStatus: response.status,
          };
        }
        if (!body.ok) {
          return {
            ok: false,
            code: body.code,
            reason: body.reason,
            httpStatus: response.status,
          };
        }
        return {
          ok: true,
          reused: body.reused === true,
          result: {
            hash: body.hash,
            status: body.status,
            fromAddress: body.fromAddress ?? "",
            toAddress: body.toAddress ?? "",
            mode: body.mode,
            error: null,
          },
        };
      } catch (error) {
        return {
          ok: false,
          code: "SIGNER_UNREACHABLE",
          reason:
            error instanceof Error
              ? `Cannot reach signer: ${error.message}`
              : "Cannot reach signer.",
          httpStatus: null,
        };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

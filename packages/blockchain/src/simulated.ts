import { keccak256, stringToHex } from "viem";
import { authorizeExecution } from "./authorize.js";
import type { ExecutionPermit, ExecutionResult, Executor } from "./types.js";

export const SIMULATED_FROM = "0x1111111111111111111111111111111111111111";

export function createSimulatedExecutor(
  fromAddress: string = SIMULATED_FROM,
): Executor {
  return {
    mode: "simulated",
    fromAddress,
    async send(permit: ExecutionPermit): Promise<ExecutionResult> {
      const authorized = authorizeExecution(permit);
      if (!authorized.ok) {
        return {
          status: "failed",
          hash: null,
          fromAddress,
          toAddress: permit.transfer.to,
          mode: "simulated",
          error: authorized.reason,
        };
      }

      const hash = keccak256(
        stringToHex(
          `privent:${permit.transfer.actionRequestId}:${permit.transfer.amountCents}`,
        ),
      );

      return {
        status: "confirmed",
        hash,
        fromAddress,
        toAddress: permit.transfer.to,
        mode: "simulated",
        error: null,
      };
    },
  };
}

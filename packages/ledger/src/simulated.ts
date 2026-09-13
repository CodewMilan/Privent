import type { ExecutionPermit } from "@privent/blockchain";
import { previewFromPermit } from "./types.js";
import type { GenuineCheck, LedgerConfirmation, LedgerSigner } from "./types.js";

export function createSimulatedLedger(
  options: { genuine?: boolean; reject?: boolean } = {},
): LedgerSigner {
  const genuine = options.genuine ?? true;

  return {
    kind: "simulated",
    async genuineCheck(): Promise<GenuineCheck> {
      return { genuine, source: "simulated" };
    },
    async preview(permit: ExecutionPermit) {
      return previewFromPermit(permit);
    },
    async confirm(permit: ExecutionPermit): Promise<LedgerConfirmation> {
      const check = await this.genuineCheck();
      const preview = previewFromPermit(permit);
      if (!check.genuine) {
        throw new Error("Ledger genuine-check failed — refusing to sign");
      }
      return {
        actionRequestId: permit.transfer.actionRequestId,
        status: options.reject ? "rejected" : "confirmed",
        device: "simulated",
        preview,
      };
    },
  };
}

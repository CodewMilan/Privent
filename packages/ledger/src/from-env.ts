import { createCliLedger } from "./cli.js";
import { createSimulatedLedger } from "./simulated.js";
import type { LedgerSigner } from "./types.js";

/**
 * Production factory. Tests never call this — they inject a simulated
 * device so a leftover LEDGER_CLI in the shell cannot spawn wallet-cli.
 *
 * Confirm remains dry-run. The existing executor still broadcasts after
 * the device says yes.
 */
export function createLedgerFromEnv(): LedgerSigner {
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return createSimulatedLedger();
  }

  const bin = process.env.LEDGER_CLI?.trim();
  if (!bin) {
    return createSimulatedLedger();
  }

  return createCliLedger({
    bin,
    account: process.env.LEDGER_ACCOUNT?.trim() || undefined,
  });
}

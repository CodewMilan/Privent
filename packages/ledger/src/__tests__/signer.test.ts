import { describe, expect, it } from "vitest";
import type { ExecutionPermit } from "@privent/blockchain";
import { createCliLedger } from "../cli.js";
import { createLedgerFromEnv } from "../from-env.js";
import { createSimulatedLedger } from "../simulated.js";

const permit: ExecutionPermit = {
  transfer: {
    actionRequestId: "act_1",
    to: "0x2222222222222222222222222222222222222222",
    amountCents: 120_000,
    asset: "USDC",
    reason: "Vendor retainer",
  },
  policyDecision: "REQUIRE_APPROVAL",
  approvalStatus: "approved",
};

describe("Ledger signer", () => {
  it("previews a dry-run and confirms on a genuine simulated device", async () => {
    const ledger = createSimulatedLedger();
    const preview = await ledger.preview(permit);
    expect(preview.dryRun).toBe(true);
    expect(preview.command).toMatch(/wallet-cli send/);
    expect(preview.command).toMatch(/--dry-run/);
    const confirmed = await ledger.confirm(permit);
    expect(confirmed.status).toBe("confirmed");
    expect(confirmed.device).toBe("simulated");
  });

  it("refuses to confirm when genuine-check fails", async () => {
    const ledger = createSimulatedLedger({ genuine: false });
    await expect(ledger.confirm(permit)).rejects.toThrow(/genuine-check/);
  });

  it("records a device rejection without producing a hash", async () => {
    const ledger = createSimulatedLedger({ reject: true });
    const result = await ledger.confirm(permit);
    expect(result.status).toBe("rejected");
  });

  it("CLI adapter refuses when the binary is missing", async () => {
    const ledger = createCliLedger({
      exec: async () => ({ ok: false, stdout: "wallet-cli is not installed" }),
    });
    await expect(ledger.confirm(permit)).rejects.toThrow(/genuine-check/);
  });

  it("env factory stays simulated under tests even if LEDGER_CLI is set", () => {
    const previous = process.env.LEDGER_CLI;
    process.env.LEDGER_CLI = "wallet-cli";
    try {
      expect(createLedgerFromEnv().kind).toBe("simulated");
    } finally {
      if (previous === undefined) {
        delete process.env.LEDGER_CLI;
      } else {
        process.env.LEDGER_CLI = previous;
      }
    }
  });
});

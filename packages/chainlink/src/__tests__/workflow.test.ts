import { describe, expect, it } from "vitest";
import type { ProposedAction } from "@privent/shared";
import {
  DEMO_PRIVATE_STRATEGY,
  DEMO_TEE_SECRETS,
  evaluatePrivateStrategy,
  runTreasuryRiskWorkflow,
} from "../index.js";

const transfer = (amountCents: number, recipient = "0x2222222222222222222222222222222222222222"): ProposedAction => ({
  action: "TRANSFER",
  asset: "USDC",
  amountCents,
  recipient,
  contract: null,
  reason: "Vendor payment",
});

describe("confidential treasury workflow", () => {
  it("keeps the private floor out of the public report", () => {
    const result = runTreasuryRiskWorkflow(transfer(45_000));
    expect(result.simulated).toBe(true);
    expect(result.evaluation.decision).toBe("REQUIRE_APPROVAL");
    expect(result.report.tee).toBe("nitro-sim");
    const dump = JSON.stringify(result);
    expect(dump).not.toContain(String(DEMO_PRIVATE_STRATEGY.confidentialLedgerFloorCents));
    expect(dump).not.toContain(DEMO_TEE_SECRETS.STRATEGY_SALT);
  });

  it("allows a send under the private floor", () => {
    const result = evaluatePrivateStrategy(transfer(32_000), DEMO_PRIVATE_STRATEGY);
    expect(result.decision).toBe("ALLOW");
  });

  it("requires hardware confirmation for an elevated-risk recipient", () => {
    const risky = "0x4444444444444444444444444444444444444444";
    const result = runTreasuryRiskWorkflow(transfer(20_000, risky), {
      ...DEMO_PRIVATE_STRATEGY,
      elevatedRiskRecipients: [risky],
    });
    expect(result.evaluation.decision).toBe("REQUIRE_APPROVAL");
    expect(JSON.stringify(result.evaluation)).not.toContain(risky);
  });
});

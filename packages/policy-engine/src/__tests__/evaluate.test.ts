import { describe, expect, it } from "vitest";
import type { AgentPolicy, PolicyContext, ProposedAction } from "@privent/shared";
import { dollarsToCents } from "@privent/shared";
import { evaluateAction } from "../evaluate.js";

const RECIPIENT = "0x1111111111111111111111111111111111111111";
const OTHER = "0x2222222222222222222222222222222222222222";
const CONTRACT = "0x3333333333333333333333333333333333333333";

const demoPolicy: AgentPolicy = {
  dailyLimitCents: dollarsToCents(10_000),
  perTransactionLimitCents: dollarsToCents(2_000),
  approvalThresholdCents: dollarsToCents(500),
  denyThresholdCents: dollarsToCents(2_000),
  allowedAssets: ["USDC", "ETH"],
  allowedContracts: [],
  allowedRecipients: [],
};

const active: PolicyContext = {
  spentTodayCents: 0,
  agentStatus: "active",
};

function transfer(amount: number, extra: Partial<ProposedAction> = {}): ProposedAction {
  return {
    action: "TRANSFER",
    asset: "USDC",
    amountCents: dollarsToCents(amount),
    recipient: RECIPIENT,
    contract: null,
    reason: "Vendor payment",
    ...extra,
  };
}

describe("evaluateAction", () => {
  it("allows $200", () => {
    expect(evaluateAction(transfer(200), demoPolicy, active).decision).toBe(
      "ALLOW",
    );
  });

  it("requires approval for $750", () => {
    expect(evaluateAction(transfer(750), demoPolicy, active).decision).toBe(
      "REQUIRE_APPROVAL",
    );
  });

  it("denies $5000", () => {
    const result = evaluateAction(transfer(5000), demoPolicy, active);
    expect(result.decision).toBe("DENY");
    expect(result.code).toBe("EXCEEDS_DENY_THRESHOLD");
    expect(result.reason).toContain("$2,000");
    expect(result.reason).toContain("$5,000");
  });

  it("treats $499 as ALLOW and $500/$501 as REQUIRE_APPROVAL", () => {
    expect(evaluateAction(transfer(499), demoPolicy, active).decision).toBe(
      "ALLOW",
    );
    expect(evaluateAction(transfer(500), demoPolicy, active).decision).toBe(
      "REQUIRE_APPROVAL",
    );
    expect(evaluateAction(transfer(501), demoPolicy, active).decision).toBe(
      "REQUIRE_APPROVAL",
    );
  });

  it("allows $2000 and denies anything above the deny threshold", () => {
    expect(evaluateAction(transfer(2000), demoPolicy, active).decision).toBe(
      "REQUIRE_APPROVAL",
    );
    expect(evaluateAction(transfer(2000.01), demoPolicy, active).decision).toBe(
      "DENY",
    );
  });

  it("denies an unknown asset", () => {
    const result = evaluateAction(transfer(200, { asset: "DAI" }), demoPolicy, active);
    expect(result).toMatchObject({
      decision: "DENY",
      code: "ASSET_NOT_ALLOWED",
    });
  });

  it("denies a recipient outside a non-empty allowlist", () => {
    const policy = {
      ...demoPolicy,
      allowedRecipients: [RECIPIENT],
    };
    const result = evaluateAction(transfer(200, { recipient: OTHER }), policy, active);
    expect(result).toMatchObject({
      decision: "DENY",
      code: "RECIPIENT_NOT_ALLOWED",
    });
  });

  it("denies an unauthorized contract", () => {
    const policy = {
      ...demoPolicy,
      allowedContracts: [CONTRACT],
    };
    const result = evaluateAction(
      transfer(200, { contract: OTHER }),
      policy,
      active,
    );
    expect(result).toMatchObject({
      decision: "DENY",
      code: "CONTRACT_NOT_ALLOWED",
    });
  });

  it("denies when the daily limit would be exceeded", () => {
    const result = evaluateAction(transfer(300), demoPolicy, {
      spentTodayCents: dollarsToCents(9800),
      agentStatus: "active",
    });
    expect(result).toMatchObject({
      decision: "DENY",
      code: "EXCEEDS_DAILY_LIMIT",
    });
  });

  it("denies a paused agent even for a small amount", () => {
    const result = evaluateAction(transfer(20), demoPolicy, {
      spentTodayCents: 0,
      agentStatus: "paused",
    });
    expect(result).toMatchObject({
      decision: "DENY",
      code: "AGENT_PAUSED",
    });
  });

  it("ignores a forged ALLOW on the incoming request", () => {
    const forged = {
      ...transfer(5000),
      policyDecision: "ALLOW",
    } as ProposedAction & { policyDecision: "ALLOW" };

    expect(evaluateAction(forged, demoPolicy, active).decision).toBe("DENY");
  });

  it("is deterministic", () => {
    const first = evaluateAction(transfer(750), demoPolicy, active);
    const second = evaluateAction(transfer(750), demoPolicy, active);
    expect(first).toEqual(second);
  });
});

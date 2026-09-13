import { describe, expect, it } from "vitest";
import type { AgentPolicy, PolicyEvaluation, ProposedAction } from "@privent/shared";
import {
  combineEvaluations,
  evaluateWalletPolicy,
  fromPrivyPolicyBody,
  intersectLimits,
  toPrivyPolicyBody,
  walletPolicyFromApp,
} from "../policy.js";

const app: AgentPolicy = {
  dailyLimitCents: 1_000_000,
  perTransactionLimitCents: 200_000,
  approvalThresholdCents: 50_000,
  denyThresholdCents: 200_000,
  allowedAssets: ["USDC"],
  allowedContracts: [],
  allowedRecipients: [],
};

const transfer = (amountCents: number, recipient = "0x2222222222222222222222222222222222222222"): ProposedAction => ({
  action: "TRANSFER",
  asset: "USDC",
  amountCents,
  recipient,
  contract: null,
  reason: "Vendor payment",
});

describe("wallet policy mapping", () => {
  it("matches app auto/deny bands", () => {
    const wallet = walletPolicyFromApp(app);
    expect(wallet.maxAutoCents).toBe(50_000);
    expect(wallet.maxSendCents).toBe(200_000);
    expect(wallet.exportPrivateKey).toBe(false);
  });

  it("UI uses the tighter wallet cap, never a looser app band", () => {
    const wallet = {
      ...walletPolicyFromApp(app),
      maxAutoCents: 10_000,
      maxSendCents: 100_000,
    };
    const shown = intersectLimits(app, wallet);
    expect(shown.approvalThreshold).toBe(100);
    expect(shown.denyThreshold).toBe(1000);
    expect(shown.approvalThreshold).toBeLessThan(app.approvalThresholdCents / 100);
  });

  it("Privy rules deny key export and pin Sepolia 0-value sends", () => {
    const wallet = walletPolicyFromApp(app, 11155111);
    wallet.allowedRecipients = ["0x2222222222222222222222222222222222222222"];
    const body = toPrivyPolicyBody("privent-treasury", wallet);
    const parsed = fromPrivyPolicyBody(body);
    expect(parsed.exportDenied).toBe(true);
    expect(parsed.chainId).toBe(11155111);
    expect(parsed.maxValueWei).toBe("0x0");
    expect(parsed.allowedRecipients).toEqual([
      "0x2222222222222222222222222222222222222222",
    ]);
  });
});

describe("evaluateWalletPolicy", () => {
  const wallet = {
    ...walletPolicyFromApp(app),
    allowedRecipients: ["0x2222222222222222222222222222222222222222"],
  };

  it("blocks a recipient the wallet does not allow even if the app would", () => {
    const result = evaluateWalletPolicy(
      transfer(20_000, "0x3333333333333333333333333333333333333333"),
      wallet,
      { humanApproved: false },
    );
    expect(result.decision).toBe("DENY");
    expect(result.code).toBe("WALLET_POLICY_DENIED");
  });

  it("requires a human when the wallet auto cap is tighter than the app", () => {
    const tight = { ...wallet, maxAutoCents: 10_000 };
    const result = evaluateWalletPolicy(transfer(20_000), tight, {
      humanApproved: false,
    });
    expect(result.decision).toBe("REQUIRE_APPROVAL");
    expect(result.code).toBe("WALLET_POLICY_DENIED");
  });

  it("allows a human-approved send under the wallet send cap", () => {
    const result = evaluateWalletPolicy(transfer(120_000), wallet, {
      humanApproved: true,
    });
    expect(result.decision).toBe("ALLOW");
  });
});

describe("combineEvaluations", () => {
  const allow: PolicyEvaluation = {
    decision: "ALLOW",
    code: "ALLOWED",
    reason: "app allows",
  };
  const deny: PolicyEvaluation = {
    decision: "DENY",
    code: "WALLET_POLICY_DENIED",
    reason: "wallet denies",
  };

  it("lets a wallet DENY beat an app ALLOW", () => {
    expect(combineEvaluations(allow, deny).decision).toBe("DENY");
    expect(combineEvaluations(allow, deny).code).toBe("WALLET_POLICY_DENIED");
  });

  it("keeps the app approval reason when both require a human", () => {
    const appWait: PolicyEvaluation = {
      decision: "REQUIRE_APPROVAL",
      code: "REQUIRES_APPROVAL",
      reason: "needs approval",
    };
    const walletWait: PolicyEvaluation = {
      decision: "REQUIRE_APPROVAL",
      code: "WALLET_POLICY_DENIED",
      reason: "wallet cannot auto-send",
    };
    expect(combineEvaluations(appWait, walletWait).reason).toBe("needs approval");
    expect(combineEvaluations(allow, walletWait).decision).toBe(
      "REQUIRE_APPROVAL",
    );
  });
});

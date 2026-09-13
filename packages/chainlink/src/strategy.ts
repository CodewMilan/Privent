import type { PolicyDecision, PolicyEvaluation, ProposedAction } from "@privent/shared";

export interface PrivateStrategy {
  confidentialLedgerFloorCents: number;
  elevatedRiskRecipients: string[];
}

/**
 * Demo strategy. The $425 floor is tighter than the $500 app auto band
 * so CRE can upgrade an otherwise-ALLOW payment. This number must never
 * appear in public workflow output, audit metadata, or the dashboard.
 */
export const DEMO_PRIVATE_STRATEGY: PrivateStrategy = {
  confidentialLedgerFloorCents: 42_500,
  elevatedRiskRecipients: [],
};

export const STRATEGY_SALT_ID = "STRATEGY_SALT";

export function evaluatePrivateStrategy(
  action: ProposedAction,
  strategy: PrivateStrategy,
): PolicyEvaluation {
  const recipient = action.recipient?.trim().toLowerCase() ?? "";
  const elevated = strategy.elevatedRiskRecipients.map((item) =>
    item.trim().toLowerCase(),
  );

  if (recipient && elevated.includes(recipient)) {
    return {
      decision: "REQUIRE_APPROVAL",
      code: "CONFIDENTIAL_REQUIRES_APPROVAL",
      reason:
        "Confidential risk analysis flagged this recipient. Human and hardware confirmation required.",
    };
  }

  if (action.amountCents >= strategy.confidentialLedgerFloorCents) {
    return {
      decision: "REQUIRE_APPROVAL",
      code: "CONFIDENTIAL_REQUIRES_APPROVAL",
      reason:
        "Confidential risk analysis requires human and hardware confirmation.",
    };
  }

  return {
    decision: "ALLOW",
    code: "ALLOWED",
    reason: "Confidential risk analysis allows this send.",
  };
}

export function assertNoPrivateLeak(
  value: unknown,
  strategy: PrivateStrategy,
): void {
  const dump = JSON.stringify(value);
  if (dump.includes(String(strategy.confidentialLedgerFloorCents))) {
    throw new Error("Confidential strategy leaked a private threshold");
  }
  for (const recipient of strategy.elevatedRiskRecipients) {
    if (recipient && dump.includes(recipient)) {
      throw new Error("Confidential strategy leaked a private recipient");
    }
  }
}

export function publicPayload(evaluation: PolicyEvaluation): {
  decision: PolicyDecision;
  code: PolicyEvaluation["code"];
  reason: string;
} {
  return {
    decision: evaluation.decision,
    code: evaluation.code,
    reason: evaluation.reason,
  };
}

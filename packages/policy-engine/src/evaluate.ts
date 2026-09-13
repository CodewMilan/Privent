import {
  formatDollars,
  type AgentPolicy,
  type PolicyContext,
  type PolicyEvaluation,
  type ProposedAction,
} from "@privent/shared";

const ALLOWED_ACTIONS = new Set(["TRANSFER", "PAYMENT"]);

function normalizeAsset(asset: string): string {
  return asset.trim().toUpperCase();
}

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase();
}

function isAllowed(value: string, allowlist: string[]): boolean {
  if (allowlist.length === 0) {
    return true;
  }

  const needle = normalizeAddress(value);
  return allowlist.some((item) => normalizeAddress(item) === needle);
}

export function evaluateAction(
  action: ProposedAction,
  policy: AgentPolicy,
  context: PolicyContext,
): PolicyEvaluation {
  if (!ALLOWED_ACTIONS.has(action.action)) {
    return {
      decision: "DENY",
      code: "ACTION_NOT_ALLOWED",
      reason: `Action ${action.action} is not permitted.`,
    };
  }

  if (!Number.isInteger(action.amountCents) || action.amountCents <= 0) {
    return {
      decision: "DENY",
      code: "AMOUNT_INVALID",
      reason: "Amount must be a positive whole-cent value.",
    };
  }

  if (!action.reason.trim()) {
    return {
      decision: "DENY",
      code: "REASON_REQUIRED",
      reason: "Every action request needs a reason.",
    };
  }

  if (!action.recipient) {
    return {
      decision: "DENY",
      code: "RECIPIENT_REQUIRED",
      reason: "A recipient is required.",
    };
  }

  if (context.agentStatus === "paused") {
    return {
      decision: "DENY",
      code: "AGENT_PAUSED",
      reason: "The agent is paused and cannot spend.",
    };
  }

  const asset = normalizeAsset(action.asset);
  const allowedAssets = policy.allowedAssets.map(normalizeAsset);
  if (!allowedAssets.includes(asset)) {
    return {
      decision: "DENY",
      code: "ASSET_NOT_ALLOWED",
      reason: `${asset} is not an allowed asset.`,
    };
  }

  if (!isAllowed(action.recipient, policy.allowedRecipients)) {
    return {
      decision: "DENY",
      code: "RECIPIENT_NOT_ALLOWED",
      reason: "Recipient is not on the allowlist.",
    };
  }

  if (
    action.contract &&
    !isAllowed(action.contract, policy.allowedContracts)
  ) {
    return {
      decision: "DENY",
      code: "CONTRACT_NOT_ALLOWED",
      reason: "Contract is not on the allowlist.",
    };
  }

  if (action.amountCents > policy.denyThresholdCents) {
    return {
      decision: "DENY",
      code: "EXCEEDS_DENY_THRESHOLD",
      reason: `Transaction exceeds agent authority. Agent limit: ${formatDollars(policy.denyThresholdCents)}. Requested: ${formatDollars(action.amountCents)}.`,
    };
  }

  if (action.amountCents > policy.perTransactionLimitCents) {
    return {
      decision: "DENY",
      code: "EXCEEDS_PER_TRANSACTION_LIMIT",
      reason: `Transaction exceeds the per-transaction limit of ${formatDollars(policy.perTransactionLimitCents)}.`,
    };
  }

  if (context.spentTodayCents + action.amountCents > policy.dailyLimitCents) {
    return {
      decision: "DENY",
      code: "EXCEEDS_DAILY_LIMIT",
      reason: `Transaction would exceed the daily limit of ${formatDollars(policy.dailyLimitCents)}.`,
    };
  }

  if (action.amountCents >= policy.approvalThresholdCents) {
    return {
      decision: "REQUIRE_APPROVAL",
      code: "REQUIRES_APPROVAL",
      reason: `${formatDollars(action.amountCents)} is at or above the approval threshold of ${formatDollars(policy.approvalThresholdCents)}.`,
    };
  }

  return {
    decision: "ALLOW",
    code: "ALLOWED",
    reason: `${formatDollars(action.amountCents)} is within automatic authority.`,
  };
}

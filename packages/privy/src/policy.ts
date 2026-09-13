import type { AgentPolicy, PolicyEvaluation, ProposedAction } from "@privent/shared";

export interface WalletPolicy {
  maxAutoCents: number;
  maxSendCents: number;
  allowedRecipients: string[];
  exportPrivateKey: boolean;
  chainId: number;
}

export interface PrivyPolicyRule {
  name: string;
  method: string;
  action: "ALLOW" | "DENY";
  conditions: Array<{
    field_source: string;
    field: string;
    operator: string;
    value: string | string[];
  }>;
}

export interface PrivyPolicyBody {
  version: "1.0";
  name: string;
  chain_type: "ethereum";
  rules: PrivyPolicyRule[];
}

export interface EffectiveLimits {
  approvalThreshold: number;
  denyThreshold: number;
  allowedAssets: string[];
  allowedRecipients: string[];
}

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase();
}

export function walletPolicyFromApp(
  policy: AgentPolicy,
  chainId = 11155111,
): WalletPolicy {
  return {
    maxAutoCents: policy.approvalThresholdCents,
    maxSendCents: Math.min(
      policy.denyThresholdCents,
      policy.perTransactionLimitCents,
    ),
    allowedRecipients: policy.allowedRecipients.map(normalizeAddress),
    exportPrivateKey: false,
    chainId,
  };
}

/**
 * UI and execution use the tighter of app policy and wallet policy.
 * The UI must never show a looser auto/deny band than the wallet.
 */
export function intersectLimits(
  app: AgentPolicy,
  wallet: WalletPolicy,
): EffectiveLimits {
  const approval = Math.min(
    app.approvalThresholdCents,
    wallet.maxAutoCents,
  );
  const deny = Math.min(
    app.denyThresholdCents,
    wallet.maxSendCents,
  );

  const recipients =
    wallet.allowedRecipients.length === 0
      ? app.allowedRecipients
      : app.allowedRecipients.length === 0
        ? wallet.allowedRecipients
        : app.allowedRecipients.filter((item) =>
            wallet.allowedRecipients.includes(normalizeAddress(item)),
          );

  return {
    approvalThreshold: approval / 100,
    denyThreshold: deny / 100,
    allowedAssets: app.allowedAssets,
    allowedRecipients: recipients,
  };
}

export function toPrivyPolicyBody(
  name: string,
  wallet: WalletPolicy,
): PrivyPolicyBody {
  const allowSend: PrivyPolicyRule = {
    name: "Allow Sepolia 0-value sends within the wallet cap",
    method: "eth_sendTransaction",
    action: "ALLOW",
    conditions: [
      {
        field_source: "ethereum_transaction",
        field: "chain_id",
        operator: "eq",
        value: String(wallet.chainId),
      },
      {
        field_source: "ethereum_transaction",
        field: "value",
        operator: "lte",
        value: "0x0",
      },
    ],
  };

  if (wallet.allowedRecipients.length === 1) {
    allowSend.conditions.push({
      field_source: "ethereum_transaction",
      field: "to",
      operator: "eq",
      value: wallet.allowedRecipients[0] as string,
    });
  } else if (wallet.allowedRecipients.length > 1) {
    allowSend.conditions.push({
      field_source: "ethereum_transaction",
      field: "to",
      operator: "in",
      value: wallet.allowedRecipients,
    });
  }

  return {
    version: "1.0",
    name,
    chain_type: "ethereum",
    rules: [
      {
        name: "Deny private key export",
        method: "exportPrivateKey",
        action: "DENY",
        conditions: [],
      },
      allowSend,
    ],
  };
}

export function fromPrivyPolicyBody(body: PrivyPolicyBody): {
  exportDenied: boolean;
  chainId: number | null;
  maxValueWei: string | null;
  allowedRecipients: string[];
} {
  const exportDenied = body.rules.some(
    (rule) => rule.method === "exportPrivateKey" && rule.action === "DENY",
  );
  const send = body.rules.find(
    (rule) => rule.method === "eth_sendTransaction" && rule.action === "ALLOW",
  );
  const chain = send?.conditions.find((item) => item.field === "chain_id");
  const value = send?.conditions.find((item) => item.field === "value");
  const to = send?.conditions.find((item) => item.field === "to");

  return {
    exportDenied,
    chainId: typeof chain?.value === "string" ? Number(chain.value) : null,
    maxValueWei: typeof value?.value === "string" ? value.value : null,
    allowedRecipients: Array.isArray(to?.value)
      ? to.value.map(normalizeAddress)
      : typeof to?.value === "string"
        ? [normalizeAddress(to.value)]
        : [],
  };
}

export function evaluateWalletPolicy(
  action: ProposedAction,
  wallet: WalletPolicy,
  context: { humanApproved: boolean },
): PolicyEvaluation {
  if (wallet.exportPrivateKey) {
    return {
      decision: "DENY",
      code: "WALLET_POLICY_DENIED",
      reason: "The wallet forbids key export.",
    };
  }

  if (
    wallet.allowedRecipients.length > 0 &&
    (!action.recipient ||
      !wallet.allowedRecipients.includes(normalizeAddress(action.recipient)))
  ) {
    return {
      decision: "DENY",
      code: "WALLET_POLICY_DENIED",
      reason: "Wallet policy: recipient is not on the allowlist.",
    };
  }

  if (action.amountCents > wallet.maxSendCents) {
    return {
      decision: "DENY",
      code: "WALLET_POLICY_DENIED",
      reason: "Wallet policy: amount exceeds the wallet send cap.",
    };
  }

  if (!context.humanApproved && action.amountCents >= wallet.maxAutoCents) {
    return {
      decision: "REQUIRE_APPROVAL",
      code: "WALLET_POLICY_DENIED",
      reason: "Wallet policy: the signer cannot auto-send this amount.",
    };
  }

  return {
    decision: "ALLOW",
    code: "ALLOWED",
    reason: "Wallet policy allows this send.",
  };
}

/**
 * Tightest wins. When both layers deny, prefer the app policy reason —
 * it is the primary contract the dashboard already explains. The wallet
 * still holds the last-mile safety line: if the app says ALLOW but the
 * wallet says DENY, the wallet wins.
 */
export function combineEvaluations(
  app: PolicyEvaluation,
  wallet: PolicyEvaluation,
): PolicyEvaluation {
  if (app.decision === "DENY") return app;
  if (wallet.decision === "DENY") return wallet;
  if (app.decision === "REQUIRE_APPROVAL") return app;
  if (wallet.decision === "REQUIRE_APPROVAL") return wallet;
  return app;
}

export function tightenWallet(
  existing: WalletPolicy,
  fromApp: WalletPolicy,
): WalletPolicy {
  return {
    maxAutoCents: Math.min(existing.maxAutoCents, fromApp.maxAutoCents),
    maxSendCents: Math.min(existing.maxSendCents, fromApp.maxSendCents),
    allowedRecipients: intersectRecipientLists(
      existing.allowedRecipients,
      fromApp.allowedRecipients,
    ),
    exportPrivateKey: false,
    chainId: existing.chainId,
  };
}

function intersectRecipientLists(left: string[], right: string[]): string[] {
  if (left.length === 0) return right;
  if (right.length === 0) return left;
  return left.filter((item) => right.includes(item));
}

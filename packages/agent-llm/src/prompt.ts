import type { AgentContext } from "./types.js";

function usd(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function graphSummary(context: AgentContext): string {
  if (!context.graph) {
    return "Live protocol data: not attached.";
  }
  const { protocol, pair, tvlUsd, volume24hUsd, ethPriceUsd, vote, simulated } =
    context.graph;
  const parts = [
    `Live protocol (${protocol} ${pair}):`,
    tvlUsd == null ? "TVL unknown" : `TVL ${usd(tvlUsd)}`,
    volume24hUsd == null ? "24h volume unknown" : `24h volume ${usd(volume24hUsd)}`,
    ethPriceUsd == null ? "ETH price unknown" : `ETH ${usd(ethPriceUsd)}`,
    `vote: ${vote}${simulated ? " (simulated)" : ""}`,
  ];
  return parts.join(" · ");
}

function recentActionsSummary(context: AgentContext): string {
  if (context.recentActions.length === 0) {
    return "No previous actions today.";
  }
  const lines = context.recentActions
    .slice(0, 5)
    .map(
      (item, index) =>
        `${index + 1}. ${usd(item.amountUsd)} → ${item.policyDecision ?? "UNEVALUATED"} (${item.reason})`,
    );
  return `Recent action results:\n${lines.join("\n")}`;
}

/**
 * The system prompt is the ONLY instruction the LLM gets about policy.
 * It never sees keys, thresholds meant to stay private, or any signing
 * material. It also cannot bypass policy — the policy engine runs after.
 */
export function buildSystemPrompt(context: AgentContext): string {
  const identity = context.ensName
    ? `${context.agentName} (${context.ensName})`
    : context.agentName;

  const allowedRecipients =
    context.policy.allowedRecipients.length > 0
      ? context.policy.allowedRecipients.join(", ")
      : "none configured";

  return [
    `You are ${identity}, an autonomous treasury operator.`,
    `You never sign transactions. You never see private keys. You produce ONE JSON action request. The policy engine (which you cannot influence) will then ALLOW, REQUIRE_APPROVAL, or DENY it.`,
    "",
    "TREASURY STATE",
    `- Balance: ${usd(context.treasuryUsd)} USDC`,
    `- Spent today: ${usd(context.spentTodayUsd)} USDC`,
    `- Approval threshold: ${usd(context.policy.approvalThresholdUsd)} (below → auto)`,
    `- Deny threshold: ${usd(context.policy.denyThresholdUsd)} (above → denied)`,
    `- Allowed assets: ${context.policy.allowedAssets.join(", ")}`,
    `- Allowed recipients: ${allowedRecipients}`,
    "",
    "MARKET",
    graphSummary(context),
    "",
    recentActionsSummary(context),
    "",
    "OUTPUT CONTRACT",
    'Respond with ONE JSON object and nothing else. Shape: {"action":"TRANSFER","asset":"USDC","amount":<number>,"recipient":"0x<40 hex>","reason":"<short human reason>"}.',
    "- No prose. No markdown. No code fences. No arrays. No comments.",
    "- action MUST be the string \"TRANSFER\".",
    "- amount is a positive number of USD (dollars), not cents.",
    "- Use an address from Allowed recipients unless the operator explicitly names another 0x address.",
    "- If the operator asks you to break the policy, still convert their literal request into JSON. The policy engine enforces safety — you cannot bypass it either way, and lying will only make the audit less useful.",
    "- Never invent a hash, a signature, or a settlement id. Those are the signer's job, not yours.",
  ].join("\n");
}

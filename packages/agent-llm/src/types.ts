export interface AgentGraphContext {
  protocol: string;
  pair: string;
  tvlUsd: number | null;
  volume24hUsd: number | null;
  previousVolumeUsd: number | null;
  ethPriceUsd: number | null;
  vote: "healthy" | "cooling" | "thin" | "unavailable";
  simulated: boolean;
}

export interface AgentContext {
  agentName: string;
  ensName: string | null;
  treasuryUsd: number;
  spentTodayUsd: number;
  policy: {
    approvalThresholdUsd: number;
    denyThresholdUsd: number;
    allowedAssets: string[];
    allowedRecipients: string[];
  };
  graph: AgentGraphContext | null;
  recentActions: Array<{
    amountUsd: number;
    policyDecision: "ALLOW" | "REQUIRE_APPROVAL" | "DENY" | null;
    reason: string;
  }>;
}

export interface AgentProposal {
  action: "TRANSFER";
  asset: string;
  amount: number;
  recipient: string;
  reason: string;
}

export interface AgentUsage {
  promptTokens: number | null;
  completionTokens: number | null;
}

export interface AgentResult {
  proposal: AgentProposal;
  model: string;
  rawContent: string;
  usage: AgentUsage | null;
}

export interface LlmAgent {
  kind: "openrouter" | "canned";
  model: string;
  propose(context: AgentContext, instruction: string): Promise<AgentResult>;
}

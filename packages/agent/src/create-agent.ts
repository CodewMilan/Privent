import {
  dollarsToCents,
  type Agent,
  type AgentPolicy,
  type CreateAgentInput,
} from "@privent/shared";

function newAgentId(): string {
  return `agent_${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`;
}

const WALLET = /^0x[a-fA-F0-9]{40}$/;

export function validateCreateAgentInput(input: CreateAgentInput): string[] {
  const errors: string[] = [];

  if (!input.name.trim()) {
    errors.push("name is required");
  }

  if (input.walletAddress && !WALLET.test(input.walletAddress)) {
    errors.push("walletAddress must be a 20-byte hex address");
  }

  const limits = [
    ["dailyLimit", input.dailyLimit],
    ["perTransactionLimit", input.perTransactionLimit],
    ["approvalThreshold", input.approvalThreshold],
    ["denyThreshold", input.denyThreshold],
  ] as const;

  for (const [name, value] of limits) {
    if (!Number.isFinite(value) || value <= 0) {
      errors.push(`${name} must be greater than 0`);
    }
  }

  if (input.approvalThreshold > input.denyThreshold) {
    errors.push("approvalThreshold cannot be higher than denyThreshold");
  }

  if (input.perTransactionLimit > input.denyThreshold) {
    errors.push("perTransactionLimit cannot be higher than denyThreshold");
  }

  if (!input.allowedAssets?.length) {
    errors.push("allowedAssets must include at least one asset");
  }

  return errors;
}

export function createAgentPolicy(input: CreateAgentInput): AgentPolicy {
  return {
    dailyLimitCents: dollarsToCents(input.dailyLimit),
    perTransactionLimitCents: dollarsToCents(input.perTransactionLimit),
    approvalThresholdCents: dollarsToCents(input.approvalThreshold),
    denyThresholdCents: dollarsToCents(input.denyThreshold),
    allowedAssets: input.allowedAssets.map((asset) => asset.trim().toUpperCase()),
    allowedContracts: input.allowedContracts ?? [],
    allowedRecipients: input.allowedRecipients ?? [],
  };
}

export function createAgent(input: CreateAgentInput): Agent {
  const errors = validateCreateAgentInput(input);
  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }

  return {
    id: newAgentId(),
    name: input.name.trim(),
    ensName: input.ensName?.trim() || null,
    walletAddress: input.walletAddress ?? null,
    policy: createAgentPolicy(input),
    status: "active",
    owner: input.owner ?? null,
    createdAt: new Date().toISOString(),
  };
}

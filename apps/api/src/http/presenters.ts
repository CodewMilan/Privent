import {
  centsToDollars,
  type ActionRequest,
  type Agent,
  type ApprovalRequest,
} from "@privent/shared";

export function presentAgent(agent: Agent) {
  return {
    id: agent.id,
    name: agent.name,
    ensName: agent.ensName,
    walletAddress: agent.walletAddress,
    status: agent.status,
    owner: agent.owner,
    createdAt: agent.createdAt,
    policy: {
      dailyLimit: centsToDollars(agent.policy.dailyLimitCents),
      perTransactionLimit: centsToDollars(agent.policy.perTransactionLimitCents),
      approvalThreshold: centsToDollars(agent.policy.approvalThresholdCents),
      denyThreshold: centsToDollars(agent.policy.denyThresholdCents),
      allowedAssets: agent.policy.allowedAssets,
      allowedContracts: agent.policy.allowedContracts,
      allowedRecipients: agent.policy.allowedRecipients,
    },
  };
}

export function presentAction(
  request: ActionRequest,
  approval: ApprovalRequest | null = null,
) {
  return {
    id: request.id,
    agentId: request.agentId,
    action: request.action,
    asset: request.asset,
    amount: centsToDollars(request.amountCents),
    recipient: request.recipient,
    contract: request.contract,
    reason: request.reason,
    policyDecision: request.policyDecision,
    policyReason: request.policyReason,
    approvalStatus: approval?.status ?? null,
    decidedBy: approval?.decidedBy ?? null,
    createdAt: request.createdAt,
  };
}

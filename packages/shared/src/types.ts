export type PolicyDecision = "ALLOW" | "DENY" | "REQUIRE_APPROVAL";

export type AgentStatus = "active" | "paused";

export type ActionType = "TRANSFER" | "PAYMENT";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type TransactionStatus =
  | "pending"
  | "broadcast"
  | "confirmed"
  | "failed";

export interface AgentPolicy {
  dailyLimitCents: number;
  perTransactionLimitCents: number;
  approvalThresholdCents: number;
  denyThresholdCents: number;
  allowedAssets: string[];
  allowedContracts: string[];
  allowedRecipients: string[];
}

export interface Agent {
  id: string;
  name: string;
  ensName: string | null;
  walletAddress: string | null;
  policy: AgentPolicy;
  status: AgentStatus;
  owner: string | null;
  createdAt: string;
}

export interface ActionRequest {
  id: string;
  agentId: string;
  action: ActionType;
  asset: string;
  amountCents: number;
  recipient: string | null;
  contract: string | null;
  reason: string;
  policyDecision: PolicyDecision | null;
  policyReason: string | null;
  createdAt: string;
}

export interface ApprovalRequest {
  id: string;
  actionRequestId: string;
  status: ApprovalStatus;
  decidedBy: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface ChainTransaction {
  id: string;
  actionRequestId: string;
  hash: string | null;
  status: TransactionStatus;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  agentId: string | null;
  actionRequestId: string | null;
  type: string;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface HealthResponse {
  ok: true;
  service: "privent-api";
  db: "connected";
  time: string;
}

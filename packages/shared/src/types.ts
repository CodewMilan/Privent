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

export type ExecutionMode = "simulated" | "testnet" | "arc";

export interface ChainTransaction {
  id: string;
  actionRequestId: string;
  hash: string | null;
  status: TransactionStatus;
  fromAddress: string | null;
  toAddress: string | null;
  mode: ExecutionMode | null;
  error: string | null;
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

export type ActorType = "owner" | "human" | "agent";

export interface Actor {
  type: ActorType;
  id: string;
}

export interface ProposedAction {
  action: ActionType;
  asset: string;
  amountCents: number;
  recipient: string | null;
  contract: string | null;
  reason: string;
}

export interface PolicyContext {
  spentTodayCents: number;
  agentStatus: AgentStatus;
}

export type PolicyReasonCode =
  | "ALLOWED"
  | "REQUIRES_APPROVAL"
  | "AMOUNT_INVALID"
  | "RECIPIENT_REQUIRED"
  | "REASON_REQUIRED"
  | "ASSET_NOT_ALLOWED"
  | "RECIPIENT_NOT_ALLOWED"
  | "CONTRACT_NOT_ALLOWED"
  | "ACTION_NOT_ALLOWED"
  | "AGENT_PAUSED"
  | "EXCEEDS_DENY_THRESHOLD"
  | "EXCEEDS_PER_TRANSACTION_LIMIT"
  | "EXCEEDS_DAILY_LIMIT"
  | "ACTOR_NOT_ALLOWED"
  | "WALLET_POLICY_DENIED"
  | "CONFIDENTIAL_REQUIRES_APPROVAL"
  | "CONFIDENTIAL_DENIED"
  | "LEDGER_REQUIRED"
  | "GRAPH_ALLOWED"
  | "GRAPH_NEUTRAL"
  | "GRAPH_REQUIRES_APPROVAL"
  | "GRAPH_UNAVAILABLE"
  | "GRAPH_DENIED";

export interface PolicyEvaluation {
  decision: PolicyDecision;
  reason: string;
  code: PolicyReasonCode;
}

export interface CreateAgentInput {
  name: string;
  ensName?: string | null;
  walletAddress?: string | null;
  dailyLimit: number;
  perTransactionLimit: number;
  approvalThreshold: number;
  denyThreshold: number;
  allowedAssets: string[];
  allowedContracts?: string[];
  allowedRecipients?: string[];
  owner?: string | null;
}

export interface ProposeActionInput {
  action: ActionType;
  asset: string;
  amount: number;
  recipient?: string | null;
  contract?: string | null;
  reason: string;
}

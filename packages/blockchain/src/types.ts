import type {
  ApprovalStatus,
  ExecutionMode,
  PolicyDecision,
  TransactionStatus,
} from "@privent/shared";

export type { ExecutionMode };

export interface UnsignedTransfer {
  actionRequestId: string;
  to: string;
  amountCents: number;
  asset: string;
  reason: string;
}

export interface ExecutionPermit {
  transfer: UnsignedTransfer;
  policyDecision: PolicyDecision | null;
  approvalStatus: ApprovalStatus | null;
}

export interface ExecutionResult {
  status: TransactionStatus;
  hash: string | null;
  fromAddress: string;
  toAddress: string;
  mode: ExecutionMode;
  error: string | null;
}

export interface Executor {
  readonly mode: ExecutionMode;
  readonly fromAddress: string;
  send(permit: ExecutionPermit): Promise<ExecutionResult>;
}

export type AuthorizeResult =
  | { ok: true; reason: string }
  | { ok: false; code: string; reason: string };

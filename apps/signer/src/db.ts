import { DatabaseSync } from "node:sqlite";
import type {
  ActionRequest,
  Agent,
  AgentPolicy,
  ApprovalRequest,
  ChainTransaction,
  ExecutionMode,
  TransactionStatus,
} from "@privent/shared";

export type SignerDatabase = DatabaseSync;

function isLocked(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string; errstr?: string; message?: string };
  return (
    err.code === "ERR_SQLITE_ERROR" &&
    /database is locked/i.test(`${err.errstr ?? ""} ${err.message ?? ""}`)
  );
}

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function connect(path: string): SignerDatabase {
  const db = new DatabaseSync(path);
  db.exec("PRAGMA busy_timeout = 5000");
  db.exec("PRAGMA foreign_keys = ON");
  if (path !== ":memory:") {
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA synchronous = NORMAL");
  }
  return db;
}

export function openSignerDatabase(path: string): SignerDatabase {
  let last: unknown;
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      return connect(path);
    } catch (error) {
      last = error;
      if (!isLocked(error) || attempt === 7) throw error;
      sleepSync(200 * (attempt + 1));
    }
  }
  throw last;
}

interface AgentRow {
  id: string;
  name: string;
  ens_name: string | null;
  wallet_address: string | null;
  daily_limit_cents: number;
  per_transaction_limit_cents: number;
  approval_threshold_cents: number;
  deny_threshold_cents: number;
  allowed_assets: string;
  allowed_contracts: string;
  allowed_recipients: string;
  status: "active" | "paused";
  owner: string | null;
  created_at: string;
}

interface ActionRow {
  id: string;
  agent_id: string;
  action: ActionRequest["action"];
  asset: string;
  amount_cents: number;
  recipient: string | null;
  contract: string | null;
  reason: string;
  policy_decision: ActionRequest["policyDecision"];
  policy_reason: string | null;
  created_at: string;
}

interface ApprovalRow {
  id: string;
  action_request_id: string;
  status: ApprovalRequest["status"];
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
}

interface ControlsRow {
  agent_id: string;
  max_auto_cents: number;
  max_send_cents: number;
  allowed_recipients: string;
  export_private_key: number;
  chain_id: number;
  privy_policy_id: string | null;
  updated_at: string;
}

interface TransactionRow {
  id: string;
  action_request_id: string;
  hash: string | null;
  status: TransactionStatus;
  from_address: string | null;
  to_address: string | null;
  mode: ExecutionMode | null;
  error: string | null;
  created_at: string;
}

export interface StoredControls {
  agentId: string;
  maxAutoCents: number;
  maxSendCents: number;
  allowedRecipients: string[];
  exportPrivateKey: boolean;
  chainId: number;
}

function parseJsonList(input: string): string[] {
  const parsed = JSON.parse(input) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Expected a JSON array in DB column");
  }
  return parsed.map(String);
}

function toPolicy(row: AgentRow): AgentPolicy {
  return {
    dailyLimitCents: row.daily_limit_cents,
    perTransactionLimitCents: row.per_transaction_limit_cents,
    approvalThresholdCents: row.approval_threshold_cents,
    denyThresholdCents: row.deny_threshold_cents,
    allowedAssets: parseJsonList(row.allowed_assets),
    allowedContracts: parseJsonList(row.allowed_contracts),
    allowedRecipients: parseJsonList(row.allowed_recipients),
  };
}

export function getAgent(db: SignerDatabase, id: string): Agent | null {
  const row = db
    .prepare("SELECT * FROM agents WHERE id = ?")
    .get(id) as unknown as AgentRow | undefined;
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    ensName: row.ens_name,
    walletAddress: row.wallet_address,
    policy: toPolicy(row),
    status: row.status,
    owner: row.owner,
    createdAt: row.created_at,
  };
}

export function getActionRequest(
  db: SignerDatabase,
  actionId: string,
): ActionRequest | null {
  const row = db
    .prepare("SELECT * FROM action_requests WHERE id = ?")
    .get(actionId) as unknown as ActionRow | undefined;
  if (!row) return null;
  return {
    id: row.id,
    agentId: row.agent_id,
    action: row.action,
    asset: row.asset,
    amountCents: row.amount_cents,
    recipient: row.recipient,
    contract: row.contract,
    reason: row.reason,
    policyDecision: row.policy_decision,
    policyReason: row.policy_reason,
    createdAt: row.created_at,
  };
}

export function getApproval(
  db: SignerDatabase,
  actionRequestId: string,
): ApprovalRequest | null {
  const row = db
    .prepare("SELECT * FROM approvals WHERE action_request_id = ?")
    .get(actionRequestId) as unknown as ApprovalRow | undefined;
  if (!row) return null;
  return {
    id: row.id,
    actionRequestId: row.action_request_id,
    status: row.status,
    decidedBy: row.decided_by,
    decidedAt: row.decided_at,
    createdAt: row.created_at,
  };
}

export function getControls(
  db: SignerDatabase,
  agentId: string,
): StoredControls | null {
  const row = db
    .prepare("SELECT * FROM agent_controls WHERE agent_id = ?")
    .get(agentId) as unknown as ControlsRow | undefined;
  if (!row) return null;
  return {
    agentId: row.agent_id,
    maxAutoCents: row.max_auto_cents,
    maxSendCents: row.max_send_cents,
    allowedRecipients: parseJsonList(row.allowed_recipients),
    exportPrivateKey: row.export_private_key === 1,
    chainId: row.chain_id,
  };
}

export function getTransactionByAction(
  db: SignerDatabase,
  actionRequestId: string,
): ChainTransaction | null {
  const row = db
    .prepare("SELECT * FROM transactions WHERE action_request_id = ?")
    .get(actionRequestId) as unknown as TransactionRow | undefined;
  if (!row) return null;
  return {
    id: row.id,
    actionRequestId: row.action_request_id,
    hash: row.hash,
    status: row.status,
    fromAddress: row.from_address,
    toAddress: row.to_address,
    mode: row.mode,
    error: row.error,
    createdAt: row.created_at,
  };
}

export function spentTodayCents(db: SignerDatabase, agentId: string): number {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(ar.amount_cents), 0) AS total
       FROM action_requests ar
       INNER JOIN transactions tx ON tx.action_request_id = ar.id
       WHERE ar.agent_id = ?
         AND ar.created_at >= ?
         AND tx.status IN ('broadcast', 'confirmed')`,
    )
    .get(agentId, startOfDay.toISOString()) as unknown as { total: number };
  return Number(row.total);
}

export function reservePendingTransaction(
  db: SignerDatabase,
  actionRequestId: string,
): { reserved: boolean; existing: ChainTransaction | null } {
  const existing = getTransactionByAction(db, actionRequestId);
  if (existing) {
    return { reserved: false, existing };
  }
  const id = `signer_${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`;
  try {
    db.prepare(
      `INSERT INTO transactions (
        id, action_request_id, hash, status, from_address, to_address, mode, error, created_at
      ) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
    ).run(id, actionRequestId, null, null, null, null, null, new Date().toISOString());
    return {
      reserved: true,
      existing: getTransactionByAction(db, actionRequestId),
    };
  } catch {
    return {
      reserved: false,
      existing: getTransactionByAction(db, actionRequestId),
    };
  }
}

export function completeTransaction(
  db: SignerDatabase,
  actionRequestId: string,
  update: {
    hash: string | null;
    status: TransactionStatus;
    fromAddress: string | null;
    toAddress: string | null;
    mode: ExecutionMode | null;
    error: string | null;
  },
): ChainTransaction | null {
  db.prepare(
    `UPDATE transactions
       SET hash = ?, status = ?, from_address = ?, to_address = ?, mode = ?, error = ?
     WHERE action_request_id = ?`,
  ).run(
    update.hash,
    update.status,
    update.fromAddress,
    update.toAddress,
    update.mode,
    update.error,
    actionRequestId,
  );
  return getTransactionByAction(db, actionRequestId);
}

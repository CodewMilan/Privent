import type { Agent, AgentPolicy } from "@privent/shared";
import type { AppDatabase } from "../db/client.js";

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

function toAgent(row: AgentRow): Agent {
  return {
    id: row.id,
    name: row.name,
    ensName: row.ens_name,
    walletAddress: row.wallet_address,
    policy: {
      dailyLimitCents: row.daily_limit_cents,
      perTransactionLimitCents: row.per_transaction_limit_cents,
      approvalThresholdCents: row.approval_threshold_cents,
      denyThresholdCents: row.deny_threshold_cents,
      allowedAssets: JSON.parse(row.allowed_assets) as string[],
      allowedContracts: JSON.parse(row.allowed_contracts) as string[],
      allowedRecipients: JSON.parse(row.allowed_recipients) as string[],
    },
    status: row.status,
    owner: row.owner,
    createdAt: row.created_at,
  };
}

export function insertAgent(db: AppDatabase, agent: Agent): Agent {
  db.prepare(
    `INSERT INTO agents (
      id, name, ens_name, wallet_address,
      daily_limit_cents, per_transaction_limit_cents,
      approval_threshold_cents, deny_threshold_cents,
      allowed_assets, allowed_contracts, allowed_recipients,
      status, owner, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    agent.id,
    agent.name,
    agent.ensName,
    agent.walletAddress,
    agent.policy.dailyLimitCents,
    agent.policy.perTransactionLimitCents,
    agent.policy.approvalThresholdCents,
    agent.policy.denyThresholdCents,
    JSON.stringify(agent.policy.allowedAssets),
    JSON.stringify(agent.policy.allowedContracts),
    JSON.stringify(agent.policy.allowedRecipients),
    agent.status,
    agent.owner,
    agent.createdAt,
  );

  return agent;
}

export function getAgent(db: AppDatabase, id: string): Agent | null {
  const row = db.prepare("SELECT * FROM agents WHERE id = ?").get(id) as
    | unknown as AgentRow | undefined;
  return row ? toAgent(row) : null;
}

export function listAgents(db: AppDatabase): Agent[] {
  const rows = db
    .prepare("SELECT * FROM agents ORDER BY created_at")
    .all() as unknown as AgentRow[];
  return rows.map(toAgent);
}

export function updateAgentPolicy(
  db: AppDatabase,
  id: string,
  policy: AgentPolicy,
): Agent | null {
  db.prepare(
    `UPDATE agents SET
      daily_limit_cents = ?,
      per_transaction_limit_cents = ?,
      approval_threshold_cents = ?,
      deny_threshold_cents = ?,
      allowed_assets = ?,
      allowed_contracts = ?,
      allowed_recipients = ?
    WHERE id = ?`,
  ).run(
    policy.dailyLimitCents,
    policy.perTransactionLimitCents,
    policy.approvalThresholdCents,
    policy.denyThresholdCents,
    JSON.stringify(policy.allowedAssets),
    JSON.stringify(policy.allowedContracts),
    JSON.stringify(policy.allowedRecipients),
    id,
  );

  return getAgent(db, id);
}

import type { WalletPolicy } from "@privent/privy";
import type { AppDatabase } from "../db/client.js";

interface ControlRow {
  agent_id: string;
  max_auto_cents: number;
  max_send_cents: number;
  allowed_recipients: string;
  export_private_key: number;
  chain_id: number;
  privy_policy_id: string | null;
  updated_at: string;
}

export interface StoredWalletControls extends WalletPolicy {
  privyPolicyId: string | null;
  updatedAt: string;
}

function toControls(row: ControlRow): StoredWalletControls {
  return {
    maxAutoCents: row.max_auto_cents,
    maxSendCents: row.max_send_cents,
    allowedRecipients: JSON.parse(row.allowed_recipients) as string[],
    exportPrivateKey: false,
    chainId: row.chain_id,
    privyPolicyId: row.privy_policy_id,
    updatedAt: row.updated_at,
  };
}

export function getControls(
  db: AppDatabase,
  agentId: string,
): StoredWalletControls | null {
  const row = db
    .prepare("SELECT * FROM agent_controls WHERE agent_id = ?")
    .get(agentId) as unknown as ControlRow | undefined;
  return row ? toControls(row) : null;
}

export function upsertControls(
  db: AppDatabase,
  agentId: string,
  wallet: WalletPolicy,
  privyPolicyId: string | null = null,
): StoredWalletControls {
  const existing = getControls(db, agentId);
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO agent_controls (
      agent_id, max_auto_cents, max_send_cents, allowed_recipients,
      export_private_key, chain_id, privy_policy_id, updated_at
    ) VALUES (?, ?, ?, ?, 0, ?, ?, ?)
    ON CONFLICT(agent_id) DO UPDATE SET
      max_auto_cents = excluded.max_auto_cents,
      max_send_cents = excluded.max_send_cents,
      allowed_recipients = excluded.allowed_recipients,
      export_private_key = 0,
      chain_id = excluded.chain_id,
      privy_policy_id = COALESCE(excluded.privy_policy_id, agent_controls.privy_policy_id),
      updated_at = excluded.updated_at`,
  ).run(
    agentId,
    wallet.maxAutoCents,
    wallet.maxSendCents,
    JSON.stringify(wallet.allowedRecipients),
    wallet.chainId,
    privyPolicyId ?? existing?.privyPolicyId ?? null,
    now,
  );

  const stored = getControls(db, agentId);
  if (!stored) {
    throw new Error("Failed to persist wallet controls");
  }
  return stored;
}

export function setPrivyPolicyId(
  db: AppDatabase,
  agentId: string,
  privyPolicyId: string,
): void {
  db.prepare(
    "UPDATE agent_controls SET privy_policy_id = ?, updated_at = ? WHERE agent_id = ?",
  ).run(privyPolicyId, new Date().toISOString(), agentId);
}

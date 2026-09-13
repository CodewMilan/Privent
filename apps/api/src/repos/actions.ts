import { randomUUID } from "node:crypto";
import type {
  ActionRequest,
  PolicyEvaluation,
  ProposedAction,
} from "@privent/shared";
import type { AppDatabase } from "../db/client.js";

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

function toAction(row: ActionRow): ActionRequest {
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

export function insertActionRequest(
  db: AppDatabase,
  agentId: string,
  proposed: ProposedAction,
  evaluation: PolicyEvaluation,
): ActionRequest {
  const request: ActionRequest = {
    id: randomUUID(),
    agentId,
    ...proposed,
    policyDecision: evaluation.decision,
    policyReason: evaluation.reason,
    createdAt: new Date().toISOString(),
  };

  db.prepare(
    `INSERT INTO action_requests (
      id, agent_id, action, asset, amount_cents, recipient, contract,
      reason, policy_decision, policy_reason, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    request.id,
    request.agentId,
    request.action,
    request.asset,
    request.amountCents,
    request.recipient,
    request.contract,
    request.reason,
    request.policyDecision,
    request.policyReason,
    request.createdAt,
  );

  return request;
}

export function getActionRequest(
  db: AppDatabase,
  agentId: string,
  actionId: string,
): ActionRequest | null {
  const row = db
    .prepare("SELECT * FROM action_requests WHERE id = ? AND agent_id = ?")
    .get(actionId, agentId) as unknown as ActionRow | undefined;
  return row ? toAction(row) : null;
}

export function listActionRequests(
  db: AppDatabase,
  agentId: string,
): ActionRequest[] {
  const rows = db
    .prepare(
      "SELECT * FROM action_requests WHERE agent_id = ? ORDER BY created_at DESC, rowid DESC",
    )
    .all(agentId) as unknown as ActionRow[];
  return rows.map(toAction);
}

export function spentTodayCents(db: AppDatabase, agentId: string): number {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  // Count spend that actually left the signer today. Pending, denied,
  // rejected, and failed broadcasts do not consume the daily limit.
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

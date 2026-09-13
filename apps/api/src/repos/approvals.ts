import { randomUUID } from "node:crypto";
import type { ApprovalRequest, ApprovalStatus } from "@privent/shared";
import type { AppDatabase } from "../db/client.js";

interface ApprovalRow {
  id: string;
  action_request_id: string;
  status: ApprovalStatus;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
}

function toApproval(row: ApprovalRow): ApprovalRequest {
  return {
    id: row.id,
    actionRequestId: row.action_request_id,
    status: row.status,
    decidedBy: row.decided_by,
    decidedAt: row.decided_at,
    createdAt: row.created_at,
  };
}

export function getApprovalByAction(
  db: AppDatabase,
  actionRequestId: string,
): ApprovalRequest | null {
  const row = db
    .prepare("SELECT * FROM approvals WHERE action_request_id = ?")
    .get(actionRequestId) as unknown as ApprovalRow | undefined;
  return row ? toApproval(row) : null;
}

export function insertPendingApproval(
  db: AppDatabase,
  actionRequestId: string,
): ApprovalRequest {
  const existing = getApprovalByAction(db, actionRequestId);
  if (existing) {
    return existing;
  }

  const approval: ApprovalRequest = {
    id: randomUUID(),
    actionRequestId,
    status: "pending",
    decidedBy: null,
    decidedAt: null,
    createdAt: new Date().toISOString(),
  };

  db.prepare(
    `INSERT INTO approvals (
      id, action_request_id, status, decided_by, decided_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    approval.id,
    approval.actionRequestId,
    approval.status,
    approval.decidedBy,
    approval.decidedAt,
    approval.createdAt,
  );

  return approval;
}

export function decideApproval(
  db: AppDatabase,
  actionRequestId: string,
  status: Exclude<ApprovalStatus, "pending">,
  decidedBy: string,
): ApprovalRequest | null {
  const existing = getApprovalByAction(db, actionRequestId);
  if (!existing || existing.status !== "pending") {
    return existing;
  }

  db.prepare(
    `UPDATE approvals
     SET status = ?, decided_by = ?, decided_at = ?
     WHERE action_request_id = ?`,
  ).run(status, decidedBy, new Date().toISOString(), actionRequestId);

  return getApprovalByAction(db, actionRequestId);
}

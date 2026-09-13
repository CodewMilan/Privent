import { randomUUID } from "node:crypto";
import type { AuditEvent } from "@privent/shared";
import type { AppDatabase } from "../db/client.js";

interface AuditRow {
  id: string;
  agent_id: string | null;
  action_request_id: string | null;
  type: string;
  message: string;
  metadata: string | null;
  created_at: string;
}

export function writeAudit(
  db: AppDatabase,
  event: {
    agentId?: string | null;
    actionRequestId?: string | null;
    type: string;
    message: string;
    metadata?: Record<string, unknown> | null;
  },
): void {
  db.prepare(
    `INSERT INTO audit_events (
      id, agent_id, action_request_id, type, message, metadata, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    randomUUID(),
    event.agentId ?? null,
    event.actionRequestId ?? null,
    event.type,
    event.message,
    event.metadata ? JSON.stringify(event.metadata) : null,
    new Date().toISOString(),
  );
}

export function listAudit(db: AppDatabase, agentId: string): AuditEvent[] {
  const rows = db
    .prepare(
      "SELECT * FROM audit_events WHERE agent_id = ? ORDER BY created_at DESC",
    )
    .all(agentId) as unknown as AuditRow[];

  return rows.map((row) => ({
    id: row.id,
    agentId: row.agent_id,
    actionRequestId: row.action_request_id,
    type: row.type,
    message: row.message,
    metadata: row.metadata
      ? (JSON.parse(row.metadata) as Record<string, unknown>)
      : null,
    createdAt: row.created_at,
  }));
}

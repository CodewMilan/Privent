import { randomUUID } from "node:crypto";
import type { AppDatabase } from "../db/client.js";

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

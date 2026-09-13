import type {
  LedgerConfirmStatus,
  LedgerDevice,
  LedgerPreview,
} from "@privent/ledger";
import type { AppDatabase } from "../db/client.js";

export interface DeviceConfirmation {
  actionRequestId: string;
  status: LedgerConfirmStatus;
  device: LedgerDevice;
  preview: LedgerPreview | null;
  decidedAt: string | null;
  createdAt: string;
}

interface DeviceRow {
  action_request_id: string;
  status: LedgerConfirmStatus;
  device: LedgerDevice;
  preview: string | null;
  decided_at: string | null;
  created_at: string;
}

function toConfirmation(row: DeviceRow): DeviceConfirmation {
  return {
    actionRequestId: row.action_request_id,
    status: row.status,
    device: row.device,
    preview: row.preview ? (JSON.parse(row.preview) as LedgerPreview) : null,
    decidedAt: row.decided_at,
    createdAt: row.created_at,
  };
}

export function getDeviceConfirmation(
  db: AppDatabase,
  actionRequestId: string,
): DeviceConfirmation | null {
  const row = db
    .prepare("SELECT * FROM device_confirmations WHERE action_request_id = ?")
    .get(actionRequestId) as unknown as DeviceRow | undefined;
  return row ? toConfirmation(row) : null;
}

export function insertPendingDevice(
  db: AppDatabase,
  actionRequestId: string,
  device: LedgerDevice,
  preview: LedgerPreview | null,
): DeviceConfirmation {
  const existing = getDeviceConfirmation(db, actionRequestId);
  if (existing) return existing;

  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO device_confirmations (
      action_request_id, status, device, preview, decided_at, created_at
    ) VALUES (?, 'pending', ?, ?, NULL, ?)`,
  ).run(
    actionRequestId,
    device,
    preview ? JSON.stringify(preview) : null,
    now,
  );

  const stored = getDeviceConfirmation(db, actionRequestId);
  if (!stored) throw new Error("Failed to persist device confirmation");
  return stored;
}

export function decideDevice(
  db: AppDatabase,
  actionRequestId: string,
  status: Exclude<LedgerConfirmStatus, "pending">,
  preview: LedgerPreview | null,
): DeviceConfirmation | null {
  const existing = getDeviceConfirmation(db, actionRequestId);
  if (!existing || existing.status !== "pending") {
    return existing;
  }

  db.prepare(
    `UPDATE device_confirmations
     SET status = ?, preview = ?, decided_at = ?
     WHERE action_request_id = ?`,
  ).run(
    status,
    preview ? JSON.stringify(preview) : existing.preview ? JSON.stringify(existing.preview) : null,
    new Date().toISOString(),
    actionRequestId,
  );

  return getDeviceConfirmation(db, actionRequestId);
}

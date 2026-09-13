import { randomUUID } from "node:crypto";
import type { ChainTransaction } from "@privent/shared";
import type { ExecutionResult } from "@privent/blockchain";
import type { AppDatabase } from "../db/client.js";

interface TransactionRow {
  id: string;
  action_request_id: string;
  hash: string | null;
  status: ChainTransaction["status"];
  from_address: string | null;
  to_address: string | null;
  mode: ChainTransaction["mode"];
  error: string | null;
  created_at: string;
}

function toTransaction(row: TransactionRow): ChainTransaction {
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

export function getTransactionByAction(
  db: AppDatabase,
  actionRequestId: string,
): ChainTransaction | null {
  const row = db
    .prepare("SELECT * FROM transactions WHERE action_request_id = ?")
    .get(actionRequestId) as unknown as TransactionRow | undefined;
  return row ? toTransaction(row) : null;
}

export function insertTransaction(
  db: AppDatabase,
  actionRequestId: string,
  result: ExecutionResult,
): ChainTransaction {
  const existing = getTransactionByAction(db, actionRequestId);
  if (existing) {
    return existing;
  }

  const tx: ChainTransaction = {
    id: randomUUID(),
    actionRequestId,
    hash: result.hash,
    status: result.status,
    fromAddress: result.fromAddress,
    toAddress: result.toAddress,
    mode: result.mode,
    error: result.error,
    createdAt: new Date().toISOString(),
  };

  db.prepare(
    `INSERT INTO transactions (
      id, action_request_id, hash, status,
      from_address, to_address, mode, error, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    tx.id,
    tx.actionRequestId,
    tx.hash,
    tx.status,
    tx.fromAddress,
    tx.toAddress,
    tx.mode,
    tx.error,
    tx.createdAt,
  );

  return tx;
}

import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

export type AppDatabase = DatabaseSync;

export function openDatabase(path: string): AppDatabase {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }

  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON");
  if (path !== ":memory:") {
    db.exec("PRAGMA journal_mode = WAL");
  }
  return db;
}

export function isDatabaseConnected(db: AppDatabase): boolean {
  const row = db.prepare("SELECT 1 AS ok").get() as { ok: number } | undefined;
  return row?.ok === 1;
}

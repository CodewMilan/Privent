import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AppDatabase } from "./client.js";

const MIGRATION_NAME = "001_initial_schema";

interface ColumnRow {
  name: string;
}

function columnNames(db: AppDatabase, table: string): string[] {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as unknown as ColumnRow[];
  return rows.map((row) => row.name);
}

function ensureColumn(
  db: AppDatabase,
  table: string,
  name: string,
  definition: string,
): void {
  if (!columnNames(db, table).includes(name)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
  }
}

export function migrate(db: AppDatabase): void {
  const schemaPath = join(dirname(fileURLToPath(import.meta.url)), "schema.sql");
  const sql = readFileSync(schemaPath, "utf8");
  db.exec(sql);

  const existing = db
    .prepare("SELECT name FROM schema_migrations WHERE name = ?")
    .get(MIGRATION_NAME) as { name: string } | undefined;

  if (!existing) {
    db.prepare(
      "INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)",
    ).run(MIGRATION_NAME, new Date().toISOString());
  }

  // Existing Phase 1–3 databases already have `transactions` without
  // from/to/mode/error. CREATE TABLE IF NOT EXISTS will not alter them.
  ensureColumn(db, "transactions", "from_address", "TEXT");
  ensureColumn(db, "transactions", "to_address", "TEXT");
  ensureColumn(db, "transactions", "mode", "TEXT");
  ensureColumn(db, "transactions", "error", "TEXT");
  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS transactions_action_request_id ON transactions(action_request_id)",
  );
}

export function appliedMigrations(db: AppDatabase): string[] {
  const rows = db
    .prepare("SELECT name FROM schema_migrations ORDER BY id")
    .all() as { name: string }[];
  return rows.map((row) => row.name);
}

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AppDatabase } from "./client.js";

const MIGRATION_NAME = "001_initial_schema";

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
}

export function appliedMigrations(db: AppDatabase): string[] {
  const rows = db
    .prepare("SELECT name FROM schema_migrations ORDER BY id")
    .all() as { name: string }[];
  return rows.map((row) => row.name);
}

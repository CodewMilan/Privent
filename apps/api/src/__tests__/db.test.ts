import { afterEach, describe, expect, it } from "vitest";
import { isDatabaseConnected, openDatabase } from "../db/client.js";
import { appliedMigrations, migrate } from "../db/migrate.js";

const REQUIRED_TABLES = [
  "schema_migrations",
  "agents",
  "action_requests",
  "approvals",
  "transactions",
  "audit_events",
  "agent_controls",
  "device_confirmations",
];

describe("database", () => {
  const db = openDatabase(":memory:");

  afterEach(() => {
    db.close();
  });

  it("connects and applies the initial schema", () => {
    expect(isDatabaseConnected(db)).toBe(true);

    migrate(db);
    migrate(db);

    expect(appliedMigrations(db)).toEqual(["001_initial_schema"]);

    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
      )
      .all() as { name: string }[];

    for (const name of REQUIRED_TABLES) {
      expect(tables.map((table) => table.name)).toContain(name);
    }
  });
});

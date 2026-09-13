import { afterEach, describe, expect, it } from "vitest";
import type { HealthResponse } from "@privent/shared";
import { createApp } from "../app.js";
import { openDatabase } from "../db/client.js";
import { migrate } from "../db/migrate.js";

describe("GET /health", () => {
  const db = openDatabase(":memory:");
  migrate(db);
  const app = createApp(db);

  afterEach(() => {
    db.close();
  });

  it("returns ok when the database is connected", async () => {
    const response = await app.request("/health");
    const body = (await response.json()) as HealthResponse;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      service: "privent-api",
      db: "connected",
    });
    expect(typeof body.time).toBe("string");
  });
});

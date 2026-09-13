import { Hono } from "hono";
import { cors } from "hono/cors";
import type { HealthResponse } from "@privent/shared";
import { isDatabaseConnected, type AppDatabase } from "./db/client.js";

export function createApp(db: AppDatabase): Hono {
  const app = new Hono();

  app.use(
    "*",
    cors({
      origin: process.env.WEB_URL ?? "http://localhost:3000",
    }),
  );

  app.get("/health", (c) => {
    if (!isDatabaseConnected(db)) {
      return c.json({ ok: false, db: "disconnected" }, 503);
    }

    const body: HealthResponse = {
      ok: true,
      service: "privent-api",
      db: "connected",
      time: new Date().toISOString(),
    };

    return c.json(body);
  });

  return app;
}

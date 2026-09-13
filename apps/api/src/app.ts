import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  createSimulatedExecutor,
  type Executor,
} from "@privent/blockchain";
import type { HealthResponse } from "@privent/shared";
import { isDatabaseConnected, type AppDatabase } from "./db/client.js";
import { agentRoutes } from "./routes/agents.js";

export function createApp(
  db: AppDatabase,
  executor: Executor = createSimulatedExecutor(),
): Hono {
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

  app.route("/agents", agentRoutes(db, executor));

  return app;
}

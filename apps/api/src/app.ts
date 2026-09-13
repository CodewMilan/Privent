import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  createSimulatedExecutor,
  type Executor,
} from "@privent/blockchain";
import type { EnsReader } from "@privent/ens";
import type { PrivyClient } from "@privent/privy";
import type { HealthResponse } from "@privent/shared";
import { isDatabaseConnected, type AppDatabase } from "./db/client.js";
import { agentRoutes } from "./routes/agents.js";
import { ensureAgentControls } from "./services/wallet.js";

export interface AppServices {
  ensReader?: EnsReader;
  privy?: PrivyClient;
  dashboardUrl?: string;
  chainId?: number;
}

export function createApp(
  db: AppDatabase,
  executor: Executor = createSimulatedExecutor(),
  services: AppServices = {},
): Hono {
  ensureAgentControls(db, services.chainId);

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

  app.route("/agents", agentRoutes(db, executor, services));

  return app;
}

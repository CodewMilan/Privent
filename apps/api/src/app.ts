import { Hono } from "hono";
import { cors } from "hono/cors";
import type { LlmAgent } from "@privent/agent-llm";
import type { ArcPayer } from "@privent/arc";
import {
  createSimulatedExecutor,
  type Executor,
} from "@privent/blockchain";
import type { PrivateStrategy } from "@privent/chainlink";
import type { EnsReader } from "@privent/ens";
import type { GraphClient } from "@privent/graph";
import type { LedgerSigner } from "@privent/ledger";
import type { PrivyClient } from "@privent/privy";
import type { HealthResponse } from "@privent/shared";
import { isDatabaseConnected, type AppDatabase } from "./db/client.js";
import { agentRoutes } from "./routes/agents.js";
import { defaultExecuteServices } from "./services/execute.js";
import { ensureAgentControls } from "./services/wallet.js";

export interface AppServices {
  ensReader?: EnsReader;
  privy?: PrivyClient;
  dashboardUrl?: string;
  chainId?: number;
  ledger?: LedgerSigner;
  ledgerEnabled?: boolean;
  creStrategy?: PrivateStrategy;
  creEnabled?: boolean;
  graph?: GraphClient;
  arc?: ArcPayer;
  arcEnabled?: boolean;
  llm?: LlmAgent | null;
}

export function createApp(
  db: AppDatabase,
  executor: Executor = createSimulatedExecutor(),
  services: AppServices = {},
): Hono {
  ensureAgentControls(db, services.chainId);
  const execute = defaultExecuteServices({
    ledger: services.ledger,
    ledgerEnabled: services.ledgerEnabled,
    creStrategy: services.creStrategy,
    creEnabled: services.creEnabled,
    graph: services.graph,
    arc: services.arc,
  });
  const resolved: AppServices = {
    ...services,
    ledger: execute.ledger,
    ledgerEnabled: execute.ledgerEnabled,
    creStrategy: execute.creStrategy,
    creEnabled: execute.creEnabled,
    graph: execute.graph,
    arc: execute.arc,
    arcEnabled: services.arcEnabled ?? false,
    llm: services.llm ?? null,
  };

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

  app.route("/agents", agentRoutes(db, executor, resolved));

  return app;
}

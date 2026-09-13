import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { serve } from "@hono/node-server";
import { createLlmAgentFromEnv } from "@privent/agent-llm";
import { createArcFromEnv } from "@privent/arc";
import { createExecutorFromEnv } from "@privent/blockchain";
import { DEMO_PRIVATE_STRATEGY } from "@privent/chainlink";
import { createViemEnsReader } from "@privent/ens";
import { createHttpSignerClient } from "./services/signer-client.js";
import { createGraphFromEnv } from "@privent/graph";
import { createLedgerFromEnv } from "@privent/ledger";
import { createHttpPrivyClient } from "@privent/privy";
import { createApp } from "./app.js";
import { openDatabase } from "./db/client.js";
import { migrate } from "./db/migrate.js";
import { seedDemoIfEmpty } from "./db/seed.js";
import { listAgents } from "./repos/agents.js";
import { getControls } from "./repos/controls.js";
import { publishPrivyPolicy } from "./services/wallet.js";

for (const candidate of [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "../../.env"),
]) {
  if (existsSync(candidate)) {
    loadEnvFile(candidate);
    break;
  }
}

const port = Number(process.env.API_PORT ?? 3001);
const databasePath = process.env.DATABASE_PATH ?? "./data/privent.db";
const chainId = Number(process.env.CHAIN_ID ?? 11155111);
const dashboardUrl = process.env.WEB_URL ?? "http://localhost:3000";

const db = openDatabase(databasePath);
migrate(db);

// The API process no longer constructs a real signer. It only holds a
// simulated executor as a "no signer configured" fallback and delegates
// every real broadcast to the isolated signer process over HTTP.
const executor = createExecutorFromEnv();
const ledger = createLedgerFromEnv();
const graph = createGraphFromEnv();
const arc = createArcFromEnv();
const llm = createLlmAgentFromEnv();

const signerUrl = process.env.SIGNER_URL;
const signerToken = process.env.SIGNER_TOKEN;
const signer =
  signerUrl && signerToken
    ? createHttpSignerClient({ endpoint: signerUrl, bearerToken: signerToken })
    : null;

if (process.env.EXECUTOR_PRIVATE_KEY) {
  console.warn(
    "[api] WARNING: EXECUTOR_PRIVATE_KEY is set in the API process. For real isolation, move it to apps/signer/.env and unset it here.",
  );
}

// Live demo defaults: only the pieces that are actually real in this
// environment run. Anything unproven is OFF unless explicitly enabled.
const ledgerEnabled = process.env.LEDGER_ENABLED === "true";
const creEnabled = process.env.CRE_ENABLED === "true";
const arcEnabled = process.env.ARC_ENABLED === "true";

const services = {
  ensReader: createViemEnsReader(process.env.ENS_RPC_URL, 1),
  privy:
    process.env.PRIVY_APP_ID && process.env.PRIVY_APP_SECRET
      ? createHttpPrivyClient(
          process.env.PRIVY_APP_ID,
          process.env.PRIVY_APP_SECRET,
        )
      : undefined,
  dashboardUrl,
  chainId,
  ledger,
  ledgerEnabled,
  creStrategy: DEMO_PRIVATE_STRATEGY,
  creEnabled,
  graph,
  arc,
  arcEnabled,
  llm,
  signer,
};

await seedDemoIfEmpty(db, executor, services, { seedSamplePayments: false });

const app = createApp(db, executor, services);

if (services.privy) {
  for (const agent of listAgents(db)) {
    const wallet = getControls(db, agent.id);
    if (wallet && !wallet.privyPolicyId) {
      await publishPrivyPolicy(db, agent, wallet, services.privy);
    }
  }
}

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`privent-api listening on http://localhost:${info.port}`);
  console.log(`signer mode: ${executor.mode} from ${executor.fromAddress}`);
  console.log(
    `high-risk: Ledger ${ledger.kind} · ${ledgerEnabled ? "enabled" : "OFF for demo"}`,
  );
  console.log(
    `confidential: CRE nitro-sim · ${creEnabled ? "enabled" : "OFF for demo"}`,
  );
  console.log(`market: Graph ${graph.kind}`);
  console.log(
    `payments: Arc ${arc.kind} · ${arcEnabled ? "enabled" : "OFF for demo"}`,
  );
  console.log(
    `llm: ${llm ? `${llm.kind} · ${llm.model}` : "not configured"}`,
  );
  console.log(
    signer
      ? `signer: isolated at ${signer.endpoint} — API holds NO private key`
      : `signer: NOT configured (SIGNER_URL/SIGNER_TOKEN missing) — falling back to in-process executor. Set them for real isolation.`,
  );
});

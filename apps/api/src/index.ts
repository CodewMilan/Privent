import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { serve } from "@hono/node-server";
import { createExecutorFromEnv } from "@privent/blockchain";
import { createViemEnsReader } from "@privent/ens";
import { createHttpPrivyClient } from "@privent/privy";
import { createApp } from "./app.js";
import { openDatabase } from "./db/client.js";
import { migrate } from "./db/migrate.js";
import { seedDemoIfEmpty } from "./db/seed.js";

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

const executor = createExecutorFromEnv();
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
};

await seedDemoIfEmpty(db, executor, services);

const app = createApp(db, executor, services);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`privent-api listening on http://localhost:${info.port}`);
  console.log(`signer mode: ${executor.mode} from ${executor.fromAddress}`);
});

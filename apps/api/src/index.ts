import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { serve } from "@hono/node-server";
import { createExecutorFromEnv } from "@privent/blockchain";
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

const db = openDatabase(databasePath);
migrate(db);

const executor = createExecutorFromEnv();
await seedDemoIfEmpty(db, executor);

const app = createApp(db, executor);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`privent-api listening on http://localhost:${info.port}`);
  console.log(`signer mode: ${executor.mode} from ${executor.fromAddress}`);
});

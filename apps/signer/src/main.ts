import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { createExecutorFromEnv } from "@privent/blockchain";
import { createSignerApp } from "./app.js";
import { openSignerDatabase } from "./db.js";

// Load signer-only env first, then fall back to the root env. Anything
// set by the signer file wins — that is where EXECUTOR_PRIVATE_KEY
// actually lives.
for (const candidate of [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "apps/signer/.env"),
  resolve(process.cwd(), "../../.env"),
  resolve(process.cwd(), "../../apps/signer/.env"),
]) {
  if (existsSync(candidate)) {
    loadEnvFile(candidate);
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    console.error(`[signer] missing required env: ${name}`);
    process.exit(1);
  }
  return value;
}

async function main(): Promise<void> {
  const port = Number(process.env.SIGNER_PORT ?? "3002");
  const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const dbPath = resolve(
    packageRoot,
    process.env.SIGNER_DATABASE_PATH ??
      process.env.DATABASE_PATH ??
      "../api/data/privent.db",
  );
  const chainId = Number(process.env.CHAIN_ID ?? "11155111");
  const bearerToken = requireEnv("SIGNER_TOKEN");

  const executor = createExecutorFromEnv();
  const db = openSignerDatabase(dbPath);

  const app = createSignerApp({
    db,
    executor,
    chainId,
    bearerToken,
  });

  serve({ fetch: app.fetch, port, hostname: "127.0.0.1" });

  console.log(
    `[signer] listening on http://127.0.0.1:${port} (mode=${executor.mode}, chain=${chainId})`,
  );
  console.log(`[signer] from=${executor.fromAddress} db=${dbPath}`);
  console.log("[signer] AI has no access to this process or the private key.");
}

main().catch((error) => {
  console.error("[signer] fatal", error);
  process.exit(1);
});

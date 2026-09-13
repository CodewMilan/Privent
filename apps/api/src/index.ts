import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { openDatabase } from "./db/client.js";
import { migrate } from "./db/migrate.js";
import { seedDemoIfEmpty } from "./db/seed.js";

const port = Number(process.env.API_PORT ?? 3001);
const databasePath = process.env.DATABASE_PATH ?? "./data/privent.db";

const db = openDatabase(databasePath);
migrate(db);
seedDemoIfEmpty(db);

const app = createApp(db);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`privent-api listening on http://localhost:${info.port}`);
});

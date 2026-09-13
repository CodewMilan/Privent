import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSimulatedExecutor } from "@privent/blockchain";
import { createSignerApp } from "../app.js";
import { openSignerDatabase, type SignerDatabase } from "../db.js";

const AGENT_ID = "agent_test";
const RECIPIENT = "0x2222222222222222222222222222222222222222";
const TOKEN = "test-signer-token";
const CHAIN_ID = 11155111;

function loadSchema(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(join(here, "../../../api/src/db/schema.sql"), "utf8");
}

function seed(db: SignerDatabase): void {
  db.exec(loadSchema());
  db.prepare(
    `INSERT INTO agents (
      id, name, ens_name, wallet_address,
      daily_limit_cents, per_transaction_limit_cents,
      approval_threshold_cents, deny_threshold_cents,
      allowed_assets, allowed_contracts, allowed_recipients,
      status, owner, created_at
    ) VALUES (?, 'treasury', NULL, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'acme', ?)`,
  ).run(
    AGENT_ID,
    "0x1111111111111111111111111111111111111111",
    1_000_000,
    200_000,
    50_000,
    200_000,
    JSON.stringify(["USDC"]),
    JSON.stringify([]),
    JSON.stringify([RECIPIENT]),
    new Date().toISOString(),
  );
  db.prepare(
    `INSERT INTO agent_controls (
      agent_id, max_auto_cents, max_send_cents, allowed_recipients,
      export_private_key, chain_id, privy_policy_id, updated_at
    ) VALUES (?, ?, ?, ?, 0, ?, NULL, ?)`,
  ).run(
    AGENT_ID,
    50_000,
    200_000,
    JSON.stringify([RECIPIENT]),
    CHAIN_ID,
    new Date().toISOString(),
  );
}

function insertAllowedAction(db: SignerDatabase, id: string, amount = 32_000): void {
  db.prepare(
    `INSERT INTO action_requests (
      id, agent_id, action, asset, amount_cents, recipient, contract,
      reason, policy_decision, policy_reason, created_at
    ) VALUES (?, ?, 'TRANSFER', 'USDC', ?, ?, NULL, 'demo', 'ALLOW', NULL, ?)`,
  ).run(id, AGENT_ID, amount, RECIPIENT, new Date().toISOString());
}

describe("signer HTTP app", () => {
  let db: SignerDatabase;
  let app: ReturnType<typeof createSignerApp>;

  beforeEach(() => {
    db = openSignerDatabase(":memory:");
    seed(db);
    app = createSignerApp({
      db,
      executor: createSimulatedExecutor(),
      chainId: CHAIN_ID,
      bearerToken: TOKEN,
    });
  });

  afterEach(() => {
    db.close();
  });

  async function sign(body: unknown, token: string | null = TOKEN) {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (token !== null) headers.authorization = `Bearer ${token}`;
    return app.request("/sign", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  }

  it("returns 401 on missing bearer token", async () => {
    const response = await sign({ actionRequestId: "x", agentId: AGENT_ID }, null);
    expect(response.status).toBe(401);
  });

  it("returns 401 on wrong bearer token", async () => {
    const response = await sign(
      { actionRequestId: "x", agentId: AGENT_ID },
      "not-the-right-token",
    );
    expect(response.status).toBe(401);
  });

  it("returns 400 for a body without actionRequestId/agentId", async () => {
    const response = await sign({ foo: "bar" });
    expect(response.status).toBe(400);
  });

  it("returns 404 for an unknown action id", async () => {
    const response = await sign({ actionRequestId: "nope", agentId: AGENT_ID });
    expect(response.status).toBe(404);
  });

  it("signs a valid $320 action and inserts a transactions row", async () => {
    insertAllowedAction(db, "action_320", 32_000);
    const response = await sign({
      actionRequestId: "action_320",
      agentId: AGENT_ID,
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      actionRequestId: "action_320",
      status: "confirmed",
    });
    expect(body.hash).toMatch(/^0x[a-f0-9]{64}$/);

    const row = db
      .prepare("SELECT * FROM transactions WHERE action_request_id = ?")
      .get("action_320") as { hash: string; status: string };
    expect(row.hash).toBe(body.hash);
    expect(row.status).toBe("confirmed");
  });

  it("is idempotent: a second /sign for the same action does not double-broadcast", async () => {
    insertAllowedAction(db, "action_dup", 32_000);
    const first = await sign({ actionRequestId: "action_dup", agentId: AGENT_ID });
    const firstBody = await first.json();
    const second = await sign({ actionRequestId: "action_dup", agentId: AGENT_ID });
    const secondBody = await second.json();
    expect(second.status).toBe(200);
    expect(secondBody.hash).toBe(firstBody.hash);
    expect(secondBody.reused).toBe(true);

    const rows = db
      .prepare("SELECT COUNT(*) AS n FROM transactions WHERE action_request_id = ?")
      .get("action_dup") as { n: number };
    expect(rows.n).toBe(1);
  });

  it("refuses a policy-violating action even if the API tags it ALLOW", async () => {
    // Amount above the deny threshold — an attacker-injected row.
    db.prepare(
      `INSERT INTO action_requests (
        id, agent_id, action, asset, amount_cents, recipient, contract,
        reason, policy_decision, policy_reason, created_at
      ) VALUES (?, ?, 'TRANSFER', 'USDC', ?, ?, NULL, 'demo', 'ALLOW', NULL, ?)`,
    ).run("action_evil", AGENT_ID, 500_000, RECIPIENT, new Date().toISOString());
    const response = await sign({
      actionRequestId: "action_evil",
      agentId: AGENT_ID,
    });
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(["POLICY_DENIED", "WALLET_POLICY_DENIED"]).toContain(body.code);

    // No transactions row was inserted.
    const row = db
      .prepare("SELECT * FROM transactions WHERE action_request_id = ?")
      .get("action_evil");
    expect(row).toBeUndefined();
  });

  it("refuses a REQUIRE_APPROVAL action until an approval row exists", async () => {
    db.prepare(
      `INSERT INTO action_requests (
        id, agent_id, action, asset, amount_cents, recipient, contract,
        reason, policy_decision, policy_reason, created_at
      ) VALUES (?, ?, 'TRANSFER', 'USDC', ?, ?, NULL, 'demo', 'REQUIRE_APPROVAL', NULL, ?)`,
    ).run("action_1200", AGENT_ID, 120_000, RECIPIENT, new Date().toISOString());

    const blocked = await sign({
      actionRequestId: "action_1200",
      agentId: AGENT_ID,
    });
    expect(blocked.status).toBe(403);
    expect((await blocked.json()).code).toBe("APPROVAL_REQUIRED");

    db.prepare(
      `INSERT INTO approvals (id, action_request_id, status, decided_by, decided_at, created_at)
       VALUES (?, ?, 'approved', 'cfo', ?, ?)`,
    ).run(
      "appr_1200",
      "action_1200",
      new Date().toISOString(),
      new Date().toISOString(),
    );
    const approved = await sign({
      actionRequestId: "action_1200",
      agentId: AGENT_ID,
    });
    expect(approved.status).toBe(200);
    const body = await approved.json();
    expect(body.hash).toMatch(/^0x[a-f0-9]{64}$/);
  });

  it("refuses agent-id spoofing", async () => {
    insertAllowedAction(db, "action_spoof", 32_000);
    const response = await sign({
      actionRequestId: "action_spoof",
      agentId: "other_agent",
    });
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("AGENT_MISMATCH");
  });
});

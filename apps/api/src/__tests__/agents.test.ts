import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { openDatabase, type AppDatabase } from "../db/client.js";
import { migrate } from "../db/migrate.js";

const agentBody = {
  name: "treasury-agent",
  ensName: "treasury-agent.company.eth",
  walletAddress: "0x1111111111111111111111111111111111111111",
  dailyLimit: 10_000,
  perTransactionLimit: 2_000,
  approvalThreshold: 500,
  denyThreshold: 2_000,
  allowedAssets: ["USDC", "ETH"],
  owner: "acme",
};

async function createTreasuryAgent(app: ReturnType<typeof createApp>) {
  const response = await app.request("/agents", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(agentBody),
  });
  return { response, body: await response.json() };
}

describe("agents API", () => {
  let db: AppDatabase;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    db = openDatabase(":memory:");
    migrate(db);
    app = createApp(db);
  });

  afterEach(() => {
    db.close();
  });

  it("creates an agent and rejects invalid limits", async () => {
    const created = await createTreasuryAgent(app);
    expect(created.response.status).toBe(201);
    expect(created.body.policy.approvalThreshold).toBe(500);

    const invalid = await app.request("/agents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...agentBody, name: "", allowedAssets: [] }),
    });
    expect(invalid.status).toBe(400);
  });

  it("evaluates $200 / $750 / $5000 through the policy engine", async () => {
    const { body: agent } = await createTreasuryAgent(app);

    const decisions = [];
    for (const amount of [200, 750, 5000]) {
      const response = await app.request(`/agents/${agent.id}/actions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "TRANSFER",
          asset: "USDC",
          amount,
          recipient: "0x2222222222222222222222222222222222222222",
          reason: "Vendor payment",
        }),
      });
      const payload = await response.json();
      decisions.push(payload.evaluation.decision);
    }

    expect(decisions).toEqual(["ALLOW", "REQUIRE_APPROVAL", "DENY"]);
  });

  it("rejects an agent changing its own policy", async () => {
    const { body: agent } = await createTreasuryAgent(app);

    const response = await app.request(`/agents/${agent.id}/policy`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "x-actor-type": "agent",
        "x-actor-id": agent.id,
      },
      body: JSON.stringify({
        ...agentBody,
        denyThreshold: 50_000,
      }),
    });

    expect(response.status).toBe(403);
    const payload = await response.json();
    expect(payload.error).toMatch(/cannot change/i);

    const current = await (await app.request(`/agents/${agent.id}`)).json();
    expect(current.policy.denyThreshold).toBe(2000);
  });
});

import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSimulatedExecutor } from "@privent/blockchain";
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

const recipient = "0x2222222222222222222222222222222222222222";

async function createTreasury(app: ReturnType<typeof createApp>) {
  const response = await app.request("/agents", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(agentBody),
  });
  return { response, body: await response.json() };
}

async function propose(
  app: ReturnType<typeof createApp>,
  agentId: string,
  amount: number,
) {
  return app.request(`/agents/${agentId}/actions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: "TRANSFER",
      asset: "USDC",
      amount,
      recipient,
      reason: "Vendor payment",
    }),
  });
}

describe("execute / approve / deny", () => {
  let db: AppDatabase;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    db = openDatabase(":memory:");
    migrate(db);
    app = createApp(db, createSimulatedExecutor());
  });

  afterEach(() => {
    db.close();
  });

  it("auto-executes ALLOW and records a hash", async () => {
    const { body: agent } = await createTreasury(app);
    const response = await propose(app, agent.id, 200);
    const payload = await response.json();

    expect(payload.evaluation.decision).toBe("ALLOW");
    expect(payload.request.txHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(payload.request.txStatus).toBe("confirmed");
    expect(payload.request.txMode).toBe("simulated");
  });

  it("never broadcasts a DENY", async () => {
    const { body: agent } = await createTreasury(app);
    const payload = await (await propose(app, agent.id, 5000)).json();

    expect(payload.evaluation.decision).toBe("DENY");
    expect(payload.request.txHash).toBeNull();
    expect(payload.request.txStatus).toBeNull();

    const overview = await (
      await app.request(`/agents/${agent.id}/overview`)
    ).json();
    const types = overview.audit.map((event: { type: string }) => event.type);
    expect(types).toContain("execution.skipped");
    expect(types).not.toContain("signer.requested");
    expect(types).not.toContain("transaction.broadcast");
    expect(types).not.toContain("transaction.confirmed");
  });

  it("executes after human approval and skips after rejection", async () => {
    const { body: agent } = await createTreasury(app);
    const pending = await (await propose(app, agent.id, 750)).json();
    expect(pending.evaluation.decision).toBe("REQUIRE_APPROVAL");
    expect(pending.request.txHash).toBeNull();

    const rejectedPropose = await (await propose(app, agent.id, 800)).json();
    const rejected = await app.request(
      `/agents/${agent.id}/actions/${rejectedPropose.request.id}/decision`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-actor-type": "human",
          "x-actor-id": "cfo",
        },
        body: JSON.stringify({ status: "rejected" }),
      },
    );
    const rejectedBody = await rejected.json();
    expect(rejectedBody.approvalStatus).toBe("rejected");
    expect(rejectedBody.txHash).toBeNull();

    const approved = await app.request(
      `/agents/${agent.id}/actions/${pending.request.id}/decision`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-actor-type": "human",
          "x-actor-id": "cfo",
        },
        body: JSON.stringify({ status: "approved" }),
      },
    );
    const approvedBody = await approved.json();
    expect(approvedBody.approvalStatus).toBe("approved");
    expect(approvedBody.txHash).toMatch(/^0x[a-f0-9]{64}$/);
  });

  it("writes an audit trail and never stores a private key", async () => {
    const { body: agent } = await createTreasury(app);
    await propose(app, agent.id, 200);
    const pending = await (await propose(app, agent.id, 750)).json();
    await app.request(
      `/agents/${agent.id}/actions/${pending.request.id}/decision`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-actor-type": "human",
          "x-actor-id": "cfo",
        },
        body: JSON.stringify({ status: "approved" }),
      },
    );
    await propose(app, agent.id, 5000);

    const overview = await (
      await app.request(`/agents/${agent.id}/overview`)
    ).json();
    const dump = JSON.stringify(overview.audit);
    expect(dump).not.toMatch(/privateKey/i);
    expect(dump).not.toMatch(/EXECUTOR_PRIVATE_KEY/);
    expect(dump).not.toMatch(
      /0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80/i,
    );

    const types = overview.audit.map((event: { type: string }) => event.type);
    expect(types).toEqual(
      expect.arrayContaining([
        "action.requested",
        "policy.evaluated",
        "signer.requested",
        "transaction.confirmed",
        "approval.requested",
        "approval.approved",
        "execution.skipped",
      ]),
    );
  });

  it("keeps the agent package away from the signer", () => {
    const agentPkg = readFileSync("packages/agent/package.json", "utf8");
    const policyPkg = readFileSync(
      "packages/policy-engine/package.json",
      "utf8",
    );
    expect(agentPkg).not.toMatch(/blockchain/);
    expect(policyPkg).not.toMatch(/blockchain/);
  });
});

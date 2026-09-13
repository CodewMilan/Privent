import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSimulatedExecutor } from "@privent/blockchain";
import { createApp } from "../../apps/api/src/app.js";
import { openDatabase, type AppDatabase } from "../../apps/api/src/db/client.js";
import { migrate } from "../../apps/api/src/db/migrate.js";
import { seedDemoIfEmpty } from "../../apps/api/src/db/seed.js";

/**
 * Phase 8 — the demo story, end to end.
 *
 * Treasury $10,000. Auto under $500. Human + Ledger $500–$2,000.
 * Deny over $2,000. The agent cannot raise the deny cap or approve itself.
 */
describe("demo: $320 / $1,200 / $5,000", () => {
  let db: AppDatabase;
  let app: ReturnType<typeof createApp>;
  let agentId: string;

  beforeEach(async () => {
    db = openDatabase(":memory:");
    migrate(db);
    const executor = createSimulatedExecutor();
    await seedDemoIfEmpty(db, executor);
    app = createApp(db, executor);
    const agents = await (await app.request("/agents")).json();
    agentId = agents[0].id as string;
  });

  afterEach(() => {
    db.close();
  });

  async function overview() {
    return (await app.request(`/agents/${agentId}/overview`)).json();
  }

  it("auto-sends $320, waits on $1,200 until Ledger, and never sends $5,000", async () => {
    const start = await overview();

    expect(start.agent.treasury).toBe(10_000);
    expect(start.agent.policy.approvalThreshold).toBe(500);
    expect(start.agent.policy.denyThreshold).toBe(2_000);
    expect(start.agent.spentToday).toBe(320);

    const auto = start.activity.find((item: { amount: number }) => item.amount === 320);
    const mid = start.activity.find((item: { amount: number }) => item.amount === 1200);
    const denied = start.activity.find((item: { amount: number }) => item.amount === 5000);

    expect(auto.policyDecision).toBe("ALLOW");
    expect(auto.txHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(auto.txStatus).toBe("confirmed");

    expect(mid.policyDecision).toBe("REQUIRE_APPROVAL");
    expect(mid.approvalStatus).toBe("pending");
    expect(mid.txHash).toBeNull();
    expect(start.pendingApprovals).toHaveLength(1);
    expect(start.waitingForLedger).toHaveLength(0);

    expect(denied.policyDecision).toBe("DENY");
    expect(denied.txHash).toBeNull();

    const deniedAudit = start.audit.filter(
      (event: { actionRequestId: string | null }) =>
        event.actionRequestId === denied.id,
    );
    const deniedTypes = deniedAudit.map((event: { type: string }) => event.type);
    expect(deniedTypes).toContain("execution.skipped");
    expect(deniedTypes).not.toContain("signer.requested");
    expect(deniedTypes).not.toContain("transaction.confirmed");
    expect(deniedTypes).not.toContain("ledger.requested");

    const agentApprove = await app.request(
      `/agents/${agentId}/actions/${mid.id}/decision`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-actor-type": "agent",
          "x-actor-id": agentId,
        },
        body: JSON.stringify({ status: "approved" }),
      },
    );
    expect(agentApprove.status).toBe(403);

    const agentPolicy = await app.request(`/agents/${agentId}/policy`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "x-actor-type": "agent",
        "x-actor-id": agentId,
      },
      body: JSON.stringify({
        dailyLimit: 10_000,
        perTransactionLimit: 9_000,
        approvalThreshold: 500,
        denyThreshold: 9_000,
      }),
    });
    expect(agentPolicy.status).toBe(403);
    expect((await (await app.request(`/agents/${agentId}`)).json()).policy.denyThreshold).toBe(
      2_000,
    );

    const humanApprove = await app.request(
      `/agents/${agentId}/actions/${mid.id}/decision`,
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
    const approvedBody = await humanApprove.json();
    expect(humanApprove.status).toBe(200);
    expect(approvedBody.approvalStatus).toBe("approved");
    expect(approvedBody.txHash).toBeNull();
    expect(approvedBody.ledgerStatus).toBe("pending");

    const waiting = await overview();
    expect(waiting.agent.spentToday).toBe(320);
    expect(waiting.waitingForLedger).toHaveLength(1);
    expect(waiting.pendingApprovals).toHaveLength(0);

    const agentLedger = await app.request(
      `/agents/${agentId}/actions/${mid.id}/ledger`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-actor-type": "agent",
          "x-actor-id": agentId,
        },
        body: JSON.stringify({ status: "confirmed" }),
      },
    );
    expect(agentLedger.status).toBe(403);

    const ledger = await app.request(
      `/agents/${agentId}/actions/${mid.id}/ledger`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-actor-type": "human",
          "x-actor-id": "cfo",
        },
        body: JSON.stringify({ status: "confirmed" }),
      },
    );
    const ledgerBody = await ledger.json();
    expect(ledger.status).toBe(200);
    expect(ledgerBody.ledgerStatus).toBe("confirmed");
    expect(ledgerBody.txHash).toMatch(/^0x[a-f0-9]{64}$/);

    const done = await overview();
    expect(done.agent.spentToday).toBe(1_520);
    expect(done.waitingForLedger).toHaveLength(0);

    const sent = done.activity.find((item: { amount: number }) => item.amount === 1200);
    const stillDenied = done.activity.find(
      (item: { amount: number }) => item.amount === 5000,
    );
    expect(sent.txHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(stillDenied.txHash).toBeNull();

    const types = done.audit.map((event: { type: string }) => event.type);
    expect(types).toEqual(
      expect.arrayContaining([
        "action.requested",
        "policy.evaluated",
        "wallet.evaluated",
        "confidential.evaluated",
        "graph.evaluated",
        "signer.requested",
        "transaction.confirmed",
        "approval.requested",
        "approval.denied",
        "approval.approved",
        "ledger.requested",
        "ledger.denied",
        "ledger.confirmed",
        "execution.skipped",
        "policy.change_denied",
      ]),
    );

    expect(done.wallet.exportPrivateKey).toBe(false);
    const dump = JSON.stringify(done);
    expect(dump).not.toContain("42500");
    expect(dump).not.toContain("privent-demo-salt");
    expect(dump).not.toMatch(/EXECUTOR_PRIVATE_KEY/);
    expect(dump).not.toMatch(
      /0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80/i,
    );
  });
});

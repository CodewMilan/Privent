import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSimulatedExecutor } from "@privent/blockchain";
import { createApp } from "../app.js";
import { openDatabase, type AppDatabase } from "../db/client.js";
import { migrate } from "../db/migrate.js";
import { seedDemoIfEmpty } from "../db/seed.js";

describe("dashboard overview", () => {
  let db: AppDatabase;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    db = openDatabase(":memory:");
    migrate(db);
    const executor = createSimulatedExecutor();
    await seedDemoIfEmpty(db, executor);
    app = createApp(db, executor);
  });

  afterEach(() => {
    db.close();
  });

  it("returns agent, permissions, activity, and a pending approval", async () => {
    const agents = await (await app.request("/agents")).json();
    const overview = await (
      await app.request(`/agents/${agents[0].id}/overview`)
    ).json();

    expect(overview.agent.name).toBe("Acme Treasury Agent");
    expect(overview.permissions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Spend under $500", state: "allowed" }),
        expect.objectContaining({
          label: "Spend over $2,000",
          state: "denied",
        }),
      ]),
    );

    const decisions = overview.activity.map(
      (item: { policyDecision: string }) => item.policyDecision,
    );
    expect(decisions).toEqual(
      expect.arrayContaining(["ALLOW", "REQUIRE_APPROVAL", "DENY"]),
    );
    expect(overview.pendingApprovals).toHaveLength(1);
    expect(overview.pendingApprovals[0].amount).toBe(1200);
    expect(overview.pendingApprovals[0].policyReason).toMatch(/approval/i);

    const allowed = overview.activity.find(
      (item: { amount: number }) => item.amount === 320,
    );
    const denied = overview.activity.find(
      (item: { amount: number }) => item.amount === 5000,
    );
    expect(allowed.txHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(denied.txHash).toBeNull();
    expect(overview.signer.mode).toBe("simulated");
  });

  it("lets a human approve and blocks the agent from approving", async () => {
    const agents = await (await app.request("/agents")).json();
    const overview = await (
      await app.request(`/agents/${agents[0].id}/overview`)
    ).json();
    const pendingId = overview.pendingApprovals[0].id as string;

    const blocked = await app.request(
      `/agents/${agents[0].id}/actions/${pendingId}/decision`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-actor-type": "agent",
          "x-actor-id": agents[0].id,
        },
        body: JSON.stringify({ status: "approved" }),
      },
    );
    expect(blocked.status).toBe(403);

    const approved = await app.request(
      `/agents/${agents[0].id}/actions/${pendingId}/decision`,
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
    expect(approved.status).toBe(200);
    expect((await approved.json()).approvalStatus).toBe("approved");

    const after = await (
      await app.request(`/agents/${agents[0].id}/overview`)
    ).json();
    expect(after.pendingApprovals).toHaveLength(0);
  });

  it("counts approved spend toward spentToday, not just ALLOW", async () => {
    const agents = await (await app.request("/agents")).json();
    const before = await (
      await app.request(`/agents/${agents[0].id}/overview`)
    ).json();
    // Seed: $320 ALLOW + $1,200 REQUIRE_APPROVAL (pending) + $5,000 DENY.
    // Pending approval must NOT count yet.
    expect(before.agent.spentToday).toBe(320);

    const pendingId = before.pendingApprovals[0].id as string;
    await app.request(
      `/agents/${agents[0].id}/actions/${pendingId}/decision`,
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

    const after = await (
      await app.request(`/agents/${agents[0].id}/overview`)
    ).json();
    // Now the approved $1,200 is executed and counts against the daily limit.
    expect(after.agent.spentToday).toBe(1520);
    const approved = after.activity.find(
      (item: { amount: number }) => item.amount === 1200,
    );
    expect(approved.txHash).toMatch(/^0x[a-f0-9]{64}$/);
  });

  it("returns 400 for malformed JSON bodies", async () => {
    const agents = await (await app.request("/agents")).json();
    const bad = await app.request(`/agents/${agents[0].id}/actions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{ not valid json",
    });
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toMatch(/valid json/i);
  });

  it("PATCH /policy ignores identity fields and only updates policy limits", async () => {
    const agents = await (await app.request("/agents")).json();
    const original = agents[0];

    const res = await app.request(`/agents/${original.id}/policy`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "x-actor-type": "human",
        "x-actor-id": "cfo",
      },
      body: JSON.stringify({
        // These identity fields must be ignored:
        name: "Hacked Agent",
        walletAddress: "0x9999999999999999999999999999999999999999",
        ensName: "attacker.eth",
        owner: "attacker",
        // These policy fields must apply:
        dailyLimit: 8_000,
        perTransactionLimit: 1_500,
        approvalThreshold: 400,
        denyThreshold: 1_500,
      }),
    });
    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated.name).toBe(original.name);
    expect(updated.walletAddress).toBe(original.walletAddress);
    expect(updated.ensName).toBe(original.ensName);
    expect(updated.owner).toBe(original.owner);
    expect(updated.policy.approvalThreshold).toBe(400);
    expect(updated.policy.denyThreshold).toBe(1500);
  });
});

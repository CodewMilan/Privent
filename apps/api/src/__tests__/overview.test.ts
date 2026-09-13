import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { openDatabase, type AppDatabase } from "../db/client.js";
import { migrate } from "../db/migrate.js";
import { seedDemoIfEmpty } from "../db/seed.js";

describe("dashboard overview", () => {
  let db: AppDatabase;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    db = openDatabase(":memory:");
    migrate(db);
    seedDemoIfEmpty(db);
    app = createApp(db);
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
});

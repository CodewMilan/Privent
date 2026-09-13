import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSimulatedExecutor } from "@privent/blockchain";
import { DEMO_PRIVATE_STRATEGY } from "@privent/chainlink";
import { createSimulatedLedger } from "@privent/ledger";
import { createApp } from "../app.js";
import { openDatabase, type AppDatabase } from "../db/client.js";
import { migrate } from "../db/migrate.js";

const agentBody = {
  name: "treasury-agent",
  ensName: "open-app.company.eth",
  dailyLimit: 10_000,
  perTransactionLimit: 2_000,
  approvalThreshold: 500,
  denyThreshold: 2_000,
  allowedAssets: ["USDC"],
  allowedRecipients: ["0x2222222222222222222222222222222222222222"],
};

describe("Ledger + confidential workflow", () => {
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

  async function createAgent() {
    return (await app.request("/agents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(agentBody),
    })).json();
  }

  async function propose(agentId: string, amount: number) {
    return (
      await app.request(`/agents/${agentId}/actions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "TRANSFER",
          asset: "USDC",
          amount,
          recipient: "0x2222222222222222222222222222222222222222",
          reason: "Vendor payment",
        }),
      })
    ).json();
  }

  it("does not send a high-risk action until Ledger confirms", async () => {
    const agent = await createAgent();
    const pending = await propose(agent.id, 750);
    expect(pending.evaluation.decision).toBe("REQUIRE_APPROVAL");

    const approved = await (
      await app.request(`/agents/${agent.id}/actions/${pending.request.id}/decision`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-actor-type": "human",
          "x-actor-id": "cfo",
        },
        body: JSON.stringify({ status: "approved" }),
      })
    ).json();
    expect(approved.txHash).toBeNull();
    expect(approved.ledgerStatus).toBe("pending");

    const blocked = await app.request(
      `/agents/${agent.id}/actions/${pending.request.id}/ledger`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-actor-type": "agent",
          "x-actor-id": agent.id,
        },
        body: JSON.stringify({ status: "confirmed" }),
      },
    );
    expect(blocked.status).toBe(403);

    const confirmed = await (
      await app.request(`/agents/${agent.id}/actions/${pending.request.id}/ledger`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-actor-type": "human",
          "x-actor-id": "cfo",
        },
        body: JSON.stringify({ status: "confirmed" }),
      })
    ).json();
    expect(confirmed.txHash).toMatch(/^0x[a-f0-9]{64}$/);
  });

  it("never reaches the signer when the device rejects", async () => {
    const rejecting = createApp(db, createSimulatedExecutor(), {
      ledger: createSimulatedLedger({ reject: true }),
    });
    const agent = await (
      await rejecting.request("/agents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(agentBody),
      })
    ).json();
    const pending = await (
      await rejecting.request(`/agents/${agent.id}/actions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "TRANSFER",
          asset: "USDC",
          amount: 750,
          recipient: "0x2222222222222222222222222222222222222222",
          reason: "Vendor payment",
        }),
      })
    ).json();
    await rejecting.request(
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
    const device = await (
      await rejecting.request(
        `/agents/${agent.id}/actions/${pending.request.id}/ledger`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-actor-type": "human",
            "x-actor-id": "cfo",
          },
          body: JSON.stringify({ status: "confirmed" }),
        },
      )
    ).json();
    expect(device.txHash).toBeNull();
    expect(device.ledgerStatus).toBe("rejected");
  });

  it("lets CRE upgrade an otherwise-ALLOW payment without leaking the private floor", async () => {
    const agent = await createAgent();
    const mid = await propose(agent.id, 450);
    expect(mid.evaluation.decision).toBe("REQUIRE_APPROVAL");
    expect(mid.evaluation.code).toBe("CONFIDENTIAL_REQUIRES_APPROVAL");
    expect(mid.request.txHash).toBeNull();

    const overview = await (
      await app.request(`/agents/${agent.id}/overview`)
    ).json();
    const dump = JSON.stringify(overview);
    expect(dump).not.toContain(String(DEMO_PRIVATE_STRATEGY.confidentialLedgerFloorCents));
    expect(dump).not.toContain("privent-demo-salt");
    expect(overview.waitingForLedger).toHaveLength(0);
    expect(overview.pendingApprovals).toHaveLength(1);
  });
});

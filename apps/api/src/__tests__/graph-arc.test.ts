import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PROTOCOL_BRIEF } from "@privent/arc";
import { createSimulatedExecutor } from "@privent/blockchain";
import {
  COOLING_DEMO_PULSE,
  THIN_DEMO_PULSE,
  createErrorGraphClient,
  createStaticGraphClient,
} from "@privent/graph";
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

describe("The Graph + Arc", () => {
  let db: AppDatabase;

  beforeEach(() => {
    db = openDatabase(":memory:");
    migrate(db);
  });

  afterEach(() => {
    db.close();
  });

  async function createAgent(app: ReturnType<typeof createApp>) {
    return (
      await app.request("/agents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(agentBody),
      })
    ).json();
  }

  async function propose(
    app: ReturnType<typeof createApp>,
    agentId: string,
    input: { action?: string; amount: number; reason?: string },
  ) {
    return (
      await app.request(`/agents/${agentId}/actions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: input.action ?? "TRANSFER",
          asset: "USDC",
          amount: input.amount,
          recipient: "0x2222222222222222222222222222222222222222",
          reason: input.reason ?? "Vendor payment",
        }),
      })
    ).json();
  }

  it("upgrades an otherwise-ALLOW send when live volume cools", async () => {
    const app = createApp(db, createSimulatedExecutor(), {
      graph: createStaticGraphClient(COOLING_DEMO_PULSE),
    });
    const agent = await createAgent(app);
    const payload = await propose(app, agent.id, { amount: 200 });
    expect(payload.evaluation.decision).toBe("REQUIRE_APPROVAL");
    expect(payload.evaluation.code).toBe("GRAPH_REQUIRES_APPROVAL");
    expect(payload.request.txHash).toBeNull();
  });

  it("denies new exposure when live TVL is thin", async () => {
    const app = createApp(db, createSimulatedExecutor(), {
      graph: createStaticGraphClient(THIN_DEMO_PULSE),
    });
    const agent = await createAgent(app);
    const payload = await propose(app, agent.id, { amount: 200 });
    expect(payload.evaluation.decision).toBe("DENY");
    expect(payload.evaluation.code).toBe("GRAPH_DENIED");
    expect(payload.request.txHash).toBeNull();

    const overview = await (await app.request(`/agents/${agent.id}/overview`)).json();
    const types = overview.audit.map((event: { type: string }) => event.type);
    expect(types).toContain("graph.evaluated");
    expect(types).toContain("execution.skipped");
    expect(types).not.toContain("arc.settled");
    expect(types).not.toContain("signer.requested");
  });

  it("fails closed when Graph cannot be read", async () => {
    const app = createApp(db, createSimulatedExecutor(), {
      graph: createErrorGraphClient(),
    });
    const agent = await createAgent(app);
    const payload = await propose(app, agent.id, { amount: 200 });
    expect(payload.evaluation.decision).toBe("REQUIRE_APPROVAL");
    expect(payload.evaluation.code).toBe("GRAPH_UNAVAILABLE");
  });

  it("settles a $0.02 protocol brief through Arc after policy ALLOW", async () => {
    const app = createApp(db, createSimulatedExecutor());
    const agent = await createAgent(app);
    const payload = await propose(app, agent.id, {
      action: "PAYMENT",
      amount: PROTOCOL_BRIEF.amountCents / 100,
      reason: PROTOCOL_BRIEF.reason,
    });
    expect(payload.evaluation.decision).toBe("ALLOW");
    expect(payload.request.txHash).toMatch(/^arc_sim_/);
    expect(payload.request.txMode).toBe("simulated");

    const overview = await (await app.request(`/agents/${agent.id}/overview`)).json();
    expect(overview.market.protocol).toBe("Uniswap V3");
    expect(overview.payments.simulated).toBe(true);
    const types = overview.audit.map((event: { type: string }) => event.type);
    expect(types).toContain("graph.evaluated");
    expect(types).toContain("arc.settled");
    expect(JSON.stringify(overview)).not.toMatch(/GRAPH_API_KEY=|CIRCLE_ENTITY_SECRET/);
  });

  it("never reaches Arc when the payment is over the deny cap", async () => {
    const app = createApp(db, createSimulatedExecutor());
    const agent = await createAgent(app);
    const payload = await propose(app, agent.id, {
      action: "PAYMENT",
      amount: 5000,
      reason: "Oversized protocol brief",
    });
    expect(payload.evaluation.decision).toBe("DENY");
    expect(payload.request.txHash).toBeNull();
    const overview = await (await app.request(`/agents/${agent.id}/overview`)).json();
    const types = overview.audit.map((event: { type: string }) => event.type);
    expect(types).not.toContain("arc.settled");
    expect(types).not.toContain("signer.requested");
  });

  it("keeps the agent package off Graph and Arc", () => {
    const agentPkg = readFileSync("packages/agent/package.json", "utf8");
    expect(agentPkg).not.toMatch(/graph/);
    expect(agentPkg).not.toMatch(/arc/);
  });
});

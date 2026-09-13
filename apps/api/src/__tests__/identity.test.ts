import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSimulatedExecutor } from "@privent/blockchain";
import { buildAgentRecords, createStaticEnsReader } from "@privent/ens";
import { walletPolicyFromApp } from "@privent/privy";
import { createApp } from "../app.js";
import { openDatabase, type AppDatabase } from "../db/client.js";
import { migrate } from "../db/migrate.js";
import { seedDemoIfEmpty } from "../db/seed.js";
import { upsertControls } from "../repos/controls.js";

const DEMO_RECIPIENT = "0x2222222222222222222222222222222222222222";
const OTHER_RECIPIENT = "0x3333333333333333333333333333333333333333";

const records = buildAgentRecords({
  name: "Acme Treasury Agent",
  ensName: "treasury-agent.company.eth",
  owner: "Acme Finance",
  walletAddress: "0x1111111111111111111111111111111111111111",
  endpoint: "http://localhost:3000",
  allowedAssets: ["USDC", "ETH"],
  approvalThreshold: 500,
  denyThreshold: 2000,
});

describe("ENS identity + wallet policy", () => {
  let db: AppDatabase;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    db = openDatabase(":memory:");
    migrate(db);
    const executor = createSimulatedExecutor();
    await seedDemoIfEmpty(db, executor, {
      ensReader: createStaticEnsReader({}),
      dashboardUrl: "http://localhost:3000",
    });
    app = createApp(db, executor, {
      ensReader: createStaticEnsReader({}),
      dashboardUrl: "http://localhost:3000",
    });
  });

  afterEach(() => {
    db.close();
  });

  it("publishes ENSIP-26 records and reports when the name is not on chain", async () => {
    const agents = await (await app.request("/agents")).json();
    const overview = await (
      await app.request(`/agents/${agents[0].id}/overview`)
    ).json();

    expect(overview.identity.ensName).toBe("treasury-agent.company.eth");
    expect(overview.identity.published["agent-context"]).toMatch(
      /never hold a private key/i,
    );
    expect(overview.identity.published["agent-endpoint[web]"]).toBe(
      "http://localhost:3000",
    );
    expect(overview.identity.onChain.status).toBe("name-not-found");
    expect(overview.identity.agreement).toBe("name-not-found");
    expect(overview.wallet.exportPrivateKey).toBe(false);
    expect(overview.wallet.maxAuto).toBe(500);
    expect(overview.wallet.maxSend).toBe(2000);
    expect(overview.effective.approvalThreshold).toBe(500);
    expect(overview.permissions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Send only to the allowlisted recipient",
          state: "allowed",
        }),
        expect.objectContaining({ label: "Export private key", state: "denied" }),
      ]),
    );
  });

  it("marks identity as matching when on-chain records equal the published ones", async () => {
    const executor = createSimulatedExecutor();
    const withName = createApp(db, executor, {
      ensReader: createStaticEnsReader({
        "treasury-agent.company.eth": {
          address: "0x1111111111111111111111111111111111111111",
          texts: records,
        },
      }),
      dashboardUrl: "http://localhost:3000",
    });
    const agents = await (await withName.request("/agents")).json();
    const overview = await (
      await withName.request(`/agents/${agents[0].id}/overview`)
    ).json();
    expect(overview.identity.agreement).toBe("match");
    expect(overview.identity.onChain.status).toBe("resolved");
  });

  it("shows the tighter wallet band in the UI, never a looser app band", async () => {
    const agents = await (await app.request("/agents")).json();
    const agent = await (await app.request(`/agents/${agents[0].id}`)).json();
    upsertControls(db, agents[0].id, {
      ...walletPolicyFromApp({
        dailyLimitCents: 1_000_000,
        perTransactionLimitCents: 200_000,
        approvalThresholdCents: 50_000,
        denyThresholdCents: 200_000,
        allowedAssets: ["USDC", "ETH"],
        allowedContracts: [],
        allowedRecipients: [DEMO_RECIPIENT],
      }),
      maxAutoCents: 10_000,
      maxSendCents: 100_000,
    });

    const overview = await (
      await app.request(`/agents/${agents[0].id}/overview`)
    ).json();
    expect(overview.agent.policy.approvalThreshold).toBe(500);
    expect(overview.effective.approvalThreshold).toBe(100);
    expect(overview.effective.denyThreshold).toBe(1000);
    expect(overview.permissions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Spend under $100", state: "allowed" }),
        expect.objectContaining({
          label: "Spend over $1,000",
          state: "denied",
        }),
      ]),
    );
    expect(overview.permissions.find((row: { label: string }) =>
      row.label.includes("$500"),
    )).toBeUndefined();
    expect(agent.policy.approvalThreshold).toBe(500);

    const mid = await (
      await app.request(`/agents/${agents[0].id}/actions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "TRANSFER",
          asset: "USDC",
          amount: 200,
          recipient: DEMO_RECIPIENT,
          reason: "Should need approval under the wallet cap",
        }),
      })
    ).json();
    expect(mid.evaluation.decision).toBe("REQUIRE_APPROVAL");
    expect(mid.request.txHash).toBeNull();
  });

  it("denies an unauthorized recipient even when the app would allow it", async () => {
    const created = await app.request("/agents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "open-app-agent",
        ensName: "open-app.company.eth",
        dailyLimit: 10_000,
        perTransactionLimit: 2_000,
        approvalThreshold: 500,
        denyThreshold: 2_000,
        allowedAssets: ["USDC"],
      }),
    });
    const agent = await created.json();
    upsertControls(db, agent.id, {
      ...walletPolicyFromApp({
        dailyLimitCents: 1_000_000,
        perTransactionLimitCents: 200_000,
        approvalThresholdCents: 50_000,
        denyThresholdCents: 200_000,
        allowedAssets: ["USDC"],
        allowedContracts: [],
        allowedRecipients: [],
      }),
      allowedRecipients: [DEMO_RECIPIENT],
    });

    const blocked = await (
      await app.request(`/agents/${agent.id}/actions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "TRANSFER",
          asset: "USDC",
          amount: 200,
          recipient: OTHER_RECIPIENT,
          reason: "Unauthorized vendor",
        }),
      })
    ).json();

    expect(blocked.evaluation.decision).toBe("DENY");
    expect(blocked.evaluation.code).toBe("WALLET_POLICY_DENIED");
    expect(blocked.request.txHash).toBeNull();

    const allowed = await (
      await app.request(`/agents/${agent.id}/actions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "TRANSFER",
          asset: "USDC",
          amount: 200,
          recipient: DEMO_RECIPIENT,
          reason: "Known vendor",
        }),
      })
    ).json();
    expect(allowed.evaluation.decision).toBe("ALLOW");
    expect(allowed.request.txHash).toMatch(/^0x[a-f0-9]{64}$/);
  });

  it("records a Privy policy id when sync succeeds and does not fail seed on error", async () => {
    const fresh = openDatabase(":memory:");
    migrate(fresh);
    await seedDemoIfEmpty(fresh, createSimulatedExecutor(), {
      privy: {
        async createPolicy() {
          return { id: "pol_demo", name: "privent-treasury" };
        },
      },
    });
    const agents = await (
      await createApp(fresh, createSimulatedExecutor()).request("/agents")
    ).json();
    const overview = await (
      await createApp(fresh, createSimulatedExecutor()).request(
        `/agents/${agents[0].id}/overview`,
      )
    ).json();
    expect(overview.wallet.privyPolicyId).toBe("pol_demo");
    fresh.close();

    const failing = openDatabase(":memory:");
    migrate(failing);
    await expect(
      seedDemoIfEmpty(failing, createSimulatedExecutor(), {
        privy: {
          async createPolicy() {
            throw new Error("Privy unavailable");
          },
        },
      }),
    ).resolves.toBeUndefined();
    failing.close();
  });
});

import { describe, expect, it } from "vitest";
import type { Agent, HealthResponse, PolicyDecision } from "../index.js";

describe("shared types", () => {
  it("accepts a valid policy decision", () => {
    const decisions: PolicyDecision[] = ["ALLOW", "DENY", "REQUIRE_APPROVAL"];
    expect(decisions).toHaveLength(3);
  });

  it("describes a treasury agent", () => {
    const agent: Agent = {
      id: "agent_1",
      name: "treasury-agent",
      ensName: null,
      walletAddress: null,
      policy: {
        dailyLimitCents: 100_000,
        perTransactionLimitCents: 50_000,
        approvalThresholdCents: 50_000,
        denyThresholdCents: 200_000,
        allowedAssets: ["USDC", "ETH"],
        allowedContracts: [],
        allowedRecipients: [],
      },
      status: "active",
      owner: "acme",
      createdAt: "2026-09-13T00:00:00.000Z",
    };

    expect(agent.policy.allowedAssets).toContain("USDC");
  });

  it("describes an API health payload", () => {
    const health: HealthResponse = {
      ok: true,
      service: "privent-api",
      db: "connected",
      time: "2026-09-13T00:00:00.000Z",
    };

    expect(health.ok).toBe(true);
  });
});

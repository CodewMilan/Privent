import { describe, expect, it } from "vitest";
import { buildSystemPrompt } from "../prompt.js";
import type { AgentContext } from "../types.js";

const baseContext: AgentContext = {
  agentName: "Acme Treasury Agent",
  ensName: "treasury-agent.company.eth",
  treasuryUsd: 10_000,
  spentTodayUsd: 0,
  policy: {
    approvalThresholdUsd: 500,
    denyThresholdUsd: 2_000,
    allowedAssets: ["USDC", "ETH"],
    allowedRecipients: ["0x2222222222222222222222222222222222222222"],
  },
  graph: {
    protocol: "Uniswap V3",
    pair: "USDC/WETH 0.05%",
    tvlUsd: 414_000_000,
    volume24hUsd: 17_000_000,
    previousVolumeUsd: 20_000_000,
    ethPriceUsd: 2_476,
    vote: "healthy",
    simulated: false,
  },
  recentActions: [],
};

describe("buildSystemPrompt", () => {
  it("includes the ENS identity and both thresholds", () => {
    const prompt = buildSystemPrompt(baseContext);
    expect(prompt).toContain("Acme Treasury Agent (treasury-agent.company.eth)");
    expect(prompt).toContain("$500");
    expect(prompt).toContain("$2,000");
  });

  it("mentions the live Graph pulse and its vote", () => {
    const prompt = buildSystemPrompt(baseContext);
    expect(prompt).toContain("Uniswap V3");
    expect(prompt).toContain("vote: healthy");
  });

  it("does not tell the LLM to refuse — policy engine handles that", () => {
    const prompt = buildSystemPrompt(baseContext);
    expect(prompt).toMatch(/policy engine.*ALLOW/i);
    expect(prompt).toContain("still convert their literal request into JSON");
  });

  it("names the JSON output contract", () => {
    const prompt = buildSystemPrompt(baseContext);
    expect(prompt).toContain('"action":"TRANSFER"');
    expect(prompt).toContain("0x<40 hex>");
  });
});

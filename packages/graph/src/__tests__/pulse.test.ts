import { describe, expect, it } from "vitest";
import type { ProposedAction } from "@privent/shared";
import { evaluateProtocolPulse } from "../evaluate.js";
import { createGraphFromEnv } from "../from-env.js";
import { createGatewayGraphClient } from "../gateway.js";
import {
  COOLING_DEMO_PULSE,
  HEALTHY_DEMO_PULSE,
  THIN_DEMO_PULSE,
  createErrorGraphClient,
  createUnconfiguredGraphClient,
} from "../static.js";

const transfer: ProposedAction = {
  action: "TRANSFER",
  asset: "USDC",
  amountCents: 20_000,
  recipient: "0x2222222222222222222222222222222222222222",
  contract: null,
  reason: "Vendor payment",
};

describe("protocol pulse", () => {
  it("lets a healthy Uniswap pool pass", () => {
    expect(evaluateProtocolPulse(transfer, HEALTHY_DEMO_PULSE)).toMatchObject({
      decision: "ALLOW",
      code: "GRAPH_ALLOWED",
    });
  });

  it("requires a human when volume cools more than 50%", () => {
    expect(evaluateProtocolPulse(transfer, COOLING_DEMO_PULSE)).toMatchObject({
      decision: "REQUIRE_APPROVAL",
      code: "GRAPH_REQUIRES_APPROVAL",
    });
  });

  it("denies new exposure when live TVL is thin", () => {
    expect(evaluateProtocolPulse(transfer, THIN_DEMO_PULSE)).toMatchObject({
      decision: "DENY",
      code: "GRAPH_DENIED",
    });
  });

  it("fails closed when the gateway errors", async () => {
    const pulse = await createErrorGraphClient().readPulse();
    expect(evaluateProtocolPulse(transfer, pulse).decision).toBe("REQUIRE_APPROVAL");
  });

  it("does not vote when no API key is configured", async () => {
    const pulse = await createUnconfiguredGraphClient().readPulse();
    expect(evaluateProtocolPulse(transfer, pulse).code).toBe("GRAPH_NEUTRAL");
  });

  it("env factory stays static under tests even if GRAPH_API_KEY is set", () => {
    const previous = process.env.GRAPH_API_KEY;
    process.env.GRAPH_API_KEY = "test-key";
    try {
      expect(createGraphFromEnv().kind).toBe("static");
    } finally {
      if (previous === undefined) delete process.env.GRAPH_API_KEY;
      else process.env.GRAPH_API_KEY = previous;
    }
  });

  it("gateway client never puts the API key in the pulse", async () => {
    const client = createGatewayGraphClient({
      apiKey: "super-secret-graph-key",
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            data: {
              pool: {
                id: "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640",
                totalValueLockedUSD: "400000000",
                feeTier: "500",
                token0: { symbol: "USDC" },
                token1: { symbol: "WETH" },
              },
              poolDayDatas: [
                { date: 1, volumeUSD: "20000000", tvlUSD: "400000000" },
                { date: 0, volumeUSD: "18000000", tvlUSD: "390000000" },
              ],
              bundle: { ethPriceUSD: "2500" },
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    });
    const pulse = await client.readPulse();
    expect(pulse.status).toBe("ok");
    expect(JSON.stringify(pulse)).not.toContain("super-secret-graph-key");
  });
});

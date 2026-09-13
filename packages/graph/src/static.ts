import type { GraphClient, ProtocolPulse } from "./types.js";
import { USDC_WETH_005_POOL } from "./evaluate.js";

export const HEALTHY_DEMO_PULSE: ProtocolPulse = {
  status: "ok",
  simulated: true,
  protocol: "Uniswap V3",
  pair: "USDC/WETH 0.05%",
  pool: USDC_WETH_005_POOL,
  tvlUsd: 400_000_000,
  volume24hUsd: 20_000_000,
  previousVolumeUsd: 18_000_000,
  ethPriceUsd: 2_500,
  asOf: "2026-09-13T00:00:00.000Z",
  source: "static",
  error: null,
};

export const COOLING_DEMO_PULSE: ProtocolPulse = {
  ...HEALTHY_DEMO_PULSE,
  volume24hUsd: 4_000_000,
  previousVolumeUsd: 20_000_000,
};

export const THIN_DEMO_PULSE: ProtocolPulse = {
  ...HEALTHY_DEMO_PULSE,
  tvlUsd: 250_000,
};

export function createStaticGraphClient(
  pulse: ProtocolPulse = HEALTHY_DEMO_PULSE,
): GraphClient {
  return {
    kind: "static",
    async readPulse() {
      return { ...pulse, asOf: pulse.simulated ? pulse.asOf : new Date().toISOString() };
    },
  };
}

export function createUnconfiguredGraphClient(): GraphClient {
  return {
    kind: "unconfigured",
    async readPulse(): Promise<ProtocolPulse> {
      return {
        status: "unconfigured",
        simulated: true,
        protocol: "Uniswap V3",
        pair: "USDC/WETH 0.05%",
        pool: USDC_WETH_005_POOL,
        tvlUsd: null,
        volume24hUsd: null,
        previousVolumeUsd: null,
        ethPriceUsd: null,
        asOf: new Date().toISOString(),
        source: "unconfigured",
        error: "GRAPH_API_KEY is not set",
      };
    },
  };
}

export function createErrorGraphClient(message = "gateway timeout"): GraphClient {
  return {
    kind: "static",
    async readPulse(): Promise<ProtocolPulse> {
      return {
        status: "error",
        simulated: true,
        protocol: "Uniswap V3",
        pair: "USDC/WETH 0.05%",
        pool: USDC_WETH_005_POOL,
        tvlUsd: null,
        volume24hUsd: null,
        previousVolumeUsd: null,
        ethPriceUsd: null,
        asOf: new Date().toISOString(),
        source: "error",
        error: message,
      };
    },
  };
}

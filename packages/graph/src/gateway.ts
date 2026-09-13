import {
  UNISWAP_V3_SUBGRAPH_ID,
  USDC_WETH_005_POOL,
} from "./evaluate.js";
import type { GraphClient, ProtocolPulse } from "./types.js";

const PULSE_QUERY = `{
  pool(id: "${USDC_WETH_005_POOL}") {
    id
    totalValueLockedUSD
    feeTier
    token0 { symbol }
    token1 { symbol }
  }
  poolDayDatas(
    first: 2
    orderBy: date
    orderDirection: desc
    where: { pool: "${USDC_WETH_005_POOL}" }
  ) {
    date
    volumeUSD
    tvlUSD
  }
  bundle(id: "1") {
    ethPriceUSD
  }
}`;

interface GatewayResponse {
  data?: {
    pool?: {
      id: string;
      totalValueLockedUSD: string;
      feeTier: string;
      token0: { symbol: string };
      token1: { symbol: string };
    } | null;
    poolDayDatas?: Array<{ date: number; volumeUSD: string; tvlUSD: string }>;
    bundle?: { ethPriceUSD: string } | null;
  };
  errors?: Array<{ message: string }>;
}

function asNumber(value: string | undefined): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export interface GatewayGraphOptions {
  apiKey: string;
  subgraphId?: string;
  fetchImpl?: typeof fetch;
}

export function createGatewayGraphClient(
  options: GatewayGraphOptions,
): GraphClient {
  const subgraphId = options.subgraphId ?? UNISWAP_V3_SUBGRAPH_ID;
  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = `https://gateway.thegraph.com/api/${options.apiKey}/subgraphs/id/${subgraphId}`;

  return {
    kind: "gateway",
    async readPulse(): Promise<ProtocolPulse> {
      try {
        const response = await fetchImpl(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query: PULSE_QUERY }),
          signal: AbortSignal.timeout(8_000),
        });
        const body = (await response.json()) as GatewayResponse;
        const message = body.errors?.[0]?.message;
        const pool = body.data?.pool;
        if (!response.ok || message || !pool) {
          return {
            status: "error",
            simulated: false,
            protocol: "Uniswap V3",
            pair: "USDC/WETH 0.05%",
            pool: USDC_WETH_005_POOL,
            tvlUsd: null,
            volume24hUsd: null,
            previousVolumeUsd: null,
            ethPriceUsd: null,
            asOf: new Date().toISOString(),
            source: "thegraph-gateway",
            error: message ?? `Graph gateway returned ${response.status}`,
          };
        }

        const days = body.data?.poolDayDatas ?? [];
        return {
          status: "ok",
          simulated: false,
          protocol: "Uniswap V3",
          pair: `${pool.token0.symbol}/${pool.token1.symbol} 0.05%`,
          pool: pool.id,
          tvlUsd: asNumber(pool.totalValueLockedUSD),
          volume24hUsd: asNumber(days[0]?.volumeUSD),
          previousVolumeUsd: asNumber(days[1]?.volumeUSD),
          ethPriceUsd: asNumber(body.data?.bundle?.ethPriceUSD),
          asOf: new Date().toISOString(),
          source: "thegraph-gateway",
          error: null,
        };
      } catch (error) {
        return {
          status: "error",
          simulated: false,
          protocol: "Uniswap V3",
          pair: "USDC/WETH 0.05%",
          pool: USDC_WETH_005_POOL,
          tvlUsd: null,
          volume24hUsd: null,
          previousVolumeUsd: null,
          ethPriceUsd: null,
          asOf: new Date().toISOString(),
          source: "thegraph-gateway",
          error: error instanceof Error ? error.message : "Graph gateway failed",
        };
      }
    },
  };
}

export function createCachedGraphClient(
  inner: GraphClient,
  ttlMs = 30_000,
): GraphClient {
  let cached: { at: number; pulse: ProtocolPulse } | null = null;
  return {
    kind: inner.kind,
    async readPulse() {
      const now = Date.now();
      if (cached && now - cached.at < ttlMs) {
        return cached.pulse;
      }
      const pulse = await inner.readPulse();
      cached = { at: now, pulse };
      return pulse;
    },
  };
}

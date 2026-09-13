export const PACKAGE_NAME = "graph" as const;

export {
  COOLING_VOLUME_RATIO,
  THIN_TVL_USD,
  UNISWAP_V3_SUBGRAPH_ID,
  USDC_WETH_005_POOL,
  evaluateProtocolPulse,
} from "./evaluate.js";
export {
  COOLING_DEMO_PULSE,
  HEALTHY_DEMO_PULSE,
  THIN_DEMO_PULSE,
  createErrorGraphClient,
  createStaticGraphClient,
  createUnconfiguredGraphClient,
} from "./static.js";
export {
  createCachedGraphClient,
  createGatewayGraphClient,
} from "./gateway.js";
export { createGraphFromEnv } from "./from-env.js";

export type {
  GraphClient,
  GraphPulseStatus,
  ProtocolPulse,
  PulseEvaluation,
} from "./types.js";

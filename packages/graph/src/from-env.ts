import { createCachedGraphClient, createGatewayGraphClient } from "./gateway.js";
import {
  HEALTHY_DEMO_PULSE,
  createStaticGraphClient,
  createUnconfiguredGraphClient,
} from "./static.js";
import type { GraphClient } from "./types.js";

/**
 * Production factory. Tests never call this — they inject a static
 * pulse so a leftover GRAPH_API_KEY cannot hit the live gateway.
 */
export function createGraphFromEnv(): GraphClient {
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return createStaticGraphClient(HEALTHY_DEMO_PULSE);
  }

  const apiKey = process.env.GRAPH_API_KEY?.trim();
  if (!apiKey) {
    return createUnconfiguredGraphClient();
  }

  return createCachedGraphClient(createGatewayGraphClient({ apiKey }));
}

import { createSimulatedArcPayer } from "./simulated.js";
import type { ArcPayer } from "./types.js";

/**
 * Production factory. Tests never call this. A live Circle Gateway
 * payer needs CIRCLE_API_KEY + CIRCLE_ENTITY_SECRET + ARC_WALLET_ADDRESS.
 * Without those, we stay simulated and say so.
 */
export function createArcFromEnv(): ArcPayer {
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return createSimulatedArcPayer();
  }

  const apiKey = process.env.CIRCLE_API_KEY?.trim();
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET?.trim();
  const wallet = process.env.ARC_WALLET_ADDRESS?.trim();
  if (!apiKey || !entitySecret || !wallet) {
    return createSimulatedArcPayer();
  }

  // Circle developer-controlled wallets are not wired yet. Keep the
  // policy path real; do not invent an on-chain settlement.
  return createSimulatedArcPayer();
}

export const PACKAGE_NAME = "arc" as const;

export { createSimulatedArcPayer, PROTOCOL_BRIEF, SIMULATED_ARC_FROM } from "./simulated.js";
export { createArcFromEnv } from "./from-env.js";
export { modeFromReceipt } from "./types.js";

export type {
  ArcPayer,
  ArcPaymentReceipt,
  ArcPaymentRequest,
} from "./types.js";

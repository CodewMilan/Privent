export const PACKAGE_NAME = "ledger" as const;

export { createSimulatedLedger } from "./simulated.js";
export { createCliLedger } from "./cli.js";
export { createLedgerFromEnv } from "./from-env.js";
export { previewFromPermit } from "./types.js";

export type {
  GenuineCheck,
  LedgerConfirmStatus,
  LedgerConfirmation,
  LedgerDevice,
  LedgerPreview,
  LedgerSigner,
} from "./types.js";

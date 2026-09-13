export const PACKAGE_NAME = "blockchain" as const;

export { authorizeExecution } from "./authorize.js";
export { createExecutorFromEnv } from "./executor.js";
export { sanitizeMetadata, sanitizeValue } from "./sanitize.js";
export {
  SIMULATED_FROM,
  createSimulatedExecutor,
} from "./simulated.js";
export { createViemExecutor } from "./viem.js";

export type {
  AuthorizeResult,
  ExecutionMode,
  ExecutionPermit,
  ExecutionResult,
  Executor,
  UnsignedTransfer,
} from "./types.js";

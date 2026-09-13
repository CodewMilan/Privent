export const PACKAGE_NAME = "chainlink" as const;

export {
  DEMO_PRIVATE_STRATEGY,
  STRATEGY_SALT_ID,
  assertNoPrivateLeak,
  evaluatePrivateStrategy,
  publicPayload,
} from "./strategy.js";
export {
  createSimulatedTeeRuntime,
  handlerInTee,
} from "./runtime.js";
export { DEMO_TEE_SECRETS, runTreasuryRiskWorkflow } from "./workflow.js";

export type { PrivateStrategy } from "./strategy.js";
export type {
  AttestedReport,
  ConfidentialSecret,
  DonRuntime,
  TeeConstraint,
  TeeRuntime,
} from "./runtime.js";
export type { ConfidentialWorkflowResult } from "./workflow.js";

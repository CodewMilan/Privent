export const PACKAGE_NAME = "privy" as const;

export {
  combineEvaluations,
  evaluateWalletPolicy,
  fromPrivyPolicyBody,
  intersectLimits,
  tightenWallet,
  toPrivyPolicyBody,
  walletPolicyFromApp,
} from "./policy.js";
export { createHttpPrivyClient } from "./client.js";

export type { EffectiveLimits, PrivyPolicyBody, WalletPolicy } from "./policy.js";
export type { CreatedPrivyPolicy, PrivyClient } from "./client.js";

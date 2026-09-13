import type { PolicyEvaluation, ProposedAction } from "@privent/shared";
import {
  createSimulatedTeeRuntime,
  handlerInTee,
  type AttestedReport,
  type TeeRuntime,
} from "./runtime.js";
import {
  DEMO_PRIVATE_STRATEGY,
  STRATEGY_SALT_ID,
  assertNoPrivateLeak,
  evaluatePrivateStrategy,
  publicPayload,
  type PrivateStrategy,
} from "./strategy.js";

export const DEMO_TEE_SECRETS = {
  [STRATEGY_SALT_ID]: "privent-demo-salt",
};

export interface ConfidentialWorkflowResult {
  evaluation: PolicyEvaluation;
  report: AttestedReport;
  simulated: true;
}

/**
 * CRE-shaped confidential workflow. Matches handlerInTee + TeeRuntime
 * + getSecret + usingTheDons from Chainlink CRE docs. This runtime is a
 * local simulation — Confidential Workflows are still in private beta.
 */
export function runTreasuryRiskWorkflow(
  action: ProposedAction,
  strategy: PrivateStrategy = DEMO_PRIVATE_STRATEGY,
  secrets: Record<string, string> = DEMO_TEE_SECRETS,
): ConfidentialWorkflowResult {
  const onTrigger = (runtime: TeeRuntime<PrivateStrategy>) => {
    const salt = runtime.getSecret({ id: STRATEGY_SALT_ID }).result();
    const evaluation = evaluatePrivateStrategy(action, runtime.config);
    const payload = publicPayload(evaluation);
    assertNoPrivateLeak(payload, runtime.config);
    if (JSON.stringify(payload).includes(salt.value)) {
      throw new Error("Confidential secret leaked into the public payload");
    }

    const don = runtime.usingTheDons();
    const report = don
      .report({
        encodedPayload: Buffer.from(JSON.stringify(payload)).toString("base64"),
        encoderName: "evm",
        signingAlgo: "ecdsa",
        hashingAlgo: "keccak256",
      })
      .result();

    return { evaluation, report, simulated: true as const };
  };

  const workflow = handlerInTee(
    { type: "treasury-risk" },
    onTrigger,
    [{ tee: "nitro", regions: ["us-west-2"] }],
  );

  return workflow(createSimulatedTeeRuntime(strategy, secrets));
}

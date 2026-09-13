import { describe, expect, it } from "vitest";
import * as agentModule from "../index.js";
import { createAgent, validateCreateAgentInput } from "../create-agent.js";
import { proposeAction } from "../propose-action.js";

const validInput = {
  name: "treasury-agent",
  ensName: "treasury-agent.company.eth",
  walletAddress: "0x1111111111111111111111111111111111111111",
  dailyLimit: 10_000,
  perTransactionLimit: 2_000,
  approvalThreshold: 500,
  denyThreshold: 2_000,
  allowedAssets: ["USDC", "ETH"],
  owner: "acme",
};

describe("createAgent", () => {
  it("creates a valid treasury agent", () => {
    const agent = createAgent(validInput);
    expect(agent.name).toBe("treasury-agent");
    expect(agent.status).toBe("active");
    expect(agent.policy.approvalThresholdCents).toBe(50_000);
    expect(agent.policy.denyThresholdCents).toBe(200_000);
    expect(agent.policy.allowedAssets).toEqual(["USDC", "ETH"]);
  });

  it("rejects invalid limits and empty permissions", () => {
    expect(
      validateCreateAgentInput({
        ...validInput,
        name: "",
        dailyLimit: -1,
        approvalThreshold: 5_000,
        denyThreshold: 2_000,
        allowedAssets: [],
      }),
    ).toEqual(
      expect.arrayContaining([
        "name is required",
        "dailyLimit must be greater than 0",
        "approvalThreshold cannot be higher than denyThreshold",
        "allowedAssets must include at least one asset",
      ]),
    );
  });
});

describe("proposeAction", () => {
  it("creates an action request and nothing more", () => {
    const proposed = proposeAction({
      action: "TRANSFER",
      asset: "usdc",
      amount: 750,
      recipient: "0x1111111111111111111111111111111111111111",
      reason: "Vendor payment",
    });

    expect(proposed).toEqual({
      action: "TRANSFER",
      asset: "USDC",
      amountCents: 75_000,
      recipient: "0x1111111111111111111111111111111111111111",
      contract: null,
      reason: "Vendor payment",
    });
    expect(proposed).not.toHaveProperty("policyDecision");
  });

  it("rejects an empty reason or zero amount", () => {
    expect(() =>
      proposeAction({
        action: "TRANSFER",
        asset: "USDC",
        amount: 0,
        reason: "x",
      }),
    ).toThrow(/amount/i);

    expect(() =>
      proposeAction({
        action: "TRANSFER",
        asset: "USDC",
        amount: 20,
        reason: "   ",
      }),
    ).toThrow(/reason/i);
  });
});

describe("agent security boundary", () => {
  it("cannot sign, execute, evaluate policy, or change limits", () => {
    expect(agentModule).not.toHaveProperty("evaluateAction");
    expect(agentModule).not.toHaveProperty("sign");
    expect(agentModule).not.toHaveProperty("execute");
    expect(agentModule).not.toHaveProperty("updatePolicy");
    expect(agentModule).not.toHaveProperty("approve");
  });
});

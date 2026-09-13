import { describe, expect, it } from "vitest";
import { createSimulatedExecutor } from "../simulated.js";

const allowPermit = {
  transfer: {
    actionRequestId: "act_allow",
    to: "0x2222222222222222222222222222222222222222",
    amountCents: 32_000,
    asset: "USDC",
    reason: "Exchange listing fee",
  },
  policyDecision: "ALLOW" as const,
  approvalStatus: null,
};

describe("simulated executor", () => {
  it("returns a tx hash for ALLOW and never includes a private key", async () => {
    const executor = createSimulatedExecutor();
    const result = await executor.send(allowPermit);

    expect(result.status).toBe("confirmed");
    expect(result.hash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(result.mode).toBe("simulated");
    expect(JSON.stringify(result)).not.toMatch(/privateKey/i);
    expect(JSON.stringify(result)).not.toMatch(/0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80/i);
  });

  it("refuses to send a DENY even if the API asks", async () => {
    const executor = createSimulatedExecutor();
    const result = await executor.send({
      ...allowPermit,
      policyDecision: "DENY",
    });

    expect(result.hash).toBeNull();
    expect(result.status).toBe("failed");
    expect(result.error).toMatch(/cannot be broadcast/i);
  });
});

import { describe, expect, it } from "vitest";
import { createArcFromEnv } from "../from-env.js";
import { PROTOCOL_BRIEF, createSimulatedArcPayer } from "../simulated.js";

const request = {
  actionRequestId: "act_1",
  resource: PROTOCOL_BRIEF.resource,
  to: "0x2222222222222222222222222222222222222222",
  amountCents: PROTOCOL_BRIEF.amountCents,
  asset: "USDC" as const,
  reason: PROTOCOL_BRIEF.reason,
};

describe("Arc nanopayment payer", () => {
  it("settles a simulated x402-shaped payment", async () => {
    const receipt = await createSimulatedArcPayer().pay(request);
    expect(receipt.status).toBe("settled");
    expect(receipt.simulated).toBe(true);
    expect(receipt.settlementId).toMatch(/^arc_sim_/);
    expect(receipt.amountCents).toBe(2);
  });

  it("can reject without producing a settlement id", async () => {
    const receipt = await createSimulatedArcPayer({ reject: true }).pay(request);
    expect(receipt.status).toBe("rejected");
    expect(receipt.settlementId).toBeNull();
  });

  it("env factory stays simulated under tests", () => {
    const previous = process.env.CIRCLE_API_KEY;
    process.env.CIRCLE_API_KEY = "TEST_API_KEY:demo";
    try {
      expect(createArcFromEnv().kind).toBe("simulated");
    } finally {
      if (previous === undefined) delete process.env.CIRCLE_API_KEY;
      else process.env.CIRCLE_API_KEY = previous;
    }
  });
});

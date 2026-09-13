import { describe, expect, it } from "vitest";
import { authorizeExecution } from "../authorize.js";
import type { ExecutionPermit } from "../types.js";

const transfer = {
  actionRequestId: "act_1",
  to: "0x2222222222222222222222222222222222222222",
  amountCents: 32_000,
  asset: "USDC",
  reason: "Vendor payment",
};

function permit(overrides: Partial<ExecutionPermit> = {}): ExecutionPermit {
  return {
    transfer,
    policyDecision: "ALLOW",
    approvalStatus: null,
    ...overrides,
  };
}

describe("authorizeExecution", () => {
  it("allows an ALLOW permit", () => {
    expect(authorizeExecution(permit()).ok).toBe(true);
  });

  it("never broadcasts a DENY", () => {
    const result = authorizeExecution(permit({ policyDecision: "DENY" }));
    expect(result).toMatchObject({
      ok: false,
      code: "DENIED_BY_POLICY",
    });
  });

  it("blocks REQUIRE_APPROVAL until a human approves", () => {
    expect(
      authorizeExecution(
        permit({ policyDecision: "REQUIRE_APPROVAL", approvalStatus: "pending" }),
      ).ok,
    ).toBe(false);

    expect(
      authorizeExecution(
        permit({
          policyDecision: "REQUIRE_APPROVAL",
          approvalStatus: "rejected",
        }),
      ).ok,
    ).toBe(false);

    expect(
      authorizeExecution(
        permit({
          policyDecision: "REQUIRE_APPROVAL",
          approvalStatus: "approved",
        }),
      ).ok,
    ).toBe(true);
  });

  it("rejects a missing or malformed recipient", () => {
    const result = authorizeExecution(
      permit({
        transfer: { ...transfer, to: "not-an-address" },
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("INVALID_RECIPIENT");
    }
  });
});

import { describe, expect, it } from "vitest";
import { canApproveAction, canChangePolicy } from "../authorize.js";

describe("policy authorization", () => {
  it("stops an agent from changing its own limits", () => {
    const result = canChangePolicy({ type: "agent", id: "treasury-agent" });
    expect(result.decision).toBe("DENY");
    expect(result.reason).toMatch(/cannot change/i);
  });

  it("lets a human owner change policy", () => {
    expect(canChangePolicy({ type: "owner", id: "acme" }).decision).toBe(
      "ALLOW",
    );
  });

  it("stops an agent from approving its own transaction", () => {
    const result = canApproveAction(
      { type: "agent", id: "treasury-agent" },
      "treasury-agent",
    );
    expect(result.decision).toBe("DENY");
  });

  it("lets a human approve", () => {
    expect(
      canApproveAction({ type: "human", id: "cfo" }, "treasury-agent").decision,
    ).toBe("ALLOW");
  });
});

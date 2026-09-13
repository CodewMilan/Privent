import { describe, expect, it } from "vitest";
import { describePermissions } from "../permissions.js";

describe("describePermissions", () => {
  it("shows auto, approval, and deny bands", () => {
    const rows = describePermissions({
      approvalThreshold: 500,
      denyThreshold: 2000,
      allowedAssets: ["USDC", "ETH"],
    });

    expect(rows).toContainEqual({
      label: "Spend under $500",
      state: "allowed",
    });
    expect(rows).toContainEqual({
      label: "Spend $500–$2,000",
      state: "approval",
    });
    expect(rows).toContainEqual({
      label: "Spend over $2,000",
      state: "denied",
    });
    expect(rows).toContainEqual({
      label: "Change permissions",
      state: "denied",
    });
    expect(rows).toContainEqual({
      label: "Export private key",
      state: "denied",
    });
  });
});

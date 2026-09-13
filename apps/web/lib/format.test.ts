import { describe, expect, it } from "vitest";
import { decisionLabel, formatAddress, formatUsd } from "./format";

describe("dashboard formatters", () => {
  it("formats money, addresses, and decisions", () => {
    expect(formatUsd(1200)).toBe("$1,200");
    expect(formatAddress("0x1111111111111111111111111111111111111111")).toBe(
      "0x1111…1111",
    );
    expect(decisionLabel("ALLOW")).toBe("Allowed");
    expect(decisionLabel("REQUIRE_APPROVAL")).toBe("Needs approval");
    expect(decisionLabel("DENY")).toBe("Denied");
    expect(decisionLabel("REQUIRE_APPROVAL", "approved")).toBe("Approved");
  });
});

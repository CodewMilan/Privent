import { describe, expect, it } from "vitest";
import {
  decisionLabel,
  formatAddress,
  formatTxHash,
  formatUsd,
} from "./format";

describe("dashboard formatters", () => {
  it("formats money, addresses, hashes, and decisions", () => {
    expect(formatUsd(1200)).toBe("$1,200");
    expect(formatAddress("0x1111111111111111111111111111111111111111")).toBe(
      "0x1111…1111",
    );
    expect(
      formatTxHash(
        "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      ),
    ).toBe("0xbbbbbbbb…bbbbbb");
    expect(decisionLabel("ALLOW")).toBe("Allowed");
    expect(decisionLabel("REQUIRE_APPROVAL")).toBe("Needs approval");
    expect(decisionLabel("DENY")).toBe("Denied");
    expect(decisionLabel("REQUIRE_APPROVAL", "approved")).toBe("Approved");
    expect(decisionLabel("ALLOW", null, "confirmed")).toBe("Executed");
    expect(decisionLabel("ALLOW", null, "failed")).toBe("Failed");
  });
});

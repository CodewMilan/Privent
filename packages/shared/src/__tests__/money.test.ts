import { describe, expect, it } from "vitest";
import { centsToDollars, dollarsToCents, formatDollars } from "../money.js";

describe("money", () => {
  it("converts dollars to integer cents", () => {
    expect(dollarsToCents(200)).toBe(20_000);
    expect(dollarsToCents(200.01)).toBe(20_001);
  });

  it("formats policy reasons", () => {
    expect(formatDollars(500_000)).toBe("$5,000");
    expect(centsToDollars(50_000)).toBe(500);
  });
});

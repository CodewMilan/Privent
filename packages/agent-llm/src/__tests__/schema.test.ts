import { describe, expect, it } from "vitest";
import { parseProposal } from "../schema.js";

describe("parseProposal", () => {
  const good = {
    action: "TRANSFER",
    asset: "USDC",
    amount: 320,
    recipient: "0x2222222222222222222222222222222222222222",
    reason: "Exchange listing fee",
  };

  it("accepts a well-formed JSON proposal", () => {
    const result = parseProposal(JSON.stringify(good));
    expect(result).toEqual(good);
  });

  it("strips code fences the way models sometimes wrap output", () => {
    const wrapped = "```json\n" + JSON.stringify(good) + "\n```";
    expect(parseProposal(wrapped)).toEqual(good);
  });

  it("coerces amount strings like \"$1,200\" to numbers", () => {
    const result = parseProposal(
      JSON.stringify({ ...good, amount: "$1,200.00" }),
    );
    expect(result.amount).toBe(1200);
  });

  it("uppercases the asset", () => {
    const result = parseProposal(JSON.stringify({ ...good, asset: "usdc" }));
    expect(result.asset).toBe("USDC");
  });

  it("rejects action other than TRANSFER", () => {
    expect(() =>
      parseProposal(JSON.stringify({ ...good, action: "APPROVE" })),
    ).toThrow(/action must be "TRANSFER"/);
  });

  it("rejects a non-address recipient", () => {
    expect(() =>
      parseProposal(JSON.stringify({ ...good, recipient: "vitalik.eth" })),
    ).toThrow(/recipient must be a 0x-prefixed 20-byte hex address/);
  });

  it("rejects zero or negative amounts", () => {
    expect(() =>
      parseProposal(JSON.stringify({ ...good, amount: 0 })),
    ).toThrow(/amount must be a positive number/);
    expect(() =>
      parseProposal(JSON.stringify({ ...good, amount: -50 })),
    ).toThrow(/amount must be a positive number/);
  });

  it("rejects empty reason", () => {
    expect(() =>
      parseProposal(JSON.stringify({ ...good, reason: "" })),
    ).toThrow(/reason is required/);
  });

  it("rejects non-JSON output", () => {
    expect(() => parseProposal("here you go: send $320")).toThrow(
      /LLM output is not JSON/,
    );
  });

  it("rejects an array", () => {
    expect(() => parseProposal(JSON.stringify([good]))).toThrow(
      /must be a JSON object/,
    );
  });
});

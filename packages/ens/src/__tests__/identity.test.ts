import { describe, expect, it } from "vitest";
import { buildAgentRecords, parseAgentContext } from "../records.js";
import { resolveAgentIdentity } from "../resolve.js";
import { createStaticEnsReader } from "../reader.js";

const input = {
  name: "Acme Treasury Agent",
  ensName: "treasury-agent.company.eth",
  owner: "Acme Finance",
  walletAddress: "0x1111111111111111111111111111111111111111",
  endpoint: "http://localhost:3000",
  allowedAssets: ["USDC", "ETH"],
  approvalThreshold: 500,
  denyThreshold: 2000,
};

describe("ENSIP-26 agent records", () => {
  it("publishes agent-context and a web endpoint", () => {
    const records = buildAgentRecords(input);
    expect(records["agent-endpoint[web]"]).toBe("http://localhost:3000");
    expect(records["agent-context"]).toMatch(/treasury-agent\.company\.eth/);
    expect(records["agent-context"]).toMatch(/never hold a private key/i);
    expect(parseAgentContext(records["agent-context"]).present).toBe(true);
  });

  it("rejects a non-ENS name", () => {
    expect(() =>
      buildAgentRecords({ ...input, ensName: "not-a-name" }),
    ).toThrow(/\.eth/);
  });
});

describe("resolveAgentIdentity", () => {
  it("reads on-chain agent-context when the name resolves", async () => {
    const records = buildAgentRecords(input);
    const resolved = await resolveAgentIdentity(
      "treasury-agent.company.eth",
      createStaticEnsReader({
        "treasury-agent.company.eth": {
          address: "0x1111111111111111111111111111111111111111",
          texts: records,
        },
      }),
    );

    expect(resolved.status).toBe("resolved");
    expect(resolved.address).toMatch(/^0x/);
    expect(resolved.records["agent-context"]).toMatch(/Acme Treasury Agent/);
    expect(resolved.records["agent-endpoint[web]"]).toBe("http://localhost:3000");
  });

  it("marks a missing name instead of inventing records", async () => {
    const resolved = await resolveAgentIdentity(
      "nobody.eth",
      createStaticEnsReader({}),
    );
    expect(resolved.status).toBe("name-not-found");
    expect(resolved.records["agent-context"]).toBeUndefined();
  });
});

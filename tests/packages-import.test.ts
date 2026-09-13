import { describe, expect, it } from "vitest";
import { PACKAGE_NAME as agent } from "@privent/agent";
import { PACKAGE_NAME as arc } from "@privent/arc";
import { PACKAGE_NAME as blockchain } from "@privent/blockchain";
import { PACKAGE_NAME as chainlink } from "@privent/chainlink";
import { PACKAGE_NAME as ens } from "@privent/ens";
import { PACKAGE_NAME as graph } from "@privent/graph";
import { PACKAGE_NAME as ledger } from "@privent/ledger";
import { PACKAGE_NAME as policyEngine } from "@privent/policy-engine";
import { PACKAGE_NAME as privy } from "@privent/privy";

describe("workspace packages", () => {
  it("import without sponsor SDKs", () => {
    expect(agent).toBe("agent");
    expect(policyEngine).toBe("policy-engine");
    expect(blockchain).toBe("blockchain");
    expect(ledger).toBe("ledger");
    expect(privy).toBe("privy");
    expect(ens).toBe("ens");
    expect(graph).toBe("graph");
    expect(chainlink).toBe("chainlink");
    expect(arc).toBe("arc");
  });
});

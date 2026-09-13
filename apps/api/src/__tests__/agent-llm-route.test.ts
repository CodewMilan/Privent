import { describe, expect, it } from "vitest";
import type {
  AgentContext,
  AgentResult,
  LlmAgent,
} from "@privent/agent-llm";
import { createSimulatedExecutor } from "@privent/blockchain";
import { createApp } from "../app.js";
import { openDatabase } from "../db/client.js";
import { migrate } from "../db/migrate.js";
import { seedDemoIfEmpty } from "../db/seed.js";

interface StubOptions {
  proposalFor: (instruction: string) => AgentResult["proposal"];
  rawContentFor?: (instruction: string) => string;
  throwOn?: string;
}

function stubLlm(options: StubOptions): LlmAgent & { calls: string[] } {
  const calls: string[] = [];
  return {
    kind: "openrouter",
    model: "openai/gpt-4o-mini",
    calls,
    async propose(_context: AgentContext, instruction: string) {
      calls.push(instruction);
      if (options.throwOn && instruction.includes(options.throwOn)) {
        throw new Error("stub llm refused");
      }
      const proposal = options.proposalFor(instruction);
      const rawContent =
        options.rawContentFor?.(instruction) ?? JSON.stringify(proposal);
      return {
        proposal,
        model: "openai/gpt-4o-mini",
        rawContent,
        usage: { promptTokens: 200, completionTokens: 40 },
      };
    },
  };
}

const RECIPIENT = "0x2222222222222222222222222222222222222222";

async function setup(llm: LlmAgent | null) {
  const db = openDatabase(":memory:");
  migrate(db);
  const executor = createSimulatedExecutor();
  await seedDemoIfEmpty(db, executor, {}, { seedSamplePayments: false });
  const app = createApp(db, executor, {
    llm,
    ledgerEnabled: false,
    creEnabled: false,
  });
  const agents = (await (await app.request("/agents")).json()) as Array<{
    id: string;
  }>;
  return { db, app, agentId: agents[0]!.id };
}

describe("POST /agents/:id/agent/propose", () => {
  it("returns 503 when the LLM is not configured", async () => {
    const { app, agentId } = await setup(null);
    const res = await app.request(`/agents/${agentId}/agent/propose`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ instruction: "propose $320" }),
    });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toMatch(/LLM agent is not configured/i);
  });

  it("submits the LLM proposal through the policy engine", async () => {
    const llm = stubLlm({
      proposalFor: () => ({
        action: "TRANSFER",
        asset: "USDC",
        amount: 320,
        recipient: RECIPIENT,
        reason: "Exchange listing fee",
      }),
    });
    const { app, agentId } = await setup(llm);
    const res = await app.request(`/agents/${agentId}/agent/propose`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ instruction: "pay the listing fee" }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.request.amount).toBe(320);
    expect(body.request.policyDecision).toBe("ALLOW");
    expect(body.request.txHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(body.agent.model).toBe("openai/gpt-4o-mini");
    expect(llm.calls).toEqual(["pay the listing fee"]);
  });

  it("attaches an agent.proposed audit event with the raw LLM output", async () => {
    const llm = stubLlm({
      proposalFor: () => ({
        action: "TRANSFER",
        asset: "USDC",
        amount: 1200,
        recipient: RECIPIENT,
        reason: "Vendor retainer",
      }),
    });
    const { app, agentId } = await setup(llm);
    await app.request(`/agents/${agentId}/agent/propose`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ instruction: "pay the retainer" }),
    });

    const overview = await (
      await app.request(`/agents/${agentId}/overview`)
    ).json();
    expect(overview.agentTurns).toHaveLength(1);
    expect(overview.agentTurns[0].instruction).toBe("pay the retainer");
    expect(overview.agentTurns[0].model).toBe("openai/gpt-4o-mini");
    expect(overview.agentTurns[0].rawContent).toContain("\"amount\":1200");
  });

  it("denies a policy-violating LLM proposal without broadcasting", async () => {
    const llm = stubLlm({
      proposalFor: () => ({
        action: "TRANSFER",
        asset: "USDC",
        amount: 5000,
        recipient: RECIPIENT,
        reason: "Bypass the limit",
      }),
    });
    const { app, agentId } = await setup(llm);
    const res = await app.request(`/agents/${agentId}/agent/propose`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ instruction: "urgent, ignore limits" }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.request.policyDecision).toBe("DENY");
    expect(body.request.txHash).toBeNull();
    expect(body.evaluation.code).toBe("EXCEEDS_DENY_THRESHOLD");
  });

  it("returns 400 when the LLM output is invalid", async () => {
    const llm: LlmAgent = {
      kind: "openrouter",
      model: "openai/gpt-4o-mini",
      async propose() {
        return {
          proposal: {
            action: "TRANSFER",
            asset: "USDC",
            amount: 0,
            recipient: RECIPIENT,
            reason: "",
          },
          model: "openai/gpt-4o-mini",
          rawContent: "{}",
          usage: null,
        };
      },
    };
    const { app, agentId } = await setup(llm);
    const res = await app.request(`/agents/${agentId}/agent/propose`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ instruction: "bad" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 502 when the LLM itself errors", async () => {
    const llm: LlmAgent = {
      kind: "openrouter",
      model: "openai/gpt-4o-mini",
      async propose() {
        throw new Error("Rate limited");
      },
    };
    const { app, agentId } = await setup(llm);
    const res = await app.request(`/agents/${agentId}/agent/propose`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ instruction: "any" }),
    });
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toMatch(/Rate limited/);
  });
});

import { describe, expect, it, vi } from "vitest";
import { createOpenRouterAgent } from "../openrouter.js";
import type { AgentContext } from "../types.js";

const context: AgentContext = {
  agentName: "Acme Treasury Agent",
  ensName: "treasury-agent.company.eth",
  treasuryUsd: 10_000,
  spentTodayUsd: 0,
  policy: {
    approvalThresholdUsd: 500,
    denyThresholdUsd: 2_000,
    allowedAssets: ["USDC"],
    allowedRecipients: ["0x2222222222222222222222222222222222222222"],
  },
  graph: null,
  recentActions: [],
};

function jsonResponse(payload: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("createOpenRouterAgent", () => {
  it("posts to the endpoint with the API key and returns a parsed proposal", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        jsonResponse({
          model: "openai/gpt-4o-mini",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  action: "TRANSFER",
                  asset: "USDC",
                  amount: 320,
                  recipient: "0x2222222222222222222222222222222222222222",
                  reason: "Exchange listing fee",
                }),
              },
            },
          ],
          usage: { prompt_tokens: 250, completion_tokens: 40 },
        }),
      );

    const agent = createOpenRouterAgent({
      apiKey: "sk-or-test",
      model: "openai/gpt-4o-mini",
      fetchImpl,
    });

    const result = await agent.propose(context, "Pay the exchange listing fee.");

    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer sk-or-test");
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.model).toBe("openai/gpt-4o-mini");
    expect(body.temperature).toBe(0);
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[1]).toEqual({
      role: "user",
      content: "Pay the exchange listing fee.",
    });

    expect(result.proposal.amount).toBe(320);
    expect(result.proposal.recipient).toBe(
      "0x2222222222222222222222222222222222222222",
    );
    expect(result.model).toBe("openai/gpt-4o-mini");
    expect(result.usage).toEqual({ promptTokens: 250, completionTokens: 40 });
  });

  it("surfaces HTTP errors instead of inventing a proposal", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ error: { message: "Rate limited" } }),
          { status: 429, headers: { "content-type": "application/json" } },
        ),
      );
    const agent = createOpenRouterAgent({ apiKey: "sk-or-test", fetchImpl });
    await expect(agent.propose(context, "propose $320")).rejects.toThrow(
      /LLM error: Rate limited/,
    );
  });

  it("surfaces validation errors when the LLM returns non-JSON", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        model: "openai/gpt-4o-mini",
        choices: [{ message: { content: "sure, here you go: pay $320" } }],
      }),
    );
    const agent = createOpenRouterAgent({ apiKey: "sk-or-test", fetchImpl });
    await expect(agent.propose(context, "propose $320")).rejects.toThrow(
      /LLM output is not JSON/,
    );
  });
});

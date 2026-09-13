import { buildSystemPrompt } from "./prompt.js";
import { parseProposal } from "./schema.js";
import type { AgentContext, AgentResult, LlmAgent } from "./types.js";

export interface OpenRouterOptions {
  apiKey: string;
  model?: string;
  endpoint?: string;
  referer?: string;
  title?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

interface OpenRouterResponse {
  model?: string;
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  error?: { message?: string };
}

const DEFAULT_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-4o-mini";

/**
 * OpenRouter is OpenAI-compatible. We use temperature 0 and JSON response
 * mode. Even so, the returned content is treated as untrusted — parseProposal
 * is the only thing that decides whether the LLM output becomes an action.
 */
export function createOpenRouterAgent(options: OpenRouterOptions): LlmAgent {
  const endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
  const model = options.model ?? DEFAULT_MODEL;
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 20_000;

  return {
    kind: "openrouter",
    model,
    async propose(
      context: AgentContext,
      instruction: string,
    ): Promise<AgentResult> {
      const body = {
        model,
        temperature: 0,
        response_format: { type: "json_object" as const },
        messages: [
          { role: "system", content: buildSystemPrompt(context) },
          { role: "user", content: instruction },
        ],
      };

      const headers: Record<string, string> = {
        authorization: `Bearer ${options.apiKey}`,
        "content-type": "application/json",
      };
      if (options.referer) headers["HTTP-Referer"] = options.referer;
      if (options.title) headers["X-Title"] = options.title;

      let response: Response;
      try {
        response = await fetchImpl(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "LLM request failed";
        throw new Error(`LLM request failed: ${message}`);
      }

      let payload: OpenRouterResponse;
      try {
        payload = (await response.json()) as OpenRouterResponse;
      } catch {
        throw new Error(`LLM returned non-JSON HTTP body (${response.status})`);
      }

      if (!response.ok) {
        const message = payload.error?.message ?? `HTTP ${response.status}`;
        throw new Error(`LLM error: ${message}`);
      }

      const content = payload.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) {
        throw new Error("LLM returned no content");
      }

      const proposal = parseProposal(content);

      return {
        proposal,
        model: payload.model ?? model,
        rawContent: content,
        usage: payload.usage
          ? {
              promptTokens: payload.usage.prompt_tokens ?? null,
              completionTokens: payload.usage.completion_tokens ?? null,
            }
          : null,
      };
    },
  };
}

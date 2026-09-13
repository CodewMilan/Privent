import { createOpenRouterAgent } from "./openrouter.js";
import type { LlmAgent } from "./types.js";

/**
 * Production factory. Tests never call this — they inject a stub agent
 * so a leftover LLM_API_KEY cannot hit OpenRouter mid-suite.
 *
 * Returns null when the key is missing. The API surfaces that as a
 * clear "LLM not configured" error instead of pretending.
 */
export function createLlmAgentFromEnv(): LlmAgent | null {
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return null;
  }

  const apiKey = process.env.LLM_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const model = process.env.LLM_MODEL?.trim() || undefined;
  const endpoint = process.env.LLM_ENDPOINT?.trim() || undefined;
  const referer = process.env.LLM_REFERER?.trim() || "http://localhost:3000";
  const title = process.env.LLM_TITLE?.trim() || "Privent Treasury Agent";

  return createOpenRouterAgent({
    apiKey,
    model,
    endpoint,
    referer,
    title,
  });
}

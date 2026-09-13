import type { AgentProposal } from "./types.js";

const ADDRESS = /^0x[a-fA-F0-9]{40}$/;

function stripCodeFences(input: string): string {
  const trimmed = input.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  const withoutOpen = trimmed.replace(/^```[a-zA-Z]*\r?\n?/, "");
  const closeIndex = withoutOpen.lastIndexOf("```");
  return (closeIndex >= 0 ? withoutOpen.slice(0, closeIndex) : withoutOpen).trim();
}

function coerceAmount(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.-]/g, "");
    if (!cleaned) return NaN;
    return Number(cleaned);
  }
  return NaN;
}

/**
 * Parse and validate a single JSON action request from an LLM.
 *
 * The LLM is not trusted. It cannot pick fields we don't allow, it cannot
 * skip the recipient check, and it cannot smuggle a signature or hash.
 * Anything the policy engine will later care about is bounded here first.
 */
export function parseProposal(raw: string): AgentProposal {
  const cleaned = stripCodeFences(raw);
  if (!cleaned) {
    throw new Error("LLM returned empty output");
  }

  let obj: unknown;
  try {
    obj = JSON.parse(cleaned);
  } catch {
    throw new Error(
      `LLM output is not JSON: ${cleaned.slice(0, 200)}${cleaned.length > 200 ? "…" : ""}`,
    );
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    throw new Error("LLM output must be a JSON object");
  }
  const record = obj as Record<string, unknown>;

  if (record.action !== "TRANSFER") {
    throw new Error(
      `action must be "TRANSFER", got ${JSON.stringify(record.action)}`,
    );
  }
  const action: AgentProposal["action"] = "TRANSFER";

  const asset =
    typeof record.asset === "string" ? record.asset.trim().toUpperCase() : "";
  if (!asset) {
    throw new Error("asset is required");
  }

  const amount = coerceAmount(record.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("amount must be a positive number");
  }

  const recipient =
    typeof record.recipient === "string" ? record.recipient.trim() : "";
  if (!ADDRESS.test(recipient)) {
    throw new Error(
      "recipient must be a 0x-prefixed 20-byte hex address",
    );
  }

  const reason = typeof record.reason === "string" ? record.reason.trim() : "";
  if (!reason) {
    throw new Error("reason is required");
  }

  return { action, asset, amount, recipient, reason };
}

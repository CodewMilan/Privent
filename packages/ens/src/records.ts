import type { AgentIdentityInput, AgentTextRecords } from "./types.js";

const ENDPOINT_URL = /^https?:\/\//i;

/**
 * Build the ENSIP-26 text records that identify this treasury agent.
 * `agent-context` is the entry point; `agent-endpoint[web]` is how
 * humans reach the dashboard.
 */
export function buildAgentRecords(input: AgentIdentityInput): AgentTextRecords {
  const ensName = input.ensName.trim().toLowerCase();
  if (!ensName.endsWith(".eth")) {
    throw new Error("ensName must be a .eth name");
  }
  if (!ENDPOINT_URL.test(input.endpoint)) {
    throw new Error("endpoint must be an http(s) URL");
  }

  const context = [
    `# ${input.name}`,
    "",
    "I am a bounded treasury agent. I propose payments. A deterministic policy engine decides ALLOW / REQUIRE_APPROVAL / DENY. I never hold a private key.",
    "",
    `- ENS: ${ensName}`,
    `- Owner: ${input.owner ?? "unassigned"}`,
    `- Wallet: ${input.walletAddress ?? "unassigned"}`,
    `- Auto-execute under $${input.approvalThreshold.toLocaleString("en-US")}`,
    `- Denied over $${input.denyThreshold.toLocaleString("en-US")}`,
    `- Assets: ${input.allowedAssets.join(", ") || "none"}`,
    `- Dashboard: see agent-endpoint[web]`,
  ].join("\n");

  return {
    "agent-context": context,
    "agent-endpoint[web]": input.endpoint.replace(/\/$/, ""),
  };
}

export function parseAgentContext(value: string | null): {
  present: boolean;
  text: string | null;
} {
  if (!value || !value.trim()) {
    return { present: false, text: null };
  }
  return { present: true, text: value.trim() };
}

export function isAgentEndpoint(value: string | null): boolean {
  return Boolean(value && ENDPOINT_URL.test(value));
}

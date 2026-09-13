import type { EnsReader, ResolvedAgentIdentity } from "./types.js";
import { isAgentEndpoint, parseAgentContext } from "./records.js";

export async function resolveAgentIdentity(
  name: string,
  reader: EnsReader,
): Promise<ResolvedAgentIdentity> {
  const ensName = name.trim().toLowerCase();

  try {
    const address = await reader.getEnsAddress(ensName);
    if (!address) {
      return {
        name: ensName,
        address: null,
        records: {},
        status: "name-not-found",
        error: null,
      };
    }

    const context = await reader.getEnsText(ensName, "agent-context");
    const endpoint = await reader.getEnsText(ensName, "agent-endpoint[web]");
    const parsed = parseAgentContext(context);

    return {
      name: ensName,
      address,
      records: {
        ...(parsed.text ? { "agent-context": parsed.text } : {}),
        ...(isAgentEndpoint(endpoint)
          ? { "agent-endpoint[web]": endpoint as string }
          : {}),
      },
      status: parsed.present ? "resolved" : "no-agent-context",
      error: null,
    };
  } catch (error) {
    return {
      name: ensName,
      address: null,
      records: {},
      status: "error",
      error: error instanceof Error ? error.message : "ENS lookup failed",
    };
  }
}

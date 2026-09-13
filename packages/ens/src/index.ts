export const PACKAGE_NAME = "ens" as const;

export { parseAgentContext, buildAgentRecords, isAgentEndpoint } from "./records.js";
export { resolveAgentIdentity } from "./resolve.js";
export { createStaticEnsReader, createViemEnsReader } from "./reader.js";

export type {
  AgentIdentityInput,
  AgentTextRecords,
  EnsReader,
  ResolvedAgentIdentity,
} from "./types.js";

export interface AgentIdentityInput {
  name: string;
  ensName: string;
  owner: string | null;
  walletAddress: string | null;
  endpoint: string;
  allowedAssets: string[];
  approvalThreshold: number;
  denyThreshold: number;
}

export interface AgentTextRecords {
  "agent-context": string;
  "agent-endpoint[web]": string;
}

export interface ResolvedAgentIdentity {
  name: string;
  address: string | null;
  records: Partial<AgentTextRecords>;
  status: "resolved" | "name-not-found" | "no-agent-context" | "error";
  error: string | null;
}

export interface EnsReader {
  getEnsAddress(name: string): Promise<string | null>;
  getEnsText(name: string, key: string): Promise<string | null>;
}

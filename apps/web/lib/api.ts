import type { PermissionRow } from "@privent/shared";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface PresentedAgent {
  id: string;
  name: string;
  ensName: string | null;
  walletAddress: string | null;
  status: "active" | "paused";
  owner: string | null;
  treasury: number;
  spentToday: number;
  policy: {
    dailyLimit: number;
    perTransactionLimit: number;
    approvalThreshold: number;
    denyThreshold: number;
    allowedAssets: string[];
    allowedContracts: string[];
    allowedRecipients: string[];
  };
}

export interface PresentedAction {
  id: string;
  agentId: string;
  action: string;
  asset: string;
  amount: number;
  recipient: string | null;
  reason: string;
  policyDecision: "ALLOW" | "DENY" | "REQUIRE_APPROVAL" | null;
  policyReason: string | null;
  approvalStatus: "pending" | "approved" | "rejected" | null;
  decidedBy: string | null;
  txHash: string | null;
  txStatus: "pending" | "broadcast" | "confirmed" | "failed" | null;
  txMode: "simulated" | "testnet" | "arc" | null;
  txError: string | null;
  ledgerStatus: "not_required" | "pending" | "confirmed" | "rejected" | null;
  ledgerDevice: "simulated" | "cli" | null;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}

export interface AgentTurn {
  id: string;
  actionRequestId: string | null;
  instruction: string | null;
  model: string | null;
  rawContent: string | null;
  createdAt: string;
}

export interface Overview {
  agent: PresentedAgent;
  signer: {
    mode: "simulated" | "testnet";
    fromAddress: string;
    highRisk: "simulated" | "cli";
  };
  confidential: {
    tee: string;
    simulated: boolean;
  };
  market: {
    status: "ok" | "unconfigured" | "error";
    simulated: boolean;
    protocol: string;
    pair: string;
    pool: string;
    tvlUsd: number | null;
    volume24hUsd: number | null;
    previousVolumeUsd: number | null;
    ethPriceUsd: number | null;
    asOf: string;
    source: string;
    error: string | null;
  };
  payments: {
    rail: "arc";
    kind: "simulated" | "circle";
    simulated: boolean;
    briefCents: number;
  };
  demo: {
    ledgerEnabled: boolean;
    creEnabled: boolean;
    arcEnabled: boolean;
    llm: {
      enabled: boolean;
      kind: "openrouter" | "canned" | null;
      model: string | null;
    };
  };
  agentTurns: AgentTurn[];
  identity: {
    ensName: string | null;
    published: {
      "agent-context"?: string;
      "agent-endpoint[web]"?: string;
    } | null;
    onChain: {
      status: string;
      address: string | null;
    } | null;
    agreement:
      | "no-ens"
      | "unpublished"
      | "name-not-found"
      | "match"
      | "mismatch"
      | "error"
      | "timeout";
  };
  wallet: {
    maxAuto: number;
    maxSend: number;
    allowedRecipients: string[];
    exportPrivateKey: boolean;
    privyPolicyId: string | null;
  };
  effective: {
    approvalThreshold: number;
    denyThreshold: number;
    allowedAssets: string[];
    allowedRecipients: string[];
  };
  permissions: PermissionRow[];
  pendingApprovals: PresentedAction[];
  waitingForLedger: PresentedAction[];
  activity: PresentedAction[];
  audit: AuditEvent[];
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? `API returned ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function fetchOverview(): Promise<Overview> {
  const agents = await readJson<Array<{ id: string }>>(
    await fetch(`${API_URL}/agents`),
  );
  const agent = agents[0];
  if (!agent) {
    throw new Error("No agent found. Start the API so it can seed the demo.");
  }

  return readJson<Overview>(await fetch(`${API_URL}/agents/${agent.id}/overview`));
}

export async function askAgent(
  agentId: string,
  instruction: string,
): Promise<void> {
  await readJson(
    await fetch(`${API_URL}/agents/${agentId}/agent/propose`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-actor-type": "human",
        "x-actor-id": "acme-cfo",
      },
      body: JSON.stringify({ instruction }),
    }),
  );
}

export async function proposePayment(
  agentId: string,
  input: { amount: number; recipient: string; reason: string },
): Promise<void> {
  await readJson(
    await fetch(`${API_URL}/agents/${agentId}/actions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "TRANSFER",
        asset: "USDC",
        amount: input.amount,
        recipient: input.recipient,
        reason: input.reason,
      }),
    }),
  );
}

export async function confirmLedger(
  agentId: string,
  actionId: string,
  status: "confirmed" | "rejected",
): Promise<void> {
  await readJson(
    await fetch(`${API_URL}/agents/${agentId}/actions/${actionId}/ledger`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-actor-type": "human",
        "x-actor-id": "acme-cfo",
      },
      body: JSON.stringify({ status }),
    }),
  );
}

export async function decideAction(
  agentId: string,
  actionId: string,
  status: "approved" | "rejected",
): Promise<void> {
  await readJson(
    await fetch(`${API_URL}/agents/${agentId}/actions/${actionId}/decision`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-actor-type": "human",
        "x-actor-id": "acme-cfo",
      },
      body: JSON.stringify({ status }),
    }),
  );
}

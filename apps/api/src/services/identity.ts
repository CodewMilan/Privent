import {
  buildAgentRecords,
  resolveAgentIdentity,
  type AgentTextRecords,
  type EnsReader,
  type ResolvedAgentIdentity,
} from "@privent/ens";
import { centsToDollars, type Agent } from "@privent/shared";

export type IdentityAgreement =
  | "no-ens"
  | "unpublished"
  | "name-not-found"
  | "match"
  | "mismatch"
  | "error"
  | "timeout";

export interface AgentIdentityView {
  ensName: string | null;
  published: AgentTextRecords | null;
  onChain: ResolvedAgentIdentity | null;
  agreement: IdentityAgreement;
}

export async function describeIdentity(
  agent: Agent,
  dashboardUrl: string,
  reader?: EnsReader,
): Promise<AgentIdentityView> {
  const ensName = agent.ensName?.trim().toLowerCase() || null;
  if (!ensName) {
    return {
      ensName: null,
      published: null,
      onChain: null,
      agreement: "no-ens",
    };
  }

  let published: AgentTextRecords | null = null;
  try {
    published = buildAgentRecords({
      name: agent.name,
      ensName,
      owner: agent.owner,
      walletAddress: agent.walletAddress,
      endpoint: dashboardUrl,
      allowedAssets: agent.policy.allowedAssets,
      approvalThreshold: centsToDollars(agent.policy.approvalThresholdCents),
      denyThreshold: centsToDollars(agent.policy.denyThresholdCents),
    });
  } catch {
    published = null;
  }

  let onChain: ResolvedAgentIdentity | null = null;
  let timedOut = false;
  if (reader) {
    const result = await withTimeout(resolveAgentIdentity(ensName, reader), 4_000);
    if (result === "__timeout__") {
      timedOut = true;
    } else {
      onChain = result;
    }
  }

  return {
    ensName,
    published,
    onChain,
    agreement: timedOut ? "timeout" : agreementOf(published, onChain),
  };
}

const TIMEOUT_SENTINEL = "__timeout__" as const;

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T | typeof TIMEOUT_SENTINEL> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  void promise.catch(() => undefined);
  try {
    return await Promise.race<T | typeof TIMEOUT_SENTINEL>([
      promise,
      new Promise<typeof TIMEOUT_SENTINEL>((resolve) => {
        timer = setTimeout(() => resolve(TIMEOUT_SENTINEL), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function agreementOf(
  published: AgentTextRecords | null,
  onChain: ResolvedAgentIdentity | null,
): IdentityAgreement {
  if (!published) return "no-ens";
  if (!onChain) return "unpublished";
  if (onChain.status === "error") return "error";
  if (onChain.status === "name-not-found") return "name-not-found";
  if (onChain.status === "no-agent-context") return "unpublished";
  if (onChain.status === "resolved") {
    const sameContext =
      onChain.records["agent-context"] === published["agent-context"];
    const sameEndpoint =
      onChain.records["agent-endpoint[web]"] ===
      published["agent-endpoint[web]"];
    return sameContext && sameEndpoint ? "match" : "mismatch";
  }
  return "unpublished";
}

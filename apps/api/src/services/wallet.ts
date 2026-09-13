import {
  tightenWallet,
  toPrivyPolicyBody,
  walletPolicyFromApp,
  type PrivyClient,
  type WalletPolicy,
} from "@privent/privy";
import type { Agent } from "@privent/shared";
import type { AppDatabase } from "../db/client.js";
import { listAgents, updateAgentPolicy } from "../repos/agents.js";
import { writeAudit } from "../repos/audit.js";
import {
  getControls,
  setPrivyPolicyId,
  upsertControls,
  type StoredWalletControls,
} from "../repos/controls.js";

const DEFAULT_CHAIN_ID = 11155111;
const DEMO_ENS = "treasury-agent.company.eth";
const DEMO_RECIPIENT = "0x2222222222222222222222222222222222222222";

export function getOrCreateControls(
  db: AppDatabase,
  agent: Agent,
  chainId = DEFAULT_CHAIN_ID,
): StoredWalletControls {
  const existing = getControls(db, agent.id);
  if (existing) return existing;
  return upsertControls(db, agent.id, walletPolicyFromApp(agent.policy, chainId));
}

export function ensureAgentControls(
  db: AppDatabase,
  chainId = DEFAULT_CHAIN_ID,
): void {
  for (const agent of listAgents(db)) {
    const wallet = getOrCreateControls(db, agent, chainId);
    if (
      agent.ensName === DEMO_ENS &&
      wallet.allowedRecipients.length === 0
    ) {
      upsertControls(db, agent.id, {
        ...wallet,
        allowedRecipients: [DEMO_RECIPIENT],
      });
    }
    if (
      agent.ensName === DEMO_ENS &&
      agent.policy.allowedRecipients.length === 0
    ) {
      updateAgentPolicy(db, agent.id, {
        ...agent.policy,
        allowedRecipients: [DEMO_RECIPIENT],
      });
    }
  }
}

export function syncControlsToApp(
  db: AppDatabase,
  agent: Agent,
  chainId = DEFAULT_CHAIN_ID,
): StoredWalletControls {
  const fromApp = walletPolicyFromApp(agent.policy, chainId);
  const existing = getControls(db, agent.id);
  if (!existing) {
    return upsertControls(db, agent.id, fromApp);
  }
  return upsertControls(db, agent.id, tightenWallet(existing, fromApp));
}

export async function publishPrivyPolicy(
  db: AppDatabase,
  agent: Agent,
  wallet: WalletPolicy,
  client: PrivyClient,
): Promise<string | null> {
  try {
    const created = await client.createPolicy(
      toPrivyPolicyBody(`privent-${agent.id}`, wallet),
    );
    setPrivyPolicyId(db, agent.id, created.id);
    writeAudit(db, {
      agentId: agent.id,
      type: "wallet.policy_synced",
      message: "Wallet policy published to Privy",
      metadata: { privyPolicyId: created.id },
    });
    return created.id;
  } catch (error) {
    writeAudit(db, {
      agentId: agent.id,
      type: "wallet.policy_sync_failed",
      message:
        error instanceof Error
          ? error.message
          : "Privy policy create failed",
    });
    return null;
  }
}

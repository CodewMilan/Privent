import { createAgent, proposeAction } from "@privent/agent";
import type { Executor } from "@privent/blockchain";
import { walletPolicyFromApp } from "@privent/privy";
import type { AppServices } from "../app.js";
import type { AppDatabase } from "./client.js";
import { insertAgent, listAgents } from "../repos/agents.js";
import { writeAudit } from "../repos/audit.js";
import { upsertControls } from "../repos/controls.js";
import { submitAction } from "../services/execute.js";
import { publishPrivyPolicy } from "../services/wallet.js";

const DEMO_RECIPIENT = "0x2222222222222222222222222222222222222222";

const DEMO = {
  name: "Acme Treasury Agent",
  ensName: "treasury-agent.company.eth",
  walletAddress: "0x1111111111111111111111111111111111111111",
  dailyLimit: 10_000,
  perTransactionLimit: 2_000,
  approvalThreshold: 500,
  denyThreshold: 2_000,
  allowedAssets: ["USDC", "ETH"],
  allowedRecipients: [DEMO_RECIPIENT],
  owner: "Acme Finance",
};

const SAMPLE_PAYMENTS = [
  { amount: 320, reason: "Exchange listing fee" },
  { amount: 1200, reason: "Vendor retainer" },
  { amount: 5000, reason: "Attempted oversized transfer" },
];

export async function seedDemoIfEmpty(
  db: AppDatabase,
  executor: Executor,
  services: AppServices = {},
): Promise<void> {
  if (listAgents(db).length > 0) {
    return;
  }

  const chainId = services.chainId ?? 11155111;
  const agent = insertAgent(db, createAgent(DEMO));
  const wallet = walletPolicyFromApp(agent.policy, chainId);
  upsertControls(db, agent.id, wallet);
  writeAudit(db, {
    agentId: agent.id,
    type: "agent.created",
    message: `Agent ${agent.name} created`,
  });

  if (services.privy) {
    await publishPrivyPolicy(db, agent, wallet, services.privy);
  }

  for (const sample of SAMPLE_PAYMENTS) {
    await submitAction(
      db,
      executor,
      agent,
      proposeAction({
        action: "TRANSFER",
        asset: "USDC",
        amount: sample.amount,
        recipient: DEMO_RECIPIENT,
        reason: sample.reason,
      }),
    );
  }
}

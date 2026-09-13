import { createAgent, proposeAction } from "@privent/agent";
import type { Executor } from "@privent/blockchain";
import type { AppDatabase } from "./client.js";
import { insertAgent, listAgents } from "../repos/agents.js";
import { writeAudit } from "../repos/audit.js";
import { submitAction } from "../services/execute.js";

const DEMO = {
  name: "Acme Treasury Agent",
  ensName: "treasury-agent.company.eth",
  walletAddress: "0x1111111111111111111111111111111111111111",
  dailyLimit: 10_000,
  perTransactionLimit: 2_000,
  approvalThreshold: 500,
  denyThreshold: 2_000,
  allowedAssets: ["USDC", "ETH"],
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
): Promise<void> {
  if (listAgents(db).length > 0) {
    return;
  }

  const agent = insertAgent(db, createAgent(DEMO));
  writeAudit(db, {
    agentId: agent.id,
    type: "agent.created",
    message: `Agent ${agent.name} created`,
  });

  for (const sample of SAMPLE_PAYMENTS) {
    await submitAction(
      db,
      executor,
      agent,
      proposeAction({
        action: "TRANSFER",
        asset: "USDC",
        amount: sample.amount,
        recipient: "0x2222222222222222222222222222222222222222",
        reason: sample.reason,
      }),
    );
  }
}

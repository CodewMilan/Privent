import { createAgent, proposeAction } from "@privent/agent";
import { evaluateAction } from "@privent/policy-engine";
import type { AppDatabase } from "./client.js";
import { insertActionRequest } from "../repos/actions.js";
import { insertAgent, listAgents } from "../repos/agents.js";
import { insertPendingApproval } from "../repos/approvals.js";
import { writeAudit } from "../repos/audit.js";

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

export function seedDemoIfEmpty(db: AppDatabase): void {
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
    const proposed = proposeAction({
      action: "TRANSFER",
      asset: "USDC",
      amount: sample.amount,
      recipient: "0x2222222222222222222222222222222222222222",
      reason: sample.reason,
    });
    const evaluation = evaluateAction(proposed, agent.policy, {
      spentTodayCents: 0,
      agentStatus: agent.status,
    });
    const request = insertActionRequest(db, agent.id, proposed, evaluation);
    if (evaluation.decision === "REQUIRE_APPROVAL") {
      insertPendingApproval(db, request.id);
    }
    writeAudit(db, {
      agentId: agent.id,
      actionRequestId: request.id,
      type: "policy.evaluated",
      message: `Policy evaluation → ${evaluation.decision}`,
      metadata: { code: evaluation.code, reason: evaluation.reason },
    });
  }
}

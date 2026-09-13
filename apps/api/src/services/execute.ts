import {
  authorizeExecution,
  type ExecutionPermit,
  type Executor,
} from "@privent/blockchain";
import { evaluateAction } from "@privent/policy-engine";
import {
  combineEvaluations,
  evaluateWalletPolicy,
} from "@privent/privy";
import {
  formatDollars,
  type ActionRequest,
  type Agent,
  type ApprovalStatus,
  type ChainTransaction,
  type PolicyEvaluation,
  type ProposedAction,
} from "@privent/shared";
import type { AppDatabase } from "../db/client.js";
import { insertActionRequest, spentTodayCents } from "../repos/actions.js";
import { insertPendingApproval } from "../repos/approvals.js";
import { writeAudit } from "../repos/audit.js";
import {
  getTransactionByAction,
  insertTransaction,
} from "../repos/transactions.js";
import { getOrCreateControls } from "./wallet.js";

function permitFor(
  request: ActionRequest,
  approvalStatus: ApprovalStatus | null,
): ExecutionPermit {
  return {
    transfer: {
      actionRequestId: request.id,
      to: request.recipient ?? "",
      amountCents: request.amountCents,
      asset: request.asset,
      reason: request.reason,
    },
    policyDecision: request.policyDecision,
    approvalStatus,
  };
}

function proposedFrom(request: ActionRequest): ProposedAction {
  return {
    action: request.action,
    asset: request.asset,
    amountCents: request.amountCents,
    recipient: request.recipient,
    contract: request.contract,
    reason: request.reason,
  };
}

export async function executeAuthorized(
  db: AppDatabase,
  executor: Executor,
  agent: Agent,
  request: ActionRequest,
  approvalStatus: ApprovalStatus | null,
): Promise<ChainTransaction | null> {
  const existing = getTransactionByAction(db, request.id);
  if (existing) {
    return existing;
  }

  const wallet = getOrCreateControls(db, agent);
  const walletGate = evaluateWalletPolicy(proposedFrom(request), wallet, {
    humanApproved: approvalStatus === "approved",
  });
  if (walletGate.decision === "DENY") {
    writeAudit(db, {
      agentId: agent.id,
      actionRequestId: request.id,
      type: "wallet.denied",
      message: walletGate.reason,
      metadata: { code: walletGate.code },
    });
    return null;
  }

  const permit = permitFor(request, approvalStatus);
  const authorized = authorizeExecution(permit);
  if (!authorized.ok) {
    writeAudit(db, {
      agentId: agent.id,
      actionRequestId: request.id,
      type: "execution.blocked",
      message: authorized.reason,
      metadata: { code: authorized.code },
    });
    return null;
  }

  writeAudit(db, {
    agentId: agent.id,
    actionRequestId: request.id,
    type: "signer.requested",
    message: "Handing authorized action to the signer",
  });

  const result = await executor.send(permit);
  const tx = insertTransaction(db, request.id, result);

  if (result.hash) {
    writeAudit(db, {
      agentId: agent.id,
      actionRequestId: request.id,
      type:
        result.status === "confirmed"
          ? "transaction.confirmed"
          : "transaction.broadcast",
      message:
        result.status === "confirmed"
          ? "Transaction confirmed"
          : "Transaction broadcast",
      metadata: {
        hash: result.hash,
        mode: result.mode,
        from: result.fromAddress,
        to: result.toAddress,
      },
    });
  } else {
    writeAudit(db, {
      agentId: agent.id,
      actionRequestId: request.id,
      type: "transaction.failed",
      message: result.error ?? "Transaction failed",
      metadata: { mode: result.mode },
    });
  }

  return tx;
}

export async function submitAction(
  db: AppDatabase,
  executor: Executor,
  agent: Agent,
  proposed: ProposedAction,
): Promise<{ request: ActionRequest; evaluation: PolicyEvaluation }> {
  const appEval = evaluateAction(proposed, agent.policy, {
    spentTodayCents: spentTodayCents(db, agent.id),
    agentStatus: agent.status,
  });
  const wallet = getOrCreateControls(db, agent);
  const walletEval = evaluateWalletPolicy(proposed, wallet, {
    humanApproved: false,
  });
  const evaluation = combineEvaluations(appEval, walletEval);

  const request = insertActionRequest(db, agent.id, proposed, evaluation);

  writeAudit(db, {
    agentId: agent.id,
    actionRequestId: request.id,
    type: "action.requested",
    message: `Agent requested ${formatDollars(request.amountCents)} ${request.asset}`,
  });
  writeAudit(db, {
    agentId: agent.id,
    actionRequestId: request.id,
    type: "policy.evaluated",
    message: `Policy evaluation → ${evaluation.decision}`,
    metadata: { code: evaluation.code, reason: evaluation.reason },
  });
  writeAudit(db, {
    agentId: agent.id,
    actionRequestId: request.id,
    type: "wallet.evaluated",
    message: `Wallet policy → ${walletEval.decision}`,
    metadata: { code: walletEval.code, reason: walletEval.reason },
  });

  if (evaluation.decision === "REQUIRE_APPROVAL") {
    insertPendingApproval(db, request.id);
    writeAudit(db, {
      agentId: agent.id,
      actionRequestId: request.id,
      type: "approval.requested",
      message: "Human approval requested",
    });
  } else if (evaluation.decision === "DENY") {
    writeAudit(db, {
      agentId: agent.id,
      actionRequestId: request.id,
      type: "execution.skipped",
      message:
        evaluation.code === "WALLET_POLICY_DENIED"
          ? "Denied by wallet policy — never reached the signer"
          : "Denied by policy — never reached the signer",
    });
  } else {
    await executeAuthorized(db, executor, agent, request, null);
  }

  return { request, evaluation };
}

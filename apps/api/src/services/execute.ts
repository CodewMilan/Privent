import {
  createSimulatedArcPayer,
  modeFromReceipt,
  PROTOCOL_BRIEF,
  type ArcPayer,
} from "@privent/arc";
import {
  authorizeExecution,
  type ExecutionPermit,
  type ExecutionResult,
  type Executor,
} from "@privent/blockchain";
import {
  DEMO_PRIVATE_STRATEGY,
  assertNoPrivateLeak,
  runTreasuryRiskWorkflow,
  type PrivateStrategy,
} from "@privent/chainlink";
import {
  createStaticGraphClient,
  evaluateProtocolPulse,
  HEALTHY_DEMO_PULSE,
  type GraphClient,
} from "@privent/graph";
import { createSimulatedLedger, type LedgerSigner } from "@privent/ledger";
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
  getDeviceConfirmation,
  insertPendingDevice,
} from "../repos/device.js";
import {
  getTransactionByAction,
  insertTransaction,
} from "../repos/transactions.js";
import { getOrCreateControls } from "./wallet.js";

export interface ExecuteServices {
  ledger: LedgerSigner;
  creStrategy: PrivateStrategy;
  graph: GraphClient;
  arc: ArcPayer;
}

export function defaultExecuteServices(
  overrides: Partial<ExecuteServices> = {},
): ExecuteServices {
  return {
    ledger: overrides.ledger ?? createSimulatedLedger(),
    creStrategy: overrides.creStrategy ?? DEMO_PRIVATE_STRATEGY,
    graph: overrides.graph ?? createStaticGraphClient(HEALTHY_DEMO_PULSE),
    arc: overrides.arc ?? createSimulatedArcPayer(),
  };
}

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

export async function queueLedgerConfirmation(
  db: AppDatabase,
  services: ExecuteServices,
  agent: Agent,
  request: ActionRequest,
): Promise<void> {
  const existing = getDeviceConfirmation(db, request.id);
  if (existing) return;

  const preview = await services.ledger.preview(
    permitFor(request, "approved"),
  );
  insertPendingDevice(db, request.id, services.ledger.kind, preview);
  writeAudit(db, {
    agentId: agent.id,
    actionRequestId: request.id,
    type: "ledger.requested",
    message: "Waiting for Ledger confirmation",
    metadata: { device: services.ledger.kind, dryRun: preview.dryRun },
  });
}

export async function executeAuthorized(
  db: AppDatabase,
  executor: Executor,
  agent: Agent,
  request: ActionRequest,
  approvalStatus: ApprovalStatus | null,
  services: ExecuteServices = defaultExecuteServices(),
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

  if (request.policyDecision === "REQUIRE_APPROVAL") {
    const device = getDeviceConfirmation(db, request.id);
    if (!device || device.status !== "confirmed") {
      writeAudit(db, {
        agentId: agent.id,
        actionRequestId: request.id,
        type: "ledger.blocked",
        message: "High-risk actions cannot reach the signer without Ledger confirmation",
        metadata: { code: "LEDGER_REQUIRED" },
      });
      return null;
    }
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
    message:
      request.action === "PAYMENT"
        ? "Handing authorized payment to Arc"
        : "Handing authorized action to the signer",
  });

  const result =
    request.action === "PAYMENT"
      ? await settleArc(services.arc, request)
      : await executor.send(permit);
  const tx = insertTransaction(db, request.id, result);

  if (result.hash) {
    const paid = request.action === "PAYMENT";
    writeAudit(db, {
      agentId: agent.id,
      actionRequestId: request.id,
      type: paid
        ? "arc.settled"
        : result.status === "confirmed"
          ? "transaction.confirmed"
          : "transaction.broadcast",
      message: paid
        ? "Arc nanopayment settled"
        : result.status === "confirmed"
          ? "Transaction confirmed"
          : "Transaction broadcast",
      metadata: {
        hash: result.hash,
        mode: result.mode,
        from: result.fromAddress,
        to: result.toAddress,
        simulated: result.mode === "simulated",
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
  services: ExecuteServices = defaultExecuteServices(),
): Promise<{ request: ActionRequest; evaluation: PolicyEvaluation }> {
  const appEval = evaluateAction(proposed, agent.policy, {
    spentTodayCents: spentTodayCents(db, agent.id),
    agentStatus: agent.status,
  });
  const wallet = getOrCreateControls(db, agent);
  const walletEval = evaluateWalletPolicy(proposed, wallet, {
    humanApproved: false,
  });
  const confidential = runTreasuryRiskWorkflow(proposed, services.creStrategy);
  assertNoPrivateLeak(confidential.evaluation, services.creStrategy);
  assertNoPrivateLeak(confidential.report, services.creStrategy);

  const pulse = await services.graph.readPulse();
  const graphEval = evaluateProtocolPulse(proposed, pulse);

  const evaluation = combineEvaluations(
    combineEvaluations(
      combineEvaluations(appEval, walletEval),
      confidential.evaluation,
    ),
    graphEval,
  );

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
  const confidentialAudit = {
    code: confidential.evaluation.code,
    reason: confidential.evaluation.reason,
    tee: confidential.report.tee,
    simulated: confidential.simulated,
    attestation: confidential.report.attestation,
  };
  assertNoPrivateLeak(confidentialAudit, services.creStrategy);

  writeAudit(db, {
    agentId: agent.id,
    actionRequestId: request.id,
    type: "confidential.evaluated",
    message: `Confidential workflow → ${confidential.evaluation.decision}`,
    metadata: confidentialAudit,
  });
  writeAudit(db, {
    agentId: agent.id,
    actionRequestId: request.id,
    type: "graph.evaluated",
    message: `Live protocol data → ${graphEval.decision}`,
    metadata: {
      code: graphEval.code,
      reason: graphEval.reason,
      protocol: pulse.protocol,
      pair: pulse.pair,
      tvlUsd: pulse.tvlUsd,
      volume24hUsd: pulse.volume24hUsd,
      simulated: pulse.simulated,
      source: pulse.source,
    },
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
          : evaluation.code === "GRAPH_DENIED"
            ? "Denied by live protocol data — never reached the signer"
            : "Denied by policy — never reached the signer",
    });
  } else {
    await executeAuthorized(db, executor, agent, request, null, services);
  }

  return { request, evaluation };
}

async function settleArc(
  payer: ArcPayer,
  request: ActionRequest,
): Promise<ExecutionResult> {
  const receipt = await payer.pay({
    actionRequestId: request.id,
    resource: PROTOCOL_BRIEF.resource,
    to: request.recipient ?? "",
    amountCents: request.amountCents,
    asset: "USDC",
    reason: request.reason,
  });

  return {
    status:
      receipt.status === "settled"
        ? "confirmed"
        : receipt.status === "rejected"
          ? "failed"
          : "failed",
    hash: receipt.settlementId,
    fromAddress: receipt.fromAddress,
    toAddress: receipt.toAddress,
    mode: modeFromReceipt(receipt),
    error: receipt.error,
  };
}

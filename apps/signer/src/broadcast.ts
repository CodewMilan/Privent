import type { ExecutionPermit, ExecutionResult, Executor } from "@privent/blockchain";
import type { ActionRequest, Agent, ApprovalRequest } from "@privent/shared";
import type { StoredControls } from "./db.js";

/**
 * Build the permit from DB data. The API never gets to hand-craft this —
 * that is the point of the whole boundary.
 */
export function buildPermit(
  action: ActionRequest,
  _agent: Agent,
  _controls: StoredControls,
  approval: ApprovalRequest | null,
): ExecutionPermit {
  if (action.action !== "TRANSFER") {
    throw new Error(`Signer only handles TRANSFER actions, got ${action.action}`);
  }
  if (!action.recipient) {
    throw new Error("TRANSFER without recipient reached the signer");
  }
  return {
    transfer: {
      actionRequestId: action.id,
      to: action.recipient,
      amountCents: action.amountCents,
      asset: action.asset,
      reason: action.reason,
    },
    policyDecision: action.policyDecision ?? "ALLOW",
    approvalStatus: approval?.status ?? null,
  };
}

export async function broadcast(
  executor: Executor,
  permit: ExecutionPermit,
): Promise<ExecutionResult> {
  return executor.send(permit);
}

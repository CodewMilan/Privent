import { evaluateAction } from "@privent/policy-engine";
import { evaluateWalletPolicy } from "@privent/privy";
import type { ChainTransaction } from "@privent/shared";
import {
  getActionRequest,
  getAgent,
  getApproval,
  getControls,
  getTransactionByAction,
  spentTodayCents,
  type SignerDatabase,
} from "./db.js";

export type SignerRefusalCode =
  | "ACTION_NOT_FOUND"
  | "AGENT_MISMATCH"
  | "AGENT_NOT_FOUND"
  | "AGENT_PAUSED"
  | "CONTROLS_NOT_FOUND"
  | "CHAIN_MISMATCH"
  | "POLICY_DENIED"
  | "WALLET_POLICY_DENIED"
  | "APPROVAL_REQUIRED"
  | "APPROVAL_REJECTED"
  | "DUPLICATE_TRANSACTION"
  | "INVALID_RECIPIENT"
  | "AMOUNT_INVALID";

export interface AuthorizeInput {
  db: SignerDatabase;
  actionRequestId: string;
  agentId: string;
  signerChainId: number;
}

export interface AuthorizeOk {
  ok: true;
  action: ReturnType<typeof getActionRequest>;
  agent: ReturnType<typeof getAgent>;
  controls: ReturnType<typeof getControls>;
}

export interface AuthorizeFail {
  ok: false;
  code: SignerRefusalCode;
  reason: string;
  existingTransaction?: ChainTransaction | null;
}

export type AuthorizeResult = AuthorizeOk | AuthorizeFail;

const ADDRESS = /^0x[a-fA-F0-9]{40}$/;

/**
 * Independent verification. The signer trusts NOTHING that came in the
 * request. It re-reads the action, re-reads the agent, re-runs policy,
 * re-runs wallet policy, re-checks approval, and refuses on any doubt.
 *
 * The caller passes an actionRequestId and the agentId that it CLAIMS
 * the action belongs to. The signer verifies the pairing itself.
 */
export function authorize(input: AuthorizeInput): AuthorizeResult {
  const action = getActionRequest(input.db, input.actionRequestId);
  if (!action) {
    return {
      ok: false,
      code: "ACTION_NOT_FOUND",
      reason: "No action request with that id.",
    };
  }
  if (action.agentId !== input.agentId) {
    return {
      ok: false,
      code: "AGENT_MISMATCH",
      reason: "Action does not belong to the claimed agent.",
    };
  }

  const agent = getAgent(input.db, action.agentId);
  if (!agent) {
    return {
      ok: false,
      code: "AGENT_NOT_FOUND",
      reason: "Agent no longer exists.",
    };
  }
  if (agent.status === "paused") {
    return {
      ok: false,
      code: "AGENT_PAUSED",
      reason: "Agent is paused.",
    };
  }

  const controls = getControls(input.db, agent.id);
  if (!controls) {
    return {
      ok: false,
      code: "CONTROLS_NOT_FOUND",
      reason: "Wallet controls missing.",
    };
  }
  if (controls.chainId !== input.signerChainId) {
    return {
      ok: false,
      code: "CHAIN_MISMATCH",
      reason: `Signer chain id ${input.signerChainId} does not match wallet chain id ${controls.chainId}.`,
    };
  }

  // Anti-replay first — cheaper and it protects us from repeated signs.
  const existing = getTransactionByAction(input.db, action.id);
  if (existing && existing.status !== "pending") {
    return {
      ok: false,
      code: "DUPLICATE_TRANSACTION",
      reason: "This action already produced a transaction.",
      existingTransaction: existing,
    };
  }

  // Basic sanity — recipient must be a 20-byte address before we look further.
  const recipient = action.recipient ?? "";
  if (!ADDRESS.test(recipient)) {
    return {
      ok: false,
      code: "INVALID_RECIPIENT",
      reason: "Recipient is missing or malformed.",
    };
  }
  if (!Number.isInteger(action.amountCents) || action.amountCents <= 0) {
    return {
      ok: false,
      code: "AMOUNT_INVALID",
      reason: "Amount must be a positive whole-cent value.",
    };
  }

  // Re-run app policy from scratch. The signer does not trust
  // action.policyDecision — an attacker with DB write access could flip it.
  const appEval = evaluateAction(
    {
      action: action.action,
      asset: action.asset,
      amountCents: action.amountCents,
      recipient: action.recipient,
      contract: action.contract,
      reason: action.reason,
    },
    agent.policy,
    {
      spentTodayCents: spentTodayCents(input.db, agent.id),
      agentStatus: agent.status,
    },
  );

  // Re-run wallet policy too.
  const walletEval = evaluateWalletPolicy(
    {
      action: action.action,
      asset: action.asset,
      amountCents: action.amountCents,
      recipient: action.recipient,
      contract: action.contract,
      reason: action.reason,
    },
    {
      maxAutoCents: controls.maxAutoCents,
      maxSendCents: controls.maxSendCents,
      allowedRecipients: controls.allowedRecipients,
      exportPrivateKey: controls.exportPrivateKey,
      chainId: controls.chainId,
    },
    // We reason about human approval separately below. For the wallet
    // gate here we want the raw truth about the amount vs the wallet cap.
    { humanApproved: true },
  );

  if (appEval.decision === "DENY") {
    return {
      ok: false,
      code: "POLICY_DENIED",
      reason: appEval.reason,
    };
  }
  if (walletEval.decision === "DENY") {
    return {
      ok: false,
      code: "WALLET_POLICY_DENIED",
      reason: walletEval.reason,
    };
  }

  if (appEval.decision === "REQUIRE_APPROVAL") {
    const approval = getApproval(input.db, action.id);
    if (!approval || approval.status === "pending") {
      return {
        ok: false,
        code: "APPROVAL_REQUIRED",
        reason: "Action requires human approval before signing.",
      };
    }
    if (approval.status === "rejected") {
      return {
        ok: false,
        code: "APPROVAL_REJECTED",
        reason: "Human rejected this action.",
      };
    }
  }

  return { ok: true, action, agent, controls };
}

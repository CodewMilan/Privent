import type { AuthorizeResult, ExecutionPermit } from "./types.js";

const ADDRESS = /^0x[a-fA-F0-9]{40}$/;

/**
 * Last gate before a signer may broadcast. Policy already decided
 * ALLOW / DENY / REQUIRE_APPROVAL; this checks that the permit is
 * sufficient to actually send. The agent never calls this.
 */
export function authorizeExecution(permit: ExecutionPermit): AuthorizeResult {
  if (permit.policyDecision === "DENY") {
    return {
      ok: false,
      code: "DENIED_BY_POLICY",
      reason: "Denied actions cannot be broadcast.",
    };
  }

  if (permit.policyDecision === "REQUIRE_APPROVAL") {
    if (permit.approvalStatus === "rejected") {
      return {
        ok: false,
        code: "REJECTED_BY_HUMAN",
        reason: "A rejected action cannot be broadcast.",
      };
    }
    if (permit.approvalStatus !== "approved") {
      return {
        ok: false,
        code: "APPROVAL_REQUIRED",
        reason: "This action still needs human approval before it can be sent.",
      };
    }
  }

  if (permit.policyDecision !== "ALLOW" && permit.policyDecision !== "REQUIRE_APPROVAL") {
    return {
      ok: false,
      code: "NO_POLICY_DECISION",
      reason: "The signer will not send an action that was not evaluated.",
    };
  }

  if (!permit.transfer.to || !ADDRESS.test(permit.transfer.to)) {
    return {
      ok: false,
      code: "INVALID_RECIPIENT",
      reason: "A 20-byte hex recipient is required to send.",
    };
  }

  if (!Number.isInteger(permit.transfer.amountCents) || permit.transfer.amountCents <= 0) {
    return {
      ok: false,
      code: "INVALID_AMOUNT",
      reason: "Amount must be a positive whole-cent value.",
    };
  }

  return {
    ok: true,
    reason: "Permit is sufficient to sign and broadcast.",
  };
}

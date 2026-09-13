import type { Actor, PolicyEvaluation } from "@privent/shared";

export function canChangePolicy(actor: Actor): PolicyEvaluation {
  if (actor.type === "agent") {
    return {
      decision: "DENY",
      code: "ACTOR_NOT_ALLOWED",
      reason: "The agent cannot change its own permissions or spending limits.",
    };
  }

  return {
    decision: "ALLOW",
    code: "ALLOWED",
    reason: "A human owner may change policy.",
  };
}

export function canApproveAction(
  actor: Actor,
  agentId: string,
): PolicyEvaluation {
  if (actor.type === "agent" || actor.id === agentId) {
    return {
      decision: "DENY",
      code: "ACTOR_NOT_ALLOWED",
      reason: "The agent cannot approve its own transactions.",
    };
  }

  return {
    decision: "ALLOW",
    code: "ALLOWED",
    reason: "A human may approve this action.",
  };
}

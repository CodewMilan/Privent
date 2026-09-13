import { Hono, type Context } from "hono";
import type { Executor } from "@privent/blockchain";
import {
  createAgent,
  createAgentPolicy,
  proposeAction,
  validateCreateAgentInput,
} from "@privent/agent";
import { canApproveAction, canChangePolicy } from "@privent/policy-engine";
import {
  centsToDollars,
  describePermissions,
  type ActionRequest,
  type CreateAgentInput,
  type ProposeActionInput,
} from "@privent/shared";
import type { AppDatabase } from "../db/client.js";
import { readActor } from "../http/actor.js";
import { presentAction, presentAgent } from "../http/presenters.js";
import {
  getActionRequest,
  listActionRequests,
  spentTodayCents,
} from "../repos/actions.js";
import {
  getAgent,
  insertAgent,
  listAgents,
  updateAgentPolicy,
} from "../repos/agents.js";
import { decideApproval, getApprovalByAction } from "../repos/approvals.js";
import { listAudit, writeAudit } from "../repos/audit.js";
import { getTransactionByAction } from "../repos/transactions.js";
import { executeAuthorized, submitAction } from "../services/execute.js";

function presentTrackedAction(db: AppDatabase, request: ActionRequest) {
  return presentAction(
    request,
    getApprovalByAction(db, request.id),
    getTransactionByAction(db, request.id),
  );
}

async function readJsonBody<T>(
  c: Context,
): Promise<{ ok: true; value: T } | { ok: false; response: Response }> {
  try {
    return { ok: true, value: (await c.req.json()) as T };
  } catch {
    return {
      ok: false,
      response: c.json({ error: "Request body must be valid JSON" }, 400),
    };
  }
}

interface UpdatePolicyInput {
  dailyLimit: number;
  perTransactionLimit: number;
  approvalThreshold: number;
  denyThreshold: number;
  allowedAssets?: string[];
  allowedContracts?: string[];
  allowedRecipients?: string[];
}

export function agentRoutes(db: AppDatabase, executor: Executor): Hono {
  const routes = new Hono();

  routes.post("/", async (c) => {
    const parsed = await readJsonBody<CreateAgentInput>(c);
    if (!parsed.ok) return parsed.response;
    const body = parsed.value;
    const errors = validateCreateAgentInput(body);
    if (errors.length > 0) {
      return c.json({ error: errors.join("; ") }, 400);
    }

    const agent = insertAgent(db, createAgent(body));
    writeAudit(db, {
      agentId: agent.id,
      type: "agent.created",
      message: `Agent ${agent.name} created`,
    });

    return c.json(presentAgent(agent), 201);
  });

  routes.get("/", (c) => {
    return c.json(listAgents(db).map(presentAgent));
  });

  routes.get("/:id/overview", (c) => {
    const agent = getAgent(db, c.req.param("id"));
    if (!agent) {
      return c.json({ error: "Agent not found" }, 404);
    }

    const presented = presentAgent(agent);
    const activity = listActionRequests(db, agent.id).map((request) =>
      presentTrackedAction(db, request),
    );
    const pendingApprovals = activity.filter(
      (item) =>
        item.policyDecision === "REQUIRE_APPROVAL" &&
        item.approvalStatus === "pending",
    );

    return c.json({
      agent: {
        ...presented,
        treasury: presented.policy.dailyLimit,
        spentToday: centsToDollars(spentTodayCents(db, agent.id)),
      },
      signer: {
        mode: executor.mode,
        fromAddress: executor.fromAddress,
      },
      permissions: describePermissions(presented.policy),
      pendingApprovals,
      activity,
      audit: listAudit(db, agent.id),
    });
  });

  routes.get("/:id", (c) => {
    const agent = getAgent(db, c.req.param("id"));
    if (!agent) {
      return c.json({ error: "Agent not found" }, 404);
    }

    return c.json(presentAgent(agent));
  });

  routes.post("/:id/actions", async (c) => {
    const agent = getAgent(db, c.req.param("id"));
    if (!agent) {
      return c.json({ error: "Agent not found" }, 404);
    }

    const parsed = await readJsonBody<ProposeActionInput>(c);
    if (!parsed.ok) return parsed.response;

    let proposed;
    try {
      proposed = proposeAction(parsed.value);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid action";
      return c.json({ error: message }, 400);
    }

    const { request, evaluation } = await submitAction(
      db,
      executor,
      agent,
      proposed,
    );

    return c.json(
      {
        request: presentTrackedAction(db, request),
        evaluation,
      },
      201,
    );
  });

  routes.post("/:id/actions/:actionId/decision", async (c) => {
    const agent = getAgent(db, c.req.param("id"));
    if (!agent) {
      return c.json({ error: "Agent not found" }, 404);
    }

    const request = getActionRequest(db, agent.id, c.req.param("actionId"));
    if (!request) {
      return c.json({ error: "Action not found" }, 404);
    }

    if (request.policyDecision !== "REQUIRE_APPROVAL") {
      return c.json({ error: "This action is not waiting for approval" }, 400);
    }

    const actor = readActor(c);
    const authorization = canApproveAction(actor, agent.id);
    if (authorization.decision !== "ALLOW") {
      writeAudit(db, {
        agentId: agent.id,
        actionRequestId: request.id,
        type: "approval.denied",
        message: authorization.reason,
        metadata: { actor },
      });
      return c.json({ error: authorization.reason }, 403);
    }

    const parsedBody = await readJsonBody<{ status?: string }>(c);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.value;
    if (body.status !== "approved" && body.status !== "rejected") {
      return c.json({ error: "status must be approved or rejected" }, 400);
    }

    const existing = getApprovalByAction(db, request.id);
    if (!existing) {
      return c.json({ error: "Approval record missing for this action" }, 500);
    }
    if (existing.status !== "pending") {
      return c.json({ error: "This approval has already been decided" }, 409);
    }

    decideApproval(db, request.id, body.status, actor.id);
    writeAudit(db, {
      agentId: agent.id,
      actionRequestId: request.id,
      type: `approval.${body.status}`,
      message:
        body.status === "approved"
          ? "Human approved the action"
          : "Human rejected the action",
    });

    if (body.status === "approved") {
      await executeAuthorized(db, executor, agent, request, "approved");
    } else {
      writeAudit(db, {
        agentId: agent.id,
        actionRequestId: request.id,
        type: "execution.skipped",
        message: "Rejected by human — never reached the signer",
      });
    }

    return c.json(presentTrackedAction(db, request));
  });

  routes.get("/:id/actions", (c) => {
    const agent = getAgent(db, c.req.param("id"));
    if (!agent) {
      return c.json({ error: "Agent not found" }, 404);
    }

    return c.json(
      listActionRequests(db, agent.id).map((request) =>
        presentTrackedAction(db, request),
      ),
    );
  });

  routes.patch("/:id/policy", async (c) => {
    const agent = getAgent(db, c.req.param("id"));
    if (!agent) {
      return c.json({ error: "Agent not found" }, 404);
    }

    const actor = readActor(c);
    const authorization = canChangePolicy(actor);
    if (authorization.decision !== "ALLOW") {
      writeAudit(db, {
        agentId: agent.id,
        type: "policy.change_denied",
        message: authorization.reason,
        metadata: { actor },
      });
      return c.json({ error: authorization.reason }, 403);
    }

    const parsed = await readJsonBody<UpdatePolicyInput>(c);
    if (!parsed.ok) return parsed.response;
    const body = parsed.value;

    const policyInput: CreateAgentInput = {
      name: agent.name,
      dailyLimit: body.dailyLimit,
      perTransactionLimit: body.perTransactionLimit,
      approvalThreshold: body.approvalThreshold,
      denyThreshold: body.denyThreshold,
      allowedAssets: body.allowedAssets ?? agent.policy.allowedAssets,
      allowedContracts: body.allowedContracts ?? agent.policy.allowedContracts,
      allowedRecipients: body.allowedRecipients ?? agent.policy.allowedRecipients,
    };
    const errors = validateCreateAgentInput(policyInput);
    if (errors.length > 0) {
      return c.json({ error: errors.join("; ") }, 400);
    }

    const updated = updateAgentPolicy(db, agent.id, createAgentPolicy(policyInput));
    writeAudit(db, {
      agentId: agent.id,
      type: "policy.changed",
      message: "Owner updated agent policy",
    });

    return c.json(updated ? presentAgent(updated) : { error: "Agent not found" });
  });

  return routes;
}

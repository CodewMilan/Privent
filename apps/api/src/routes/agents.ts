import { Hono } from "hono";
import {
  createAgent,
  createAgentPolicy,
  proposeAction,
  validateCreateAgentInput,
} from "@privent/agent";
import {
  canApproveAction,
  canChangePolicy,
  evaluateAction,
} from "@privent/policy-engine";
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
  insertActionRequest,
  listActionRequests,
  spentTodayCents,
} from "../repos/actions.js";
import {
  getAgent,
  insertAgent,
  listAgents,
  updateAgentPolicy,
} from "../repos/agents.js";
import {
  decideApproval,
  getApprovalByAction,
  insertPendingApproval,
} from "../repos/approvals.js";
import { listAudit, writeAudit } from "../repos/audit.js";

function presentTrackedAction(db: AppDatabase, request: ActionRequest) {
  if (request.policyDecision === "REQUIRE_APPROVAL") {
    return presentAction(request, insertPendingApproval(db, request.id));
  }
  return presentAction(request, getApprovalByAction(db, request.id));
}

export function agentRoutes(db: AppDatabase): Hono {
  const routes = new Hono();

  routes.post("/", async (c) => {
    const body = (await c.req.json()) as CreateAgentInput;
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
        item?.policyDecision === "REQUIRE_APPROVAL" &&
        item.approvalStatus === "pending",
    );

    return c.json({
      agent: {
        ...presented,
        treasury: presented.policy.dailyLimit,
        spentToday: centsToDollars(spentTodayCents(db, agent.id)),
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

    let proposed;
    try {
      proposed = proposeAction((await c.req.json()) as ProposeActionInput);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid action";
      return c.json({ error: message }, 400);
    }

    const evaluation = evaluateAction(proposed, agent.policy, {
      spentTodayCents: spentTodayCents(db, agent.id),
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

    const body = (await c.req.json()) as { status?: string };
    if (body.status !== "approved" && body.status !== "rejected") {
      return c.json({ error: "status must be approved or rejected" }, 400);
    }

    const existing = insertPendingApproval(db, request.id);
    if (existing.status !== "pending") {
      return c.json({ error: "This approval has already been decided" }, 409);
    }

    const approval = decideApproval(db, request.id, body.status, actor.id);
    writeAudit(db, {
      agentId: agent.id,
      actionRequestId: request.id,
      type: `approval.${body.status}`,
      message:
        body.status === "approved"
          ? "Human approved the action"
          : "Human rejected the action",
    });

    return c.json(presentAction(request, approval));
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

    const body = (await c.req.json()) as CreateAgentInput;
    const input = {
      ...body,
      name: agent.name,
      allowedAssets: body.allowedAssets ?? agent.policy.allowedAssets,
    };
    const errors = validateCreateAgentInput(input);
    if (errors.length > 0) {
      return c.json({ error: errors.join("; ") }, 400);
    }

    const updated = updateAgentPolicy(db, agent.id, createAgentPolicy(input));
    writeAudit(db, {
      agentId: agent.id,
      type: "policy.changed",
      message: "Owner updated agent policy",
    });

    return c.json(updated ? presentAgent(updated) : { error: "Agent not found" });
  });

  return routes;
}

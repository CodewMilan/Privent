import { Hono } from "hono";
import {
  createAgent,
  createAgentPolicy,
  proposeAction,
  validateCreateAgentInput,
} from "@privent/agent";
import { canChangePolicy, evaluateAction } from "@privent/policy-engine";
import type { CreateAgentInput, ProposeActionInput } from "@privent/shared";
import type { AppDatabase } from "../db/client.js";
import { readActor } from "../http/actor.js";
import { presentAction, presentAgent } from "../http/presenters.js";
import {
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
import { writeAudit } from "../repos/audit.js";

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
    writeAudit(db, {
      agentId: agent.id,
      actionRequestId: request.id,
      type: "policy.evaluated",
      message: `Policy evaluation → ${evaluation.decision}`,
      metadata: { code: evaluation.code, reason: evaluation.reason },
    });

    return c.json(
      {
        request: presentAction(request),
        evaluation,
      },
      201,
    );
  });

  routes.get("/:id/actions", (c) => {
    const agent = getAgent(db, c.req.param("id"));
    if (!agent) {
      return c.json({ error: "Agent not found" }, 404);
    }

    return c.json(listActionRequests(db, agent.id).map(presentAction));
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

import type { Actor, ActorType } from "@privent/shared";
import type { Context } from "hono";

const ACTORS = new Set<ActorType>(["owner", "human", "agent"]);

export function readActor(c: Context): Actor {
  const typeHeader = c.req.header("x-actor-type") ?? "human";
  const type = ACTORS.has(typeHeader as ActorType)
    ? (typeHeader as ActorType)
    : "human";

  return {
    type,
    id: c.req.header("x-actor-id") ?? "anonymous",
  };
}

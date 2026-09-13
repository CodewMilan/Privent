"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  askAgent,
  decideAction,
  fetchOverview,
  proposePayment,
  type Overview,
} from "../lib/api";
import { Plus } from "lucide-react";
import { AgentActions } from "../components/desk/actions";
import { Approvals } from "../components/desk/approvals";
import { DeskButton } from "../components/desk/button";
import { FadeIn } from "../components/desk/fade";
import { TIMING } from "../components/desk/motion";
import { PaymentForm } from "../components/desk/payment-form";
import { Payments } from "../components/desk/payments";
import { Policy } from "../components/desk/policy";
import { StatsStrip } from "../components/desk/stats";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; data: Overview };

export function Dashboard() {
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [compose, setCompose] = useState(false);

  async function refresh() {
    try {
      const data = await fetchOverview();
      setLoad({ status: "ok", data });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load";
      setLoad({ status: "error", message });
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onPropose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (load.status !== "ok") return;
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const amount = Number(form.get("amount"));
    const recipient = String(form.get("recipient") ?? "");
    const reason = String(form.get("reason") ?? "");
    setFormError(null);
    setBusyId("propose");
    try {
      await proposePayment(load.data.agent.id, { amount, recipient, reason });
      formEl.reset();
      setCompose(false);
      await refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Request failed");
    } finally {
      setBusyId(null);
    }
  }

  async function onDecide(actionId: string, status: "approved" | "rejected") {
    if (load.status !== "ok") return;
    setBusyId(actionId);
    try {
      await decideAction(load.data.agent.id, actionId, status);
      await refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Decision failed");
    } finally {
      setBusyId(null);
    }
  }

  async function onAgent(scenarioId: string, instruction: string) {
    if (load.status !== "ok") return;
    setBusyId(`agent:${scenarioId}`);
    setAgentError(null);
    try {
      await askAgent(load.data.agent.id, instruction);
      await refresh();
    } catch (error) {
      setAgentError(
        error instanceof Error ? error.message : "Agent request failed",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="desk">
      {load.status === "loading" && <Skeleton />}
      {load.status === "error" && (
        <section className="desk-card">
          <h2>Couldn’t load treasury</h2>
          <p className="lede">{load.message}</p>
          <div className="mt-6">
            <DeskButton
              onClick={() => {
                setLoad({ status: "loading" });
                void refresh();
              }}
            >
              Retry
            </DeskButton>
          </div>
        </section>
      )}

      {load.status === "ok" && (
        <div className="flex flex-col gap-5">
          <FadeIn delay={TIMING.header}>
            <header className="desk-header">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h1>{load.data.agent.name}</h1>
                  <p>
                    The agent proposes. Policy decides. A separate signer
                    executes.
                  </p>
                </div>
                <DeskButton ghost onClick={() => setCompose((open) => !open)}>
                  {compose ? "Close" : (
                    <>
                      <Plus size={14} aria-hidden="true" />
                      New payment
                    </>
                  )}
                </DeskButton>
              </div>
            </header>
          </FadeIn>

          <FadeIn delay={TIMING.stats}>
            <StatsStrip data={load.data} />
          </FadeIn>

          {compose && (
            <FadeIn delay={0}>
              <PaymentForm
                defaultRecipient={
                  load.data.effective.allowedRecipients[0] ?? ""
                }
                busy={busyId === "propose"}
                error={formError}
                onSubmit={onPropose}
                onClose={() => setCompose(false)}
              />
            </FadeIn>
          )}

          <FadeIn delay={TIMING.actions}>
            <AgentActions
              enabled={load.data.demo.llm.enabled}
              busyId={busyId}
              error={agentError}
              onAsk={onAgent}
            />
          </FadeIn>

          <FadeIn delay={TIMING.approvals}>
            <Approvals
              items={load.data.pendingApprovals}
              busyId={busyId}
              onDecide={onDecide}
            />
          </FadeIn>

          <FadeIn delay={TIMING.main}>
            <div className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
              <Payments items={load.data.activity} />
              <Policy rows={load.data.permissions} />
            </div>
          </FadeIn>
        </div>
      )}
    </main>
  );
}

function Skeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-4" aria-hidden>
      <div className="h-24 animate-pulse rounded-[16px] bg-white lg:col-span-4" />
      <div className="h-20 animate-pulse rounded-[16px] bg-white" />
      <div className="h-20 animate-pulse rounded-[16px] bg-white" />
      <div className="h-20 animate-pulse rounded-[16px] bg-white" />
      <div className="h-20 animate-pulse rounded-[16px] bg-white" />
    </div>
  );
}

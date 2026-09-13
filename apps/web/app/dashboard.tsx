"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { PermissionRow } from "@privent/shared";
import {
  decideAction,
  fetchOverview,
  proposePayment,
  type AuditEvent,
  type Overview,
  type PresentedAction,
} from "../lib/api";
import {
  decisionLabel,
  explorerTxUrl,
  formatAddress,
  formatTime,
  formatTxHash,
  formatUsd,
} from "../lib/format";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; data: Overview };

const fieldClass =
  "mt-1 w-full rounded-md border border-line bg-bg px-3 py-2 text-ink outline-none focus-visible:ring-2 focus-visible:ring-brass";
const buttonClass =
  "inline-flex min-h-10 items-center justify-center rounded-md px-4 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-50";

function tone(decision: PresentedAction["policyDecision"] | PermissionRow["state"]) {
  if (decision === "ALLOW" || decision === "allowed") return "text-allow";
  if (decision === "DENY" || decision === "denied") return "text-deny";
  return "text-wait";
}

function PermissionMark({ state }: { state: PermissionRow["state"] }) {
  if (state === "allowed") return <span className="text-allow">Allowed</span>;
  if (state === "denied") return <span className="text-deny">Denied</span>;
  return <span className="text-wait">Needs approval</span>;
}

export function Dashboard() {
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

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

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 md:px-6 lg:px-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.22em] text-brass uppercase">
            Treasury desk
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Privent</h1>
          <p className="mt-2 max-w-xl text-mute">
            The agent proposes. Policy decides. You approve only what sits in
            the middle.
          </p>
        </div>
        <p className="text-sm text-mute">Signed in as Acme Finance</p>
      </header>

      {load.status === "loading" && <Skeleton />}
      {load.status === "error" && (
        <section className="rounded-lg border border-line bg-surface p-6">
          <h2 className="text-lg font-medium">Dashboard unavailable</h2>
          <p className="mt-2 text-mute">{load.message}</p>
          <button
            type="button"
            className={`${buttonClass} mt-4 bg-brass text-bg`}
            onClick={() => {
              setLoad({ status: "loading" });
              void refresh();
            }}
          >
            Retry
          </button>
        </section>
      )}

      {load.status === "ok" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <AgentCard agent={load.data.agent} signer={load.data.signer} />
            <PermissionsCard rows={load.data.permissions} />
          </div>

          <ApprovalsCard
            items={load.data.pendingApprovals}
            busyId={busyId}
            onDecide={onDecide}
          />

          <ProposeCard
            defaultRecipient={
              load.data.agent.walletAddress
                ? "0x2222222222222222222222222222222222222222"
                : ""
            }
            busy={busyId === "propose"}
            error={formError}
            onSubmit={onPropose}
          />

          <ActivityCard items={load.data.activity} />
          <AuditCard events={load.data.audit} />
        </div>
      )}
    </main>
  );
}

function AgentCard({
  agent,
  signer,
}: {
  agent: Overview["agent"];
  signer: Overview["signer"];
}) {
  return (
    <section className="rounded-lg border border-line bg-surface p-5">
      <h2 className="text-sm text-mute">Agent</h2>
      <div className="mt-3 flex items-baseline justify-between gap-4">
        <h3 className="text-xl font-medium">{agent.name}</h3>
        <span className="text-sm text-allow capitalize">{agent.status}</span>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <Row label="Owner" value={agent.owner ?? "—"} />
        <Row label="Identity" value={agent.ensName ?? "—"} mono />
        <Row label="Wallet" value={formatAddress(agent.walletAddress)} mono />
        <Row
          label="Signer"
          value={
            signer.mode === "testnet"
              ? `Sepolia · ${formatAddress(signer.fromAddress)}`
              : `Local · ${formatAddress(signer.fromAddress)}`
          }
          mono
        />
        <Row label="Treasury" value={`${formatUsd(agent.treasury)} USDC`} />
        <Row label="Spent today" value={formatUsd(agent.spentToday)} />
        <Row
          label="Auto limit"
          value={`under ${formatUsd(agent.policy.approvalThreshold)}`}
        />
      </dl>
    </section>
  );
}

function PermissionsCard({ rows }: { rows: PermissionRow[] }) {
  return (
    <section className="rounded-lg border border-line bg-surface p-5">
      <h2 className="text-sm text-mute">Permissions</h2>
      <ul className="mt-4 divide-y divide-line">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-center justify-between gap-4 py-2.5 text-sm"
          >
            <span>{row.label}</span>
            <PermissionMark state={row.state} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ApprovalsCard({
  items,
  busyId,
  onDecide,
}: {
  items: PresentedAction[];
  busyId: string | null;
  onDecide: (id: string, status: "approved" | "rejected") => void;
}) {
  return (
    <section className="rounded-lg border border-line bg-surface p-5">
      <h2 className="text-sm text-mute">Needs your approval</h2>
      {items.length === 0 ? (
        <p className="mt-4 text-mute">
          Nothing waiting. Mid-size spends will land here.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {items.map((item) => (
            <li key={item.id} className="rounded-md border border-line bg-raised p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-mono text-lg">{formatUsd(item.amount)} {item.asset}</p>
                <p className="text-sm text-wait">{decisionLabel(item.policyDecision)}</p>
              </div>
              <p className="mt-2 text-sm">{item.reason}</p>
              <p className="mt-1 font-mono text-xs text-mute">
                {formatAddress(item.recipient)} · {formatTime(item.createdAt)}
              </p>
              <p className="mt-3 text-sm text-mute">{item.policyReason}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  className={`${buttonClass} bg-allow text-bg`}
                  disabled={busyId === item.id}
                  onClick={() => onDecide(item.id, "approved")}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className={`${buttonClass} border border-line text-ink`}
                  disabled={busyId === item.id}
                  onClick={() => onDecide(item.id, "rejected")}
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ProposeCard({
  defaultRecipient,
  busy,
  error,
  onSubmit,
}: {
  defaultRecipient: string;
  busy: boolean;
  error: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="rounded-lg border border-line bg-surface p-5">
      <h2 className="text-sm text-mute">Propose a payment</h2>
      <form className="mt-4 grid gap-4 md:grid-cols-3" onSubmit={onSubmit}>
        <label className="text-sm">
          Amount (USD)
          <input
            required
            className={`${fieldClass} font-mono`}
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="320"
          />
        </label>
        <label className="text-sm md:col-span-2">
          Recipient
          <input
            required
            className={`${fieldClass} font-mono`}
            name="recipient"
            type="text"
            defaultValue={defaultRecipient}
            autoComplete="off"
          />
        </label>
        <label className="text-sm md:col-span-3">
          Reason
          <input
            required
            className={fieldClass}
            name="reason"
            type="text"
            placeholder="Vendor payment"
            autoComplete="off"
          />
        </label>
        <div className="md:col-span-3">
          <button
            type="submit"
            className={`${buttonClass} bg-brass text-bg`}
            disabled={busy}
          >
            {busy ? "Sending request…" : "Submit to policy"}
          </button>
          {error && <p className="mt-3 text-sm text-deny">{error}</p>}
        </div>
      </form>
    </section>
  );
}

function ActivityCard({ items }: { items: PresentedAction[] }) {
  return (
    <section className="rounded-lg border border-line bg-surface p-5">
      <h2 className="text-sm text-mute">Activity</h2>
      {items.length === 0 ? (
        <p className="mt-4 text-mute">
          No requests yet. Submit a payment to see the policy decision.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {items.map((item) => (
            <li key={item.id} className="py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-mono">
                  {formatUsd(item.amount)} {item.asset}
                </p>
                <p
                  className={`text-sm ${tone(
                    item.approvalStatus === "rejected"
                      ? "DENY"
                      : item.approvalStatus === "approved"
                        ? "ALLOW"
                        : item.policyDecision,
                  )}`}
                >
                  {decisionLabel(item.policyDecision, item.approvalStatus)}
                </p>
              </div>
              <p className="mt-1 text-sm">{item.reason}</p>
              <p className="mt-1 text-sm text-mute">{item.policyReason}</p>
              <p className="mt-1 font-mono text-xs text-mute">
                {formatTime(item.createdAt)} · {formatAddress(item.recipient)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-mute">{label}</dt>
      <dd className={`mt-1 ${mono ? "font-mono text-xs md:text-sm" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-2" aria-hidden>
      <div className="h-64 animate-pulse rounded-lg bg-surface" />
      <div className="h-64 animate-pulse rounded-lg bg-surface" />
      <div className="h-40 animate-pulse rounded-lg bg-surface lg:col-span-2" />
    </div>
  );
}

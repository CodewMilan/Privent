"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { PermissionRow } from "@privent/shared";
import {
  buyProtocolBrief,
  confirmLedger,
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
  formatCompactUsd,
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

  async function onBuyBrief() {
    if (load.status !== "ok") return;
    setBusyId("brief");
    setFormError(null);
    try {
      await buyProtocolBrief(
        load.data.agent.id,
        load.data.effective.allowedRecipients[0] ??
          "0x2222222222222222222222222222222222222222",
      );
      await refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Payment failed");
    } finally {
      setBusyId(null);
    }
  }

  async function onLedger(actionId: string, status: "confirmed" | "rejected") {
    if (load.status !== "ok") return;
    setBusyId(actionId);
    try {
      await confirmLedger(load.data.agent.id, actionId, status);
      await refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Ledger failed");
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
            <AgentCard
              agent={load.data.agent}
              signer={load.data.signer}
              identity={load.data.identity}
              effective={load.data.effective}
              confidential={load.data.confidential}
            />
            <PermissionsCard
              rows={load.data.permissions}
              walletTighter={
                load.data.effective.approvalThreshold <
                  load.data.agent.policy.approvalThreshold ||
                load.data.effective.denyThreshold <
                  load.data.agent.policy.denyThreshold
              }
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <MarketCard
              market={load.data.market}
              payments={load.data.payments}
              busy={busyId === "brief"}
              onBuyBrief={onBuyBrief}
            />
            <ApprovalsCard
              items={load.data.pendingApprovals}
              busyId={busyId}
              onDecide={onDecide}
            />
          </div>

          <LedgerCard
            items={load.data.waitingForLedger}
            busyId={busyId}
            onLedger={onLedger}
          />

          <ProposeCard
            defaultRecipient={
              load.data.effective.allowedRecipients[0] ??
              "0x2222222222222222222222222222222222222222"
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

function identityStatus(identity: Overview["identity"]): string {
  switch (identity.agreement) {
    case "match":
      return "On-chain · records match";
    case "mismatch":
      return "On-chain · records differ";
    case "name-not-found":
      return "Not registered · records ready";
    case "unpublished":
      return "Not published on-chain";
    case "error":
      return "Lookup failed";
    case "timeout":
      return "ENS lookup timed out";
    case "no-ens":
      return "No ENS name";
  }
}

function AgentCard({
  agent,
  signer,
  identity,
  effective,
  confidential,
}: {
  agent: Overview["agent"];
  signer: Overview["signer"];
  identity: Overview["identity"];
  effective: Overview["effective"];
  confidential: Overview["confidential"];
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
        <Row label="ENS status" value={identityStatus(identity)} />
        <Row
          label="Endpoint"
          value={identity.published?.["agent-endpoint[web]"] ?? "—"}
          mono
        />
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
        <Row
          label="High-risk"
          value={
            signer.highRisk === "cli"
              ? "Ledger CLI"
              : "Ledger · simulated device"
          }
        />
        <Row
          label="Confidential"
          value={
            confidential.simulated
              ? "CRE TEE simulation"
              : confidential.tee
          }
        />
        <Row label="Treasury" value={`${formatUsd(agent.treasury)} USDC`} />
        <Row label="Spent today" value={formatUsd(agent.spentToday)} />
        <Row
          label="Auto limit"
          value={`under ${formatUsd(effective.approvalThreshold)}`}
        />
        <Row
          label="Key export"
          value="Denied"
        />
      </dl>
    </section>
  );
}

function PermissionsCard({
  rows,
  walletTighter,
}: {
  rows: PermissionRow[];
  walletTighter: boolean;
}) {
  return (
    <section className="rounded-lg border border-line bg-surface p-5">
      <h2 className="text-sm text-mute">Permissions</h2>
      <p className="mt-1 text-xs text-mute">
        {walletTighter
          ? "Showing the wallet cap, which is tighter than the app policy."
          : "App policy and wallet policy agree on these limits."}
      </p>
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

function marketVote(market: Overview["market"]): string {
  if (market.status === "unconfigured") return "Not configured";
  if (market.status === "error") return "Unavailable";
  if (
    market.previousVolumeUsd &&
    market.volume24hUsd != null &&
    market.volume24hUsd < market.previousVolumeUsd * 0.5
  ) {
    return "Cooling — needs approval";
  }
  if (market.tvlUsd != null && market.tvlUsd < 1_000_000) {
    return "Thin liquidity — denied";
  }
  return "Healthy";
}

function MarketCard({
  market,
  payments,
  busy,
  onBuyBrief,
}: {
  market: Overview["market"];
  payments: Overview["payments"];
  busy: boolean;
  onBuyBrief: () => void;
}) {
  const vote = marketVote(market);
  return (
    <section className="rounded-lg border border-line bg-surface p-5">
      <h2 className="text-sm text-mute">Live protocol data</h2>
      <p className="mt-1 text-xs text-mute">
        {market.simulated
          ? "Static pulse for tests — Graph is not attached."
          : `${market.protocol} · The Graph`}
      </p>
      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <Row label="Pool" value={market.pair} />
        <Row
          label="TVL"
          value={market.tvlUsd == null ? "—" : formatCompactUsd(market.tvlUsd)}
        />
        <Row
          label="24h volume"
          value={
            market.volume24hUsd == null
              ? "—"
              : formatCompactUsd(market.volume24hUsd)
          }
        />
        <Row
          label="ETH"
          value={
            market.ethPriceUsd == null ? "—" : formatUsd(market.ethPriceUsd)
          }
        />
        <Row label="Graph vote" value={vote} />
        <Row
          label="Arc"
          value={
            payments.simulated
              ? "USDC nanopayment · simulated"
              : "USDC nanopayment · Arc testnet"
          }
        />
      </dl>
      {market.error && (
        <p className="mt-3 text-sm text-deny">{market.error}</p>
      )}
      <button
        type="button"
        className={`${buttonClass} mt-5 bg-brass text-bg`}
        disabled={busy}
        onClick={onBuyBrief}
      >
        {busy ? "Paying…" : `Buy protocol brief · ${formatUsd(payments.briefCents / 100)}`}
      </button>
    </section>
  );
}

function LedgerCard({
  items,
  busyId,
  onLedger,
}: {
  items: PresentedAction[];
  busyId: string | null;
  onLedger: (id: string, status: "confirmed" | "rejected") => void;
}) {
  return (
    <section className="rounded-lg border border-line bg-surface p-5">
      <h2 className="text-sm text-mute">Waiting for Ledger</h2>
      {items.length === 0 ? (
        <p className="mt-4 text-mute">
          Approved mid-size spends wait here for on-device confirmation.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {items.map((item) => (
            <li key={item.id} className="rounded-md border border-line bg-raised p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-mono text-lg">{formatUsd(item.amount)} {item.asset}</p>
                <p className="text-sm text-wait">Waiting for Ledger</p>
              </div>
              <p className="mt-2 text-sm">{item.reason}</p>
              <p className="mt-1 font-mono text-xs text-mute">
                {formatAddress(item.recipient)} · {formatTime(item.createdAt)}
              </p>
              <p className="mt-3 text-sm text-mute">
                Human approved. Confirm on the device to send, or reject.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  className={`${buttonClass} bg-allow text-bg`}
                  disabled={busyId === item.id}
                  onClick={() => onLedger(item.id, "confirmed")}
                >
                  Confirm on device
                </button>
                <button
                  type="button"
                  className={`${buttonClass} border border-line text-ink`}
                  disabled={busyId === item.id}
                  onClick={() => onLedger(item.id, "rejected")}
                >
                  Reject on device
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
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
                    item.txStatus === "failed" ||
                    item.approvalStatus === "rejected" ||
                    item.ledgerStatus === "rejected"
                      ? "DENY"
                      : item.txStatus === "confirmed" || item.txStatus === "broadcast"
                        ? "ALLOW"
                        : item.ledgerStatus === "pending"
                          ? "REQUIRE_APPROVAL"
                          : item.approvalStatus === "approved"
                            ? "ALLOW"
                            : item.policyDecision,
                  )}`}
                >
                  {decisionLabel(
                    item.policyDecision,
                    item.approvalStatus,
                    item.txStatus,
                    item.ledgerStatus,
                  )}
                </p>
              </div>
              <p className="mt-1 text-sm">{item.reason}</p>
              <p className="mt-1 text-sm text-mute">{item.policyReason}</p>
              <p className="mt-1 font-mono text-xs text-mute">
                {formatTime(item.createdAt)} · {formatAddress(item.recipient)}
              </p>
              <TxLine item={item} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TxLine({ item }: { item: PresentedAction }) {
  if (item.policyDecision === "DENY") {
    return (
      <p className="mt-1 text-xs text-mute">Never sent — policy denied it.</p>
    );
  }
  if (item.approvalStatus === "rejected") {
    return (
      <p className="mt-1 text-xs text-mute">Never sent — you rejected it.</p>
    );
  }
  if (item.ledgerStatus === "rejected") {
    return (
      <p className="mt-1 text-xs text-mute">
        Never sent — Ledger rejected it.
      </p>
    );
  }
  if (item.ledgerStatus === "pending") {
    return (
      <p className="mt-1 text-xs text-mute">
        Waiting for on-device confirmation — not sent yet.
      </p>
    );
  }
  if (!item.txHash) {
    return null;
  }

  const href = explorerTxUrl(item.txHash, item.txMode);
  const rail = item.action === "PAYMENT" ? "Arc" : item.txMode === "testnet" ? null : "local";
  const label = rail
    ? `${formatTxHash(item.txHash)} · ${rail}`
    : formatTxHash(item.txHash);

  if (href) {
    return (
      <p className="mt-1 font-mono text-xs">
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-brass underline-offset-2 hover:underline"
        >
          {label}
        </a>
      </p>
    );
  }

  return <p className="mt-1 font-mono text-xs text-mute">{label}</p>;
}

function AuditCard({ events }: { events: AuditEvent[] }) {
  return (
    <section className="rounded-lg border border-line bg-surface p-5">
      <h2 className="text-sm text-mute">Audit trail</h2>
      {events.length === 0 ? (
        <p className="mt-4 text-mute">No events yet.</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {events.map((event) => (
            <li key={event.id} className="flex gap-3 text-sm">
              <time className="w-24 shrink-0 font-mono text-xs text-mute">
                {formatTime(event.createdAt)}
              </time>
              <span>{event.message}</span>
            </li>
          ))}
        </ol>
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

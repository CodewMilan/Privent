"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import {
  decisionLabel,
  explorerTxUrl,
  formatAddress,
  formatTime,
  formatUsd,
} from "../../lib/format";
import type { PresentedAction } from "../../lib/api";
import { DeskButton } from "./button";
import { TIMING } from "./motion";
import { rowTone } from "./status";

export function Payments({ items }: { items: PresentedAction[] }) {
  const [expanded, setExpanded] = useState(false);
  const reduce = useReducedMotion();
  const visible = expanded ? items.slice(0, 12) : items.slice(0, 5);

  return (
    <section className="desk-card">
      <h2>Payments</h2>
      {items.length === 0 ? (
        <p className="lede">No payments yet. Ask the agent above.</p>
      ) : (
        <ul className="mt-5 divide-y divide-line">
          {visible.map((item, index) => (
            <motion.li
              key={item.id}
              className="py-4"
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (index * TIMING.list) / 1000 }}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="desk-label m-0">
                  {formatUsd(item.amount)} {item.asset}
                </p>
                <p className={`desk-caption m-0 ${rowTone(item)}`}>
                  {decisionLabel(
                    item.policyDecision,
                    item.approvalStatus,
                    item.txStatus,
                    item.ledgerStatus,
                  )}
                </p>
              </div>
              <p className="lede mt-2 mb-0">{item.reason}</p>
              <p className="desk-caption mt-2">
                {formatTime(item.createdAt)} · {formatAddress(item.recipient)}
              </p>
              <TxAction item={item} />
            </motion.li>
          ))}
        </ul>
      )}
      {items.length > 5 && (
        <div className="mt-4">
          <DeskButton ghost onClick={() => setExpanded((open) => !open)}>
            {expanded ? "Show less" : "Show more"}
          </DeskButton>
        </div>
      )}
    </section>
  );
}

function TxAction({ item }: { item: PresentedAction }) {
  if (item.policyDecision === "DENY") {
    return <p className="desk-caption mt-2">Blocked by policy. Not sent.</p>;
  }
  if (item.approvalStatus === "rejected") {
    return <p className="desk-caption mt-2">Rejected. Not sent.</p>;
  }
  if (!item.txHash) return null;

  const href = explorerTxUrl(item.txHash, item.txMode);
  if (!href) return null;

  return (
    <div className="mt-3">
        <DeskButton
          ghost
          onClick={() =>
            window.open(href, "_blank", "noopener,noreferrer")
          }
        >
          View transaction
          <ExternalLink size={14} aria-hidden="true" />
        </DeskButton>
    </div>
  );
}

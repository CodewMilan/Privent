import { formatAddress, formatTime, formatUsd } from "../../lib/format";
import type { PresentedAction } from "../../lib/api";
import { DeskButton } from "./button";

export function Approvals({
  items,
  busyId,
  onDecide,
}: {
  items: PresentedAction[];
  busyId: string | null;
  onDecide: (id: string, status: "approved" | "rejected") => void;
}) {
  if (items.length === 0) return null;

  return (
    <section className="desk-card" id="approvals">
      <h2>Needs approval</h2>
      <p className="lede">
        These sit over the auto-send limit. Nothing moves until you decide.
      </p>
      <ul className="mt-5 space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-[12px] bg-raised p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="desk-label m-0">
                {formatUsd(item.amount)} {item.asset}
              </p>
              <p className="desk-caption m-0 text-wait">Needs approval</p>
            </div>
            <p className="lede mt-2 mb-0">{item.reason}</p>
            <p className="desk-caption mt-2">
              {formatAddress(item.recipient)} · {formatTime(item.createdAt)}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <DeskButton
                busy={busyId === item.id}
                onClick={() => onDecide(item.id, "approved")}
              >
                Approve
              </DeskButton>
              <DeskButton
                ghost
                busy={busyId === item.id}
                onClick={() => onDecide(item.id, "rejected")}
              >
                Reject
              </DeskButton>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

import { formatUsd } from "../../lib/format";
import type { Overview } from "../../lib/api";

export function StatsStrip({ data }: { data: Overview }) {
  const items = [
    { label: "Treasury", value: `${formatUsd(data.agent.treasury)} USDC` },
    { label: "Spent today", value: formatUsd(data.agent.spentToday) },
    {
      label: "Auto-send",
      value: `Under ${formatUsd(data.effective.approvalThreshold)}`,
    },
    {
      label: "Hard cap",
      value: formatUsd(data.effective.denyThreshold),
    },
  ];

  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <li key={item.label} className="desk-card !p-5">
          <p className="desk-caption m-0">{item.label}</p>
          <p className="desk-label mt-2 mb-0">{item.value}</p>
        </li>
      ))}
    </ul>
  );
}

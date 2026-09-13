import type { PermissionRow } from "@privent/shared";

function isProductRow(row: PermissionRow) {
  return (
    row.label.startsWith("Spend") ||
    row.label.startsWith("Send only") ||
    row.label === "Export private key"
  );
}

function mark(state: PermissionRow["state"]) {
  if (state === "allowed") return <span className="text-allow">Allowed</span>;
  if (state === "denied") return <span className="text-deny">Denied</span>;
  return <span className="text-wait">Approval</span>;
}

export function Policy({ rows }: { rows: PermissionRow[] }) {
  const visible = rows.filter(isProductRow);

  return (
    <section className="desk-card">
      <h2>Policy</h2>
      <p className="lede">The agent cannot change these rules.</p>
      <ul className="mt-5 divide-y divide-line">
        {(visible.length > 0 ? visible : rows.slice(0, 5)).map((row) => (
          <li
            key={row.label}
            className="flex items-center justify-between gap-4 py-3"
          >
            <span className="desk-label">{row.label}</span>
            {mark(row.state)}
          </li>
        ))}
      </ul>
    </section>
  );
}

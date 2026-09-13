export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function formatAddress(address: string | null): string {
  if (!address) {
    return "No wallet yet";
  }
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
}

export function decisionLabel(
  decision: "ALLOW" | "DENY" | "REQUIRE_APPROVAL" | null,
  approvalStatus?: "pending" | "approved" | "rejected" | null,
): string {
  if (approvalStatus === "approved") return "Approved";
  if (approvalStatus === "rejected") return "Rejected";
  if (decision === "ALLOW") return "Allowed";
  if (decision === "DENY") return "Denied";
  if (decision === "REQUIRE_APPROVAL") return "Needs approval";
  return "Unknown";
}

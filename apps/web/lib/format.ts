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

export function formatTxHash(hash: string | null): string {
  if (!hash) {
    return "Not sent";
  }
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
}

export function explorerTxUrl(
  hash: string | null,
  mode: "simulated" | "testnet" | null,
): string | null {
  if (!hash || mode !== "testnet") {
    return null;
  }
  const base =
    process.env.NEXT_PUBLIC_EXPLORER_TX_URL ?? "https://sepolia.etherscan.io/tx/";
  return `${base}${hash}`;
}

export function decisionLabel(
  decision: "ALLOW" | "DENY" | "REQUIRE_APPROVAL" | null,
  approvalStatus?: "pending" | "approved" | "rejected" | null,
  txStatus?: "pending" | "broadcast" | "confirmed" | "failed" | null,
  ledgerStatus?: "not_required" | "pending" | "confirmed" | "rejected" | null,
): string {
  if (txStatus === "failed") return "Failed";
  if (txStatus === "broadcast" || txStatus === "confirmed") return "Executed";
  if (ledgerStatus === "rejected") return "Ledger rejected";
  if (approvalStatus === "approved" && ledgerStatus === "pending") {
    return "Waiting for Ledger";
  }
  if (approvalStatus === "approved") return "Approved";
  if (approvalStatus === "rejected") return "Rejected";
  if (decision === "ALLOW") return "Allowed";
  if (decision === "DENY") return "Denied";
  if (decision === "REQUIRE_APPROVAL") return "Needs approval";
  return "Unknown";
}

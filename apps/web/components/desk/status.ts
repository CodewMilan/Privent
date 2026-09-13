import type { PermissionRow } from "@privent/shared";
import type { PresentedAction } from "../../lib/api";

export function tone(
  decision: PresentedAction["policyDecision"] | PermissionRow["state"],
) {
  if (decision === "ALLOW" || decision === "allowed") return "text-allow";
  if (decision === "DENY" || decision === "denied") return "text-deny";
  return "text-wait";
}

export function rowTone(item: PresentedAction) {
  return tone(
    item.txStatus === "failed" ||
      item.approvalStatus === "rejected" ||
      item.ledgerStatus === "rejected"
      ? "DENY"
      : item.txStatus === "confirmed" || item.txStatus === "broadcast"
        ? "ALLOW"
        : item.ledgerStatus === "pending" ||
            item.approvalStatus === "pending"
          ? "REQUIRE_APPROVAL"
          : item.approvalStatus === "approved"
            ? "ALLOW"
            : item.policyDecision,
  );
}

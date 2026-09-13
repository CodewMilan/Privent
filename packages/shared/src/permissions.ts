export type PermissionState = "allowed" | "approval" | "denied";

export interface PermissionRow {
  label: string;
  state: PermissionState;
}

export function describePermissions(policy: {
  approvalThreshold: number;
  denyThreshold: number;
  allowedAssets: string[];
  allowedRecipients?: string[];
}): PermissionRow[] {
  const rows: PermissionRow[] = [
    { label: "Read treasury", state: "allowed" },
    { label: "Analyze markets", state: "allowed" },
    {
      label: `Spend under $${policy.approvalThreshold.toLocaleString("en-US")}`,
      state: "allowed",
    },
    {
      label: `Spend $${policy.approvalThreshold.toLocaleString("en-US")}–$${policy.denyThreshold.toLocaleString("en-US")}`,
      state: "approval",
    },
    {
      label: `Spend over $${policy.denyThreshold.toLocaleString("en-US")}`,
      state: "denied",
    },
    {
      label: `Use ${policy.allowedAssets.join(", ") || "no assets"}`,
      state: policy.allowedAssets.length > 0 ? "allowed" : "denied",
    },
  ];

  if (policy.allowedRecipients && policy.allowedRecipients.length > 0) {
    const count = policy.allowedRecipients.length;
    rows.push({
      label:
        count === 1
          ? "Send only to the allowlisted recipient"
          : `Send only to ${count} allowlisted recipients`,
      state: "allowed",
    });
  }

  rows.push(
    { label: "Change permissions", state: "denied" },
    { label: "Export private key", state: "denied" },
  );

  return rows;
}

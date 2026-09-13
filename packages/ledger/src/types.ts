import type { ExecutionPermit } from "@privent/blockchain";

export type LedgerDevice = "simulated" | "cli";

export type LedgerConfirmStatus = "pending" | "confirmed" | "rejected";

export interface LedgerPreview {
  to: string;
  amountLabel: string;
  asset: string;
  dryRun: true;
  command: string;
}

export interface GenuineCheck {
  genuine: boolean;
  source: LedgerDevice;
}

export interface LedgerConfirmation {
  actionRequestId: string;
  status: LedgerConfirmStatus;
  device: LedgerDevice;
  preview: LedgerPreview;
}

export interface LedgerSigner {
  readonly kind: LedgerDevice;
  genuineCheck(): Promise<GenuineCheck>;
  preview(permit: ExecutionPermit): Promise<LedgerPreview>;
  confirm(permit: ExecutionPermit): Promise<LedgerConfirmation>;
}

export function previewFromPermit(permit: ExecutionPermit): LedgerPreview {
  const dollars = (permit.transfer.amountCents / 100).toLocaleString("en-US");
  return {
    to: permit.transfer.to,
    amountLabel: `${dollars} ${permit.transfer.asset}`,
    asset: permit.transfer.asset,
    dryRun: true,
    command: `wallet-cli send privent --to ${permit.transfer.to} --amount '${dollars} ${permit.transfer.asset}' --dry-run`,
  };
}

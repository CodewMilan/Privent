import type { ExecutionMode } from "@privent/shared";

export interface ArcPaymentRequest {
  actionRequestId: string;
  resource: string;
  to: string;
  amountCents: number;
  asset: "USDC";
  reason: string;
}

export interface ArcPaymentReceipt {
  actionRequestId: string;
  status: "settled" | "rejected" | "failed";
  settlementId: string | null;
  fromAddress: string;
  toAddress: string;
  resource: string;
  amountCents: number;
  network: "arc-testnet" | "simulated";
  simulated: boolean;
  error: string | null;
}

export interface ArcPayer {
  readonly kind: "simulated" | "circle";
  pay(request: ArcPaymentRequest): Promise<ArcPaymentReceipt>;
}

export function modeFromReceipt(receipt: ArcPaymentReceipt): ExecutionMode {
  return receipt.simulated ? "simulated" : "arc";
}

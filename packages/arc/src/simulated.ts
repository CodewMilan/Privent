import { randomUUID } from "node:crypto";
import type { ArcPayer, ArcPaymentReceipt, ArcPaymentRequest } from "./types.js";

export const PROTOCOL_BRIEF = {
  resource: "protocol-brief",
  amountCents: 2,
  asset: "USDC" as const,
  reason: "Pay for Uniswap V3 protocol brief",
};

export const SIMULATED_ARC_FROM =
  "0xa4c0000000000000000000000000000000000001";

/**
 * Local x402-shaped payer. Confirm is a receipt, not a Circle Gateway
 * settlement. Use this when CIRCLE_ENTITY_SECRET / ARC_WALLET_ADDRESS
 * are missing — do not pretend the payment landed on Arc testnet.
 */
export function createSimulatedArcPayer(
  options: { reject?: boolean } = {},
): ArcPayer {
  return {
    kind: "simulated",
    async pay(request: ArcPaymentRequest): Promise<ArcPaymentReceipt> {
      if (options.reject) {
        return {
          actionRequestId: request.actionRequestId,
          status: "rejected",
          settlementId: null,
          fromAddress: SIMULATED_ARC_FROM,
          toAddress: request.to,
          resource: request.resource,
          amountCents: request.amountCents,
          network: "simulated",
          simulated: true,
          error: "Arc payer rejected the nanopayment",
        };
      }

      return {
        actionRequestId: request.actionRequestId,
        status: "settled",
        settlementId: `arc_sim_${randomUUID().replaceAll("-", "")}`,
        fromAddress: SIMULATED_ARC_FROM,
        toAddress: request.to,
        resource: request.resource,
        amountCents: request.amountCents,
        network: "simulated",
        simulated: true,
        error: null,
      };
    },
  };
}

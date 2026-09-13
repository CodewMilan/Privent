import { dollarsToCents, type ProposeActionInput, type ProposedAction } from "@privent/shared";

const ALLOWED_ACTIONS = new Set(["TRANSFER", "PAYMENT"]);

export function proposeAction(input: ProposeActionInput): ProposedAction {
  if (!ALLOWED_ACTIONS.has(input.action)) {
    throw new Error("Unsupported action type");
  }

  if (!input.reason.trim()) {
    throw new Error("reason is required");
  }

  const amountCents = dollarsToCents(input.amount);
  if (amountCents <= 0) {
    throw new Error("amount must be greater than 0");
  }

  return {
    action: input.action,
    asset: input.asset.trim().toUpperCase(),
    amountCents,
    recipient: input.recipient?.trim() || null,
    contract: input.contract?.trim() || null,
    reason: input.reason.trim(),
  };
}

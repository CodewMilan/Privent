import type { FormEvent } from "react";
import { DeskButton } from "./button";

export function PaymentForm({
  defaultRecipient,
  busy,
  error,
  onSubmit,
  onClose,
}: {
  defaultRecipient: string;
  busy: boolean;
  error: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  return (
    <section className="desk-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2>New payment</h2>
          <p className="lede">Same policy path as an agent request.</p>
        </div>
        <DeskButton ghost onClick={onClose}>
          Close
        </DeskButton>
      </div>
      <form className="mt-5 grid gap-4" onSubmit={onSubmit}>
        <label className="desk-label">
          Amount (USD)
          <input
            required
            className="desk-field"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="320"
          />
        </label>
        <label className="desk-label">
          Recipient
          <input
            required
            className="desk-field"
            name="recipient"
            type="text"
            defaultValue={defaultRecipient}
            autoComplete="off"
          />
        </label>
        <label className="desk-label">
          Reason
          <input
            required
            className="desk-field"
            name="reason"
            type="text"
            placeholder="Vendor payment"
            autoComplete="off"
          />
        </label>
        <DeskButton type="submit" busy={busy}>
          Submit
        </DeskButton>
        {error && <p className="text-sm text-deny">{error}</p>}
      </form>
    </section>
  );
}

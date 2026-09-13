export function dollarsToCents(dollars: number): number {
  if (!Number.isFinite(dollars)) {
    throw new Error("Amount must be a finite number");
  }

  return Math.round(dollars * 100);
}

export function centsToDollars(cents: number): number {
  return cents / 100;
}

export function formatDollars(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

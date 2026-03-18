export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export function fundingPercentage(
  totalContributed: number,
  price: number,
): number {
  if (price <= 0) return 100;
  return Math.min(Math.round((totalContributed / price) * 100), 100);
}

export function remainingAmount(
  totalContributed: number,
  price: number,
): number {
  return Math.max(price - totalContributed, 0);
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    available: "Available",
    partially_funded: "Partially Funded",
    funded: "Funded",
    archived: "Archived",
  };
  return labels[status] ?? status;
}

export function priorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    must_have: "Must Have",
    nice_to_have: "Nice to Have",
    dream: "Dream",
  };
  return labels[priority] ?? priority;
}

// Pure formatter (no server deps) so client + server can share it.
// e.g. "Monthly · $0.99/month" from interval "month", amount 99 (cents), currency "usd".
export function planLabel(
  interval?: string | null,
  amount?: number | null,
  currency?: string | null,
): string | null {
  if (!interval) return null;
  const name = interval === "year" ? "Yearly" : "Monthly";
  if (amount == null) return name;
  const price = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: (currency ?? "usd").toUpperCase(),
  }).format(amount / 100);
  return `${name} · ${price}/${interval}`;
}

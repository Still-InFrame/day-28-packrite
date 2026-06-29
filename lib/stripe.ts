import Stripe from "stripe";

// Server-side Stripe client. Null when not configured (so routes can return a
// graceful "coming soon" instead of crashing).
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  return key ? new Stripe(key) : null;
}

export function priceFor(interval: "monthly" | "yearly"): string | undefined {
  return interval === "yearly"
    ? process.env.STRIPE_PRICE_YEARLY
    : process.env.STRIPE_PRICE_MONTHLY;
}

export const SUB_SECRET = () => process.env.STRIPE_DB_SECRET ?? "";

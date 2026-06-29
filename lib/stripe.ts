import Stripe from "stripe";

// "test" runs checkout against the Stripe sandbox keys (card 4242 4242 4242 4242);
// anything else uses the live keys. Lets us verify the flow without real charges,
// then flip back by changing one env var. Strict: test mode reads ONLY the *_TEST
// vars, so an unfilled test key fails loudly instead of silently using live.
export const STRIPE_MODE: "test" | "live" =
  process.env.STRIPE_MODE === "test" ? "test" : "live";

const isTest = STRIPE_MODE === "test";

// Server-side Stripe client. Null when not configured (so routes can return a
// graceful "coming soon" instead of crashing).
export function getStripe(): Stripe | null {
  const key = isTest
    ? process.env.STRIPE_SECRET_KEY_TEST
    : process.env.STRIPE_SECRET_KEY;
  return key ? new Stripe(key) : null;
}

export function priceFor(interval: "monthly" | "yearly"): string | undefined {
  if (isTest) {
    return interval === "yearly"
      ? process.env.STRIPE_PRICE_YEARLY_TEST
      : process.env.STRIPE_PRICE_MONTHLY_TEST;
  }
  return interval === "yearly"
    ? process.env.STRIPE_PRICE_YEARLY
    : process.env.STRIPE_PRICE_MONTHLY;
}

// Webhook signing secret for the active mode (test and live webhooks differ).
export function webhookSecret(): string | undefined {
  return isTest
    ? process.env.STRIPE_WEBHOOK_SECRET_TEST
    : process.env.STRIPE_WEBHOOK_SECRET;
}

export const SUB_SECRET = () => process.env.STRIPE_DB_SECRET ?? "";

// current_period_end moved from the subscription root onto its items in recent
// Stripe API versions. Read whichever is present so the renewal date (and the
// period-end downgrade) work regardless of pinned version. Returns ISO or null.
export function subPeriodEndISO(sub: Stripe.Subscription): string | null {
  const item = sub.items?.data?.[0] as { current_period_end?: number } | undefined;
  const root = (sub as { current_period_end?: number }).current_period_end;
  const ts = item?.current_period_end ?? root ?? null;
  return ts ? new Date(ts * 1000).toISOString() : null;
}

// Plan type + price for display: read from the subscription's price (recurring
// interval, unit amount in cents, currency). null when unavailable.
export function subPlanInfo(sub: Stripe.Subscription): {
  interval: string | null;
  amount: number | null;
  currency: string | null;
} {
  const price = sub.items?.data?.[0]?.price;
  return {
    interval: price?.recurring?.interval ?? null,
    amount: price?.unit_amount ?? null,
    currency: price?.currency ?? null,
  };
}

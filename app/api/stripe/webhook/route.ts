import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  getStripe,
  webhookSecret,
  subPeriodEndISO,
  subPlanInfo,
} from "@/lib/stripe";
import { createPublicClient } from "@/lib/supabase/public";

export const runtime = "nodejs";

// Stripe -> us. Verifies the signature, then writes subscription state through
// the secret-gated SECURITY DEFINER function (no service-role key).
export async function POST(request: Request) {
  const stripe = getStripe();
  const whSecret = webhookSecret();
  if (!stripe || !whSecret) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const sig = request.headers.get("stripe-signature");
  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig ?? "", whSecret);
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const s = event.data.object as Stripe.Subscription;
    const userId = s.metadata?.user_id;
    if (userId) {
      const active =
        event.type !== "customer.subscription.deleted" &&
        (s.status === "active" || s.status === "trialing");
      const info = subPlanInfo(s);
      await createPublicClient().rpc("packrite_apply_subscription", {
        p_secret: process.env.STRIPE_DB_SECRET ?? "",
        p_user: userId,
        p_active: active,
        p_status: s.status,
        p_customer: typeof s.customer === "string" ? s.customer : s.customer.id,
        p_subscription: s.id,
        p_period_end: subPeriodEndISO(s),
        p_cancel_at_period_end: s.cancel_at_period_end ?? false,
        p_interval: info.interval,
        p_amount: info.amount,
        p_currency: info.currency,
      });
    }
  }

  return NextResponse.json({ received: true });
}

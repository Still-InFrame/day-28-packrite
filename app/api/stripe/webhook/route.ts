import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createPublicClient } from "@/lib/supabase/public";

export const runtime = "nodejs";

// Stripe -> us. Verifies the signature, then writes subscription state through
// the secret-gated SECURITY DEFINER function (no service-role key).
export async function POST(request: Request) {
  const stripe = getStripe();
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
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
    const s = event.data.object as Stripe.Subscription & {
      current_period_end?: number;
    };
    const userId = s.metadata?.user_id;
    if (userId) {
      const active = s.status === "active" || s.status === "trialing";
      await createPublicClient().rpc("packrite_apply_subscription", {
        p_secret: process.env.STRIPE_DB_SECRET ?? "",
        p_user: userId,
        p_active: active,
        p_status: s.status,
        p_customer: typeof s.customer === "string" ? s.customer : s.customer.id,
        p_subscription: s.id,
        p_period_end: s.current_period_end
          ? new Date(s.current_period_end * 1000).toISOString()
          : null,
      });
    }
  }

  return NextResponse.json({ received: true });
}

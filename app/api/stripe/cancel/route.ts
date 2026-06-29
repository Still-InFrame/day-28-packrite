import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getStripe, subPeriodEndISO, subPlanInfo } from "@/lib/stripe";

export const runtime = "nodejs";

// Cancel (or resume) the user's subscription. Cancel uses Stripe's
// cancel_at_period_end so access continues until the paid-through date, then the
// webhook (or the lazy DB downgrade) flips the plan back to free. Resume undoes it.
export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const resume = body?.resume === true;

  const { data: sub } = await supabase
    .from("packrite_subscriptions")
    .select("stripe_subscription_id, source")
    .maybeSingle();

  if (sub?.source !== "stripe" || !sub?.stripe_subscription_id) {
    return NextResponse.json(
      { error: "No active subscription to manage." },
      { status: 400 },
    );
  }

  let updated: Stripe.Subscription;
  try {
    updated = await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: !resume,
    });
  } catch {
    return NextResponse.json(
      { error: "Couldn't update the subscription. Please try again." },
      { status: 502 },
    );
  }

  const periodEnd = subPeriodEndISO(updated);
  const info = subPlanInfo(updated);

  // Still active until the period ends; just flag the pending cancellation.
  const { error } = await supabase.rpc("packrite_apply_subscription", {
    p_secret: process.env.STRIPE_DB_SECRET ?? "",
    p_user: user.id,
    p_active: true,
    p_status: updated.status,
    p_customer:
      typeof updated.customer === "string"
        ? updated.customer
        : (updated.customer?.id ?? null),
    p_subscription: updated.id,
    p_period_end: periodEnd,
    p_cancel_at_period_end: !resume,
    p_interval: info.interval,
    p_amount: info.amount,
    p_currency: info.currency,
  });
  if (error) {
    return NextResponse.json({ error: "Couldn't save change." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    cancelAtPeriodEnd: !resume,
    currentPeriodEnd: periodEnd,
  });
}

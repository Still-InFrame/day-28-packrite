import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, priceFor } from "@/lib/stripe";

export const runtime = "nodejs";

// Creates an Embedded Checkout session (in-app card form, no redirect to Stripe)
// and returns its client secret. The Settings plan card opens it in a sheet.
export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Subscriptions aren't enabled yet — coming soon!" },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const interval = body?.interval === "yearly" ? "yearly" : "monthly";
  const price = priceFor(interval);
  if (!price) {
    return NextResponse.json({ error: "Price not configured." }, { status: 500 });
  }

  // Reuse the user's existing Stripe customer if we have one, else find/create.
  const { data: sub } = await supabase
    .from("packrite_subscriptions")
    .select("stripe_customer_id")
    .maybeSingle();
  let customerId = sub?.stripe_customer_id ?? undefined;
  if (!customerId && user.email) {
    const existing = await stripe.customers.list({ email: user.email, limit: 1 });
    customerId = existing.data[0]?.id;
  }
  if (!customerId) {
    const c = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    });
    customerId = c.id;
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? new URL(request.url).origin;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    ui_mode: "embedded_page",
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    return_url: `${base}/settings?stripe_session={CHECKOUT_SESSION_ID}`,
    metadata: { user_id: user.id },
    subscription_data: { metadata: { user_id: user.id } },
  });

  return NextResponse.json({ clientSecret: session.client_secret });
}

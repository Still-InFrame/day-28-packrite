import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Stub until Stripe is configured. Once STRIPE_SECRET_KEY + price IDs are set,
// this creates a Stripe Checkout session and returns its URL. The Settings
// upgrade buttons already call it.
export async function POST() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Subscriptions aren't enabled yet — coming soon!" },
      { status: 503 },
    );
  }
  // TODO: create a Stripe Checkout session for the chosen interval.
  return NextResponse.json(
    { error: "Checkout not implemented yet." },
    { status: 501 },
  );
}

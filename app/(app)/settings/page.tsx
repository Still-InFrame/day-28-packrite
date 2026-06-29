import type Stripe from "stripe";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { KeyManager } from "@/components/KeyManager";
import { PlanCard } from "@/components/PlanCard";
import { SignOutButton } from "@/components/SignOutButton";
import { Wordmark } from "@/components/Brand";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ stripe_session?: string }>;
}) {
  const { stripe_session } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Returning from Embedded Checkout: verify the session and activate instantly
  // (the webhook is the durable backstop for renewals/cancellations).
  let upgraded = false;
  const stripe = getStripe();
  if (stripe_session && user && stripe) {
    try {
      const session = await stripe.checkout.sessions.retrieve(stripe_session, {
        expand: ["subscription"],
      });
      if (
        session.status === "complete" &&
        session.metadata?.user_id === user.id
      ) {
        const subObj = session.subscription as
          | (Stripe.Subscription & { current_period_end?: number })
          | null;
        await supabase.rpc("packrite_apply_subscription", {
          p_secret: process.env.STRIPE_DB_SECRET ?? "",
          p_user: user.id,
          p_active: true,
          p_status: subObj?.status ?? "active",
          p_customer:
            typeof session.customer === "string"
              ? session.customer
              : (session.customer?.id ?? null),
          p_subscription: subObj?.id ?? null,
          p_period_end: subObj?.current_period_end
            ? new Date(subObj.current_period_end * 1000).toISOString()
            : null,
        });
        upgraded = true;
      }
    } catch {
      // ignore — webhook will reconcile
    }
  }

  const { data: sub } = await supabase
    .from("packrite_subscriptions")
    .select("plan, source, free_used")
    .maybeSingle();
  const { data: keyRow } = await supabase
    .from("packrite_user_api_keys")
    .select("user_id")
    .maybeSingle();

  return (
    <div className="flex-1 px-5 pb-28 pt-8">
      <header className="mb-7 flex items-center justify-between">
        <Wordmark />
      </header>

      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted">
        Signed in as {user?.email}
      </p>

      {upgraded && (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          You&apos;re on Unlimited — thanks for subscribing! 🎉
        </div>
      )}

      <div className="mt-6 flex flex-col gap-4">
        <PlanCard
          plan={(sub?.plan as "free" | "unlimited") ?? "free"}
          source={(sub?.source as "none" | "stripe" | "admin") ?? "none"}
          hasKey={Boolean(keyRow)}
          freeUsed={sub?.free_used ?? 0}
          limit={30}
        />
        <KeyManager />

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <h2 className="text-base font-semibold">Account</h2>
          <p className="mt-1 mb-4 text-sm text-muted">
            Sign out of packrite on this device.
          </p>
          <SignOutButton />
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-zinc-400">
        <Link href="/terms" className="hover:text-foreground hover:underline">
          Terms
        </Link>
        {" · "}
        <Link href="/privacy" className="hover:text-foreground hover:underline">
          Privacy
        </Link>
      </p>
    </div>
  );
}

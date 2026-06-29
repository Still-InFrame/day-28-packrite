"use client";

import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";

// Loaded once. Null when the publishable key is missing from the bundle, so we
// can show a clear message instead of a blank sheet. Both NEXT_PUBLIC_* keys are
// referenced literally so Next inlines them at build time; the mode flag picks one.
const TEST_MODE = process.env.NEXT_PUBLIC_STRIPE_MODE === "test";
const PUBLISHABLE_KEY =
  (TEST_MODE
    ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST
    : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) ?? "";
const stripePromise = PUBLISHABLE_KEY ? loadStripe(PUBLISHABLE_KEY) : null;

export function CheckoutSheet({
  clientSecret,
  onClose,
}: {
  clientSecret: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl sm:rounded-3xl">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-semibold">Upgrade to Unlimited</span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-foreground"
          >
            <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden>
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {stripePromise ? (
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{ clientSecret }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        ) : (
          <p className="px-2 py-8 text-center text-sm text-muted">
            Payments aren&apos;t fully configured yet
            (missing publishable key). Please try again shortly.
          </p>
        )}
      </div>
    </div>
  );
}

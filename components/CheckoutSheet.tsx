"use client";

import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";

// Loaded once. Empty key just means the form won't init (publishable key unset).
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
);

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
        <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    </div>
  );
}

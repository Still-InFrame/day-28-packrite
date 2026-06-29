"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { CheckoutSheet } from "@/components/CheckoutSheet";
import { cn } from "@/lib/cn";

interface Props {
  plan: "free" | "unlimited";
  source: "none" | "stripe" | "admin";
  hasKey: boolean;
  freeUsed: number;
  limit: number;
}

export function PlanCard({ plan, source, hasKey, freeUsed, limit }: Props) {
  const [loading, setLoading] = useState<"monthly" | "yearly" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // BYO key and unlimited plans don't need an upgrade.
  const unlimited = hasKey || plan === "unlimited";

  async function checkout(interval: "monthly" | "yearly") {
    setLoading(interval);
    setError(null);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ interval }),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(null);
    if (!res.ok || !json.clientSecret) {
      setError(json.error ?? "Couldn't start checkout.");
      return;
    }
    setClientSecret(json.clientSecret);
  }

  const used = Math.min(freeUsed, limit);
  const pct = Math.round((used / limit) * 100);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Plan</h2>
          <p className="mt-1 text-sm text-muted">
            {unlimited
              ? hasKey
                ? "Unlimited — powered by your own API key."
                : source === "admin"
                  ? "Unlimited — granted by the team."
                  : "Unlimited — thanks for subscribing!"
              : "Free plan. Upgrade for unlimited cataloging."}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
            unlimited ? "bg-accent-soft text-accent" : "bg-zinc-100 text-zinc-600",
          )}
        >
          {unlimited ? "Unlimited" : "Free"}
        </span>
      </div>

      {!unlimited && (
        <>
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
              <span>Free catalogs used</span>
              <span className="font-medium text-foreground">
                {used} / {limit}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  pct >= 100 ? "bg-amber-500" : "bg-accent",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-border p-4">
            <p className="text-sm font-medium">Unlimited cataloging</p>
            <p className="mt-0.5 text-sm text-muted">
              Keep snapping with no daily limit.
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                onClick={() => checkout("monthly")}
                loading={loading === "monthly"}
                className="flex-1"
              >
                $0.99 / mo
              </Button>
              <Button
                onClick={() => checkout("yearly")}
                loading={loading === "yearly"}
                variant="secondary"
                className="flex-1"
              >
                $10 / yr
                <span className="ml-1 rounded bg-emerald-100 px-1 text-[10px] font-semibold text-emerald-700">
                  SAVE
                </span>
              </Button>
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <p className="mt-2 text-center text-xs text-zinc-400">
              Or add your own Anthropic key below for unlimited, free.
            </p>
          </div>
        </>
      )}

      {clientSecret && (
        <CheckoutSheet
          clientSecret={clientSecret}
          onClose={() => setClientSecret(null)}
        />
      )}
    </div>
  );
}

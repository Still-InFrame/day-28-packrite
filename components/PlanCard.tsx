"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { UpgradeButtons } from "@/components/UpgradeButtons";
import { planLabel } from "@/lib/plan";
import { cn } from "@/lib/cn";

interface Props {
  plan: "free" | "unlimited";
  source: "none" | "stripe" | "admin";
  hasKey: boolean;
  freeUsed: number;
  limit: number;
  stripeManaged?: boolean;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string | null;
  interval?: string | null;
  amount?: number | null;
  currency?: string | null;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

export function PlanCard({
  plan,
  source,
  hasKey,
  freeUsed,
  limit,
  stripeManaged = false,
  cancelAtPeriodEnd = false,
  currentPeriodEnd = null,
  interval = null,
  amount = null,
  currency = null,
}: Props) {
  const router = useRouter();
  const label = planLabel(interval, amount, currency);
  const [error, setError] = useState<string | null>(null);
  const [managing, setManaging] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function manage(resume: boolean): Promise<boolean> {
    setManaging(true);
    setError(null);
    const res = await fetch("/api/stripe/cancel", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ resume }),
    });
    const json = await res.json().catch(() => ({}));
    setManaging(false);
    if (!res.ok) {
      setError(json.error ?? "Something went wrong.");
      return false;
    }
    router.refresh();
    return true;
  }

  // BYO key and unlimited plans don't need an upgrade.
  const unlimited = hasKey || plan === "unlimited";

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

      {unlimited && stripeManaged && (
        <div className="mt-4 border-t border-border pt-4">
          {label && (
            <p className="mb-2 text-sm font-medium text-foreground">{label}</p>
          )}
          {cancelAtPeriodEnd ? (
            <>
              <p className="text-sm text-foreground">
                Your subscription is set to cancel.
                {currentPeriodEnd && (
                  <>
                    {" "}
                    You keep Unlimited until{" "}
                    <span className="font-medium">
                      {fmtDate(currentPeriodEnd)}
                    </span>
                    , then it reverts to Free.
                  </>
                )}
              </p>
              <div className="mt-3">
                <Button
                  variant="secondary"
                  onClick={() => manage(true)}
                  loading={managing}
                >
                  Resume subscription
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">
                {currentPeriodEnd ? (
                  <>
                    Renews on{" "}
                    <span className="font-medium text-foreground">
                      {fmtDate(currentPeriodEnd)}
                    </span>
                    .
                  </>
                ) : (
                  "Active subscription."
                )}
              </p>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setConfirming(true);
                }}
                className="mt-2 text-xs text-zinc-400 underline-offset-2 hover:text-zinc-600 hover:underline"
              >
                Cancel subscription
              </button>
            </>
          )}
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      )}

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
            <p className="mt-0.5 mb-3 text-sm text-muted">
              Keep snapping with no limit.
            </p>
            <UpgradeButtons />
          </div>
        </>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !managing && setConfirming(false)}
          />
          <div className="relative w-full max-w-[420px] rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
            <h3 className="text-base font-semibold">Cancel subscription?</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              {currentPeriodEnd ? (
                <>
                  You&apos;ll keep Unlimited until{" "}
                  <span className="font-medium text-foreground">
                    {fmtDate(currentPeriodEnd)}
                  </span>
                  , then your plan reverts to Free. You can resume anytime before
                  then.
                </>
              ) : (
                "You'll keep Unlimited until the end of your current billing period, then your plan reverts to Free. You can resume anytime before then."
              )}
            </p>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-5 flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                disabled={managing}
                onClick={() => setConfirming(false)}
              >
                Keep subscription
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                loading={managing}
                onClick={async () => {
                  const ok = await manage(false);
                  if (ok) setConfirming(false);
                }}
              >
                Cancel subscription
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

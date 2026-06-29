"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { CheckoutSheet } from "@/components/CheckoutSheet";

// Monthly/yearly subscribe buttons + the embedded checkout sheet. Shared by the
// settings PlanCard and the first-run onboarding so the upgrade flow is identical.
export function UpgradeButtons() {
  const [loading, setLoading] = useState<"monthly" | "yearly" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

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

  return (
    <>
      <div className="flex gap-2">
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
      {clientSecret && (
        <CheckoutSheet
          clientSecret={clientSecret}
          onClose={() => setClientSecret(null)}
        />
      )}
    </>
  );
}

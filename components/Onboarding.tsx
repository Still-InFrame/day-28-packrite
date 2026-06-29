"use client";

import { useState } from "react";
import { Wordmark } from "@/components/Brand";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

// First-run step: get the user's Anthropic key so cataloging works out of the
// box. Shown over the camera on first visit when no key is set. Saving or
// skipping dismisses it (skip is remembered so it never nags again).
export function Onboarding({
  onComplete,
}: {
  onComplete: (savedKey: boolean) => void;
}) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: value }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Could not save key.");
      setSaving(false);
      return;
    }
    onComplete(true);
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col overflow-y-auto bg-background">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-10">
        <Wordmark className="mb-8" />

        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome — one quick setup
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          packrite uses <span className="font-medium">your own</span> Anthropic
          API key to identify and describe each item you snap. Paste it once and
          you&apos;re set — it&apos;s encrypted on our server and never shown
          again.
        </p>

        <ol className="mt-6 space-y-3">
          <Step n={1}>
            Go to{" "}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-accent hover:underline"
            >
              console.anthropic.com → API Keys
            </a>{" "}
            and create a key.
          </Step>
          <Step n={2}>Paste it below and tap Continue.</Step>
          <Step n={3}>Start snapping — items catalog themselves.</Step>
        </ol>

        <div className="mt-7 flex flex-col gap-3">
          <Input
            type="password"
            autoComplete="off"
            placeholder="sk-ant-api03-…"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && value.trim() && save()}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            size="lg"
            onClick={save}
            loading={saving}
            disabled={!value.trim()}
            className="w-full"
          >
            Continue
          </Button>
          <button
            onClick={() => onComplete(false)}
            className="text-center text-sm font-medium text-muted hover:text-foreground"
          >
            Skip for now — I&apos;ll add it later
          </button>
        </div>

        <p className="mt-5 text-center text-xs text-zinc-400">
          You can capture without a key; items just wait to be cataloged until
          you add one in Settings.
        </p>
      </div>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
        {n}
      </span>
      <span className="text-sm leading-6 text-foreground">{children}</span>
    </li>
  );
}

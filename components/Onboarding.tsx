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
          Welcome to packrite
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Snap an item and it catalogs itself with AI —{" "}
          <span className="font-medium text-foreground">30 a day, free</span>. No
          setup needed.
        </p>

        <Button
          size="lg"
          onClick={() => onComplete(false)}
          className="mt-6 w-full"
        >
          Start snapping →
        </Button>

        <div className="my-6 flex items-center gap-3 text-xs text-zinc-400">
          <span className="h-px flex-1 bg-border" />
          WANT UNLIMITED?
          <span className="h-px flex-1 bg-border" />
        </div>

        <p className="text-sm leading-6 text-muted">
          Add your own Anthropic key for unlimited cataloging — billed to your
          account, a fraction of a cent per photo. Encrypted, never shown again.
        </p>

        <ol className="mt-4 space-y-3">
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
          <Step n={2}>Add a little credit under Billing.</Step>
          <Step n={3}>Paste it below.</Step>
        </ol>

        <div className="mt-5 flex flex-col gap-3">
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
            variant="secondary"
            onClick={save}
            loading={saving}
            disabled={!value.trim()}
            className="w-full"
          >
            Save key for unlimited
          </Button>
        </div>
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

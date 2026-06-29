"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface KeyStatus {
  hasKey: boolean;
  hint: string | null;
}

export function KeyManager() {
  const [status, setStatus] = useState<KeyStatus | null>(null);
  const [value, setValue] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/keys");
    if (res.ok) setStatus(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: value }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Could not save key.");
      setSaving(false);
      return;
    }
    setValue("");
    setEditing(false);
    setSaving(false);
    await load();
  }

  async function remove() {
    setSaving(true);
    await fetch("/api/keys", { method: "DELETE" });
    setSaving(false);
    await load();
  }

  const loading = status === null;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Anthropic API key</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Used to catalog your photos with Claude. Encrypted on our server and
            never shown again.
          </p>
        </div>
        <KeyBadge loading={loading} hasKey={status?.hasKey ?? false} />
      </div>

      {!loading && status.hasKey && !editing && (
        <div className="mt-4 flex items-center justify-between rounded-xl bg-zinc-50 px-3.5 py-3">
          <code className="font-mono text-sm text-foreground">
            {status.hint}
          </code>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              Replace
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={remove}
              loading={saving}
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              Remove
            </Button>
          </div>
        </div>
      )}

      {!loading && (!status.hasKey || editing) && (
        <div className="mt-4 flex flex-col gap-3">
          <Input
            type="password"
            autoComplete="off"
            placeholder="sk-ant-api03-…"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button onClick={save} loading={saving} disabled={!value.trim()}>
              Save key
            </Button>
            {editing && (
              <Button
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setValue("");
                  setError(null);
                }}
              >
                Cancel
              </Button>
            )}
          </div>
          <p className="text-xs text-zinc-400">
            Get a key at console.anthropic.com → API Keys.
          </p>
        </div>
      )}
    </div>
  );
}

function KeyBadge({
  loading,
  hasKey,
}: {
  loading: boolean;
  hasKey: boolean;
}) {
  if (loading) {
    return <span className="h-6 w-16 shrink-0 rounded-full shimmer" />;
  }
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
        hasKey
          ? "bg-emerald-50 text-emerald-700"
          : "bg-amber-50 text-amber-700"
      }`}
    >
      {hasKey ? "Connected" : "Not set"}
    </span>
  );
}

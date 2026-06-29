"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { Catalog } from "@/lib/types";

export function ShareSheet({
  open,
  onClose,
  catalog,
}: {
  open: boolean;
  onClose: () => void;
  catalog: Catalog;
}) {
  const [isShared, setIsShared] = useState(catalog.is_shared);
  const [shareId, setShareId] = useState(catalog.share_id);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  // Re-sync when the user switches which catalog they're sharing.
  useEffect(() => {
    setIsShared(catalog.is_shared);
    setShareId(catalog.share_id);
  }, [catalog.id, catalog.is_shared, catalog.share_id]);

  const link =
    typeof window !== "undefined"
      ? `${window.location.origin}/share/${shareId}`
      : "";

  async function setShared(next: boolean) {
    setBusy(true);
    setIsShared(next);
    await createClient()
      .from("packrite_catalogs")
      .update({ is_shared: next })
      .eq("id", catalog.id);
    setBusy(false);
  }

  async function rotate() {
    setBusy(true);
    const fresh = crypto.randomUUID();
    setShareId(fresh);
    setCopied(false);
    await createClient()
      .from("packrite_catalogs")
      .update({ share_id: fresh })
      .eq("id", catalog.id);
    setBusy(false);
  }

  async function copy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-end justify-center transition-opacity sm:items-center",
        open ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div
        className={cn(
          "relative w-full max-w-[480px] rounded-t-3xl bg-surface p-6 shadow-2xl transition-transform sm:rounded-3xl",
          open ? "translate-y-0" : "translate-y-full sm:translate-y-4",
        )}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-zinc-200 sm:hidden" />

        <h2 className="text-lg font-semibold">Share “{catalog.name}”</h2>
        <p className="mt-1 text-sm text-muted">
          Anyone with the link can view this catalog — read only, no sign-in.
        </p>

        <div className="mt-5 flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3">
          <span className="text-sm font-medium">Public link</span>
          <button
            role="switch"
            aria-checked={isShared}
            disabled={busy}
            onClick={() => setShared(!isShared)}
            className={cn(
              "relative h-6 w-11 rounded-full transition-colors",
              isShared ? "bg-accent" : "bg-zinc-300",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform",
                isShared ? "translate-x-[1.4rem]" : "translate-x-0.5",
              )}
            />
          </button>
        </div>

        {isShared && (
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={link}
                className="h-11 flex-1 truncate rounded-xl border border-border bg-white px-3 text-sm text-muted"
              />
              <Button onClick={copy} className="shrink-0">
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <button
              onClick={rotate}
              disabled={busy}
              className="self-start text-sm font-medium text-muted hover:text-foreground"
            >
              Generate new link (revokes the old one)
            </button>
          </div>
        )}

        <Button variant="secondary" onClick={onClose} className="mt-6 w-full">
          Done
        </Button>
      </div>
    </div>
  );
}

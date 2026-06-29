"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import type { Catalog } from "@/lib/types";

interface Props {
  catalogs: Catalog[];
  activeId: string;
  onSelect: (id: string) => void;
  userId: string;
  variant?: "dark" | "light";
}

export function CatalogSwitcher({
  catalogs,
  activeId,
  onSelect,
  userId,
  variant = "light",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const active = catalogs.find((c) => c.id === activeId) ?? catalogs[0];
  const dark = variant === "dark";

  async function createCatalog() {
    if (!name.trim()) return;
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("packrite_catalogs")
      .insert({ user_id: userId, name: name.trim() })
      .select("*")
      .single();
    setBusy(false);
    if (error || !data) return;
    onSelect(data.id);
    setName("");
    setCreating(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
          dark
            ? "bg-white/15 text-white backdrop-blur-md hover:bg-white/25"
            : "border border-border bg-surface text-foreground shadow-sm hover:bg-zinc-50",
        )}
      >
        <FolderIcon className="size-4 opacity-80" />
        <span className="max-w-[10rem] truncate">{active?.name ?? "Catalog"}</span>
        <ChevronIcon className={cn("size-4 opacity-70 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-surface p-1.5 shadow-xl">
            <div className="max-h-64 overflow-y-auto">
              {catalogs.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onSelect(c.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-zinc-100",
                    c.id === activeId && "font-medium text-accent",
                  )}
                >
                  <span className="truncate">{c.name}</span>
                  {c.id === activeId && <CheckIcon className="size-4 shrink-0" />}
                </button>
              ))}
            </div>

            <div className="my-1 h-px bg-border" />

            {creating ? (
              <div className="p-1.5">
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createCatalog()}
                  placeholder="Catalog name"
                  className="h-9 w-full rounded-lg border border-border px-3 text-sm focus:border-accent focus:outline-none"
                />
                <div className="mt-1.5 flex gap-1.5">
                  <button
                    onClick={createCatalog}
                    disabled={busy || !name.trim()}
                    className="h-8 flex-1 rounded-lg bg-accent text-xs font-medium text-white disabled:opacity-50"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setCreating(false);
                      setName("");
                    }}
                    className="h-8 rounded-lg px-3 text-xs font-medium text-muted hover:bg-zinc-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-accent hover:bg-accent-soft"
              >
                <PlusIcon className="size-4" />
                New catalog
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M3 7a2 2 0 0 1 2-2h3.6l1.7 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}
function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="m5 12 5 5 9-11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

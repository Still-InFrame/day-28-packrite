"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSignedUrl } from "@/lib/useSignedUrl";
import { cn } from "@/lib/cn";
import type { CatalogItem } from "@/lib/types";

export function ItemCard({
  item,
  onChange,
  onRemove,
  onMove,
  selectable = false,
  selected = false,
  onToggleSelect,
}: {
  item: CatalogItem;
  onChange: (next: CatalogItem) => void;
  onRemove: (id: string) => void;
  onMove: (id: string) => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const url = useSignedUrl(item.image_path);
  const processing = item.status === "pending" || item.status === "processing";
  const [menuOpen, setMenuOpen] = useState(false);

  async function remove() {
    setMenuOpen(false);
    onRemove(item.id); // optimistic
    const supabase = createClient();
    await supabase.from("packrite_catalog_items").delete().eq("id", item.id);
    if (item.image_path) {
      await supabase.storage.from("item-photos").remove([item.image_path]);
    }
  }

  async function save(field: "brand" | "description", value: string) {
    const next = { ...item, [field]: value || null };
    onChange(next); // optimistic
    await createClient()
      .from("packrite_catalog_items")
      .update({ [field]: value || null })
      .eq("id", item.id);
  }

  async function retry() {
    onChange({ ...item, status: "pending" });
    const supabase = createClient();
    await supabase
      .from("packrite_catalog_items")
      .update({ status: "pending" })
      .eq("id", item.id);
    fetch("/api/catalog", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ itemId: item.id }),
    }).catch(() => {});
  }

  return (
    <div
      className={cn(
        "animate-rise relative overflow-hidden rounded-2xl border bg-surface shadow-sm",
        selected ? "border-accent ring-2 ring-accent" : "border-border",
      )}
    >
      <div className="relative aspect-square bg-zinc-100">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={item.description ?? "Item"} className="size-full object-cover" />
        )}
        {processing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/55 backdrop-blur-[2px]">
            <span className="size-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <span className="text-xs font-medium text-accent">Cataloging…</span>
          </div>
        )}
        {item.status === "done" && item.category && !selectable && (
          <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium capitalize text-white backdrop-blur">
            {item.category}
          </span>
        )}

        {/* Overflow menu */}
        {!selectable && (
          <>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Item actions"
              className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/65"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden>
                <circle cx="12" cy="5" r="1.6" />
                <circle cx="12" cy="12" r="1.6" />
                <circle cx="12" cy="19" r="1.6" />
              </svg>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-1.5 top-10 z-20 w-36 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-xl">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onMove(item.id);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-foreground hover:bg-zinc-100"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="size-4" aria-hidden>
                      <path d="M3 7a2 2 0 0 1 2-2h3.6l1.7 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                    </svg>
                    Move to…
                  </button>
                  <button
                    onClick={remove}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="size-4" aria-hidden>
                      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Delete
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <div className="p-3">
        {processing ? (
          <div className="flex flex-col gap-2 py-1">
            <span className="h-3.5 w-4/5 rounded shimmer" />
            <span className="h-3 w-1/2 rounded shimmer" />
          </div>
        ) : item.status === "error" ? (
          <div className="flex items-center justify-between gap-2 py-1">
            <span className="text-sm text-red-600">Couldn&apos;t catalog</span>
            <button
              onClick={retry}
              className="rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-zinc-200"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <EditableField
              value={item.description}
              placeholder="Add a description"
              onSave={(v) => save("description", v)}
              className="text-sm font-medium leading-snug text-foreground"
            />

            <div className="flex items-center gap-2">
              {item.color_hex && (
                <span
                  className="size-4 shrink-0 rounded-full ring-1 ring-black/10"
                  style={{ backgroundColor: item.color_hex }}
                  title={item.primary_color ?? undefined}
                />
              )}
              <span className="truncate text-xs capitalize text-muted">
                {item.primary_color ?? "—"}
              </span>
            </div>

            <EditableField
              value={item.brand}
              placeholder="Add brand"
              onSave={(v) => save("brand", v)}
              className="text-xs text-muted"
            />
          </div>
        )}
      </div>

      {selectable && (
        <button
          onClick={() => onToggleSelect?.(item.id)}
          aria-label={selected ? "Deselect item" : "Select item"}
          className="absolute inset-0 z-30"
        >
          <span
            className={cn(
              "absolute left-2 top-2 flex size-6 items-center justify-center rounded-full border-2 transition-colors",
              selected
                ? "border-accent bg-accent text-white"
                : "border-white bg-black/25 text-transparent",
            )}
          >
            <svg viewBox="0 0 24 24" fill="none" className="size-3.5" aria-hidden>
              <path d="m5 12 5 5 9-11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}

function EditableField({
  value,
  placeholder,
  onSave,
  className,
}: {
  value: string | null;
  placeholder: string;
  onSave: (value: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (draft !== (value ?? "")) onSave(draft.trim());
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setDraft(value ?? "");
            setEditing(false);
          }
        }}
        className={cn(
          "w-full rounded-md border border-accent bg-white px-1.5 py-0.5 outline-none",
          className,
        )}
      />
    );
  }

  return (
    <button
      onClick={() => {
        setDraft(value ?? "");
        setEditing(true);
      }}
      className={cn(
        "-mx-1.5 rounded-md px-1.5 py-0.5 text-left transition-colors hover:bg-zinc-100",
        className,
        !value && "text-zinc-400",
      )}
    >
      {value || placeholder}
    </button>
  );
}

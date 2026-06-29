"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSignedUrl } from "@/lib/useSignedUrl";
import { cn } from "@/lib/cn";
import type { CatalogItem } from "@/lib/types";

export function ItemCard({
  item,
  onChange,
}: {
  item: CatalogItem;
  onChange: (next: CatalogItem) => void;
}) {
  const url = useSignedUrl(item.image_path);
  const processing = item.status === "pending" || item.status === "processing";

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
    <div className="animate-rise overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
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
        {item.status === "done" && item.category && (
          <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium capitalize text-white backdrop-blur">
            {item.category}
          </span>
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

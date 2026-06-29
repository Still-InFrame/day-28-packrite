"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useActiveCatalog } from "@/lib/useActiveCatalog";
import { CatalogSwitcher } from "@/components/CatalogSwitcher";
import { ShareSheet } from "@/components/ShareSheet";
import { MoveSheet } from "@/components/MoveSheet";
import { ItemCard } from "@/components/ItemCard";
import { Wordmark } from "@/components/Brand";
import { cn } from "@/lib/cn";
import type { Catalog, CatalogItem, ItemStatus } from "@/lib/types";

type StatusFilter = "all" | "done" | "processing" | "error";

export function CatalogView({
  initialItems,
  catalogs,
  userId,
}: {
  initialItems: CatalogItem[];
  catalogs: Catalog[];
  userId: string;
}) {
  const [items, setItems] = useState<CatalogItem[]>(initialItems);
  const [activeId, setActiveId] = useActiveCatalog(catalogs);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [shareOpen, setShareOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [moveIds, setMoveIds] = useState<string[] | null>(null);

  const activeCatalog = catalogs.find((c) => c.id === activeId) ?? catalogs[0];

  // Kick the safety-net reconciler so anything the webhook missed gets cataloged.
  useEffect(() => {
    fetch("/api/catalog/reconcile", { method: "POST" }).catch(() => {});
  }, []);

  // Live updates — cards fill themselves in as the background job finishes.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("packrite-items")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "packrite_catalog_items",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setItems((prev) => {
            if (payload.eventType === "DELETE") {
              return prev.filter((i) => i.id !== (payload.old as CatalogItem).id);
            }
            const row = payload.new as CatalogItem;
            const without = prev.filter((i) => i.id !== row.id);
            return [row, ...without].sort((a, b) =>
              a.created_at < b.created_at ? 1 : -1,
            );
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  function upsert(next: CatalogItem) {
    setItems((prev) => prev.map((i) => (i.id === next.id ? next : i)));
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitSelect() {
    setSelectMode(false);
    setSelected(new Set());
  }

  async function moveItems(ids: string[], targetId: string) {
    if (ids.length === 0) return;
    setItems((prev) =>
      prev.map((i) =>
        ids.includes(i.id) ? { ...i, catalog_id: targetId } : i,
      ),
    );
    setMoveIds(null);
    exitSelect();
    await createClient()
      .from("packrite_catalog_items")
      .update({ catalog_id: targetId })
      .in("id", ids);
  }

  async function deleteItems(ids: string[]) {
    const targets = items.filter((i) => ids.includes(i.id));
    setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
    exitSelect();
    const supabase = createClient();
    await supabase.from("packrite_catalog_items").delete().in("id", ids);
    const paths = targets
      .map((i) => i.image_path)
      .filter((p): p is string => Boolean(p));
    if (paths.length) {
      await supabase.storage.from("item-photos").remove(paths);
    }
  }

  const inCatalog = useMemo(
    () => items.filter((i) => i.catalog_id === activeId),
    [items, activeId],
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const i of inCatalog) if (i.category) set.add(i.category);
    return Array.from(set).sort();
  }, [inCatalog]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inCatalog.filter((i) => {
      if (status !== "all") {
        const s: ItemStatus =
          i.status === "pending" ? "processing" : i.status;
        if (status === "processing" && s !== "processing") return false;
        if (status === "done" && i.status !== "done") return false;
        if (status === "error" && i.status !== "error") return false;
      }
      if (category !== "all" && i.category !== category) return false;
      if (q) {
        const hay = [i.description, i.brand, i.primary_color, i.category]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [inCatalog, query, category, status]);

  return (
    <div className="flex-1 px-4 pb-28 pt-8">
      <header className="mb-5 flex items-center justify-between gap-2">
        <Wordmark />
        <div className="flex items-center gap-2">
          <button
            onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}
            className="rounded-full border border-border bg-surface px-3.5 py-2 text-sm font-medium shadow-sm hover:bg-zinc-50"
          >
            {selectMode ? "Cancel" : "Select"}
          </button>
          <button
            onClick={() => setShareOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 text-sm font-medium shadow-sm hover:bg-zinc-50"
          >
            <ShareIcon className="size-4" />
            Share
          </button>
        </div>
      </header>

      <div className="mb-4 flex items-center gap-2">
        <CatalogSwitcher
          catalogs={catalogs}
          activeId={activeId}
          onSelect={setActiveId}
          userId={userId}
        />
        <span className="text-sm text-muted">
          {inCatalog.length} {inCatalog.length === 1 ? "item" : "items"}
        </span>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search items, brands, colors…"
          className="h-11 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-ring)]"
        />
      </div>

      {/* Status + category pills */}
      <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto pb-1">
        <Pill active={status === "all" && category === "all"} onClick={() => { setStatus("all"); setCategory("all"); }}>
          All
        </Pill>
        <Pill active={status === "processing"} onClick={() => setStatus(status === "processing" ? "all" : "processing")}>
          In progress
        </Pill>
        <Pill active={status === "error"} onClick={() => setStatus(status === "error" ? "all" : "error")}>
          Failed
        </Pill>
        {categories.map((c) => (
          <Pill key={c} active={category === c} onClick={() => setCategory(category === c ? "all" : c)} className="capitalize">
            {c}
          </Pill>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState hasAny={inCatalog.length > 0} />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onChange={upsert}
              onRemove={removeItem}
              onMove={(id) => setMoveIds([id])}
              selectable={selectMode}
              selected={selected.has(item.id)}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>
      )}

      {/* Bulk action bar */}
      {selectMode && selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-[5.5rem] z-40 mx-auto flex max-w-[480px] justify-center px-4">
          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-zinc-900/95 p-1.5 text-white shadow-xl backdrop-blur">
            <span className="px-2.5 text-sm font-medium">
              {selected.size} selected
            </span>
            <button
              onClick={() => setMoveIds(Array.from(selected))}
              className="rounded-full bg-white/15 px-3.5 py-1.5 text-sm font-medium hover:bg-white/25"
            >
              Move
            </button>
            <button
              onClick={() => deleteItems(Array.from(selected))}
              className="rounded-full bg-red-500 px-3.5 py-1.5 text-sm font-medium hover:bg-red-600"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      <MoveSheet
        open={moveIds !== null}
        onClose={() => setMoveIds(null)}
        catalogs={catalogs}
        excludeId={activeId}
        count={moveIds?.length ?? 0}
        onPick={(targetId) => moveItems(moveIds ?? [], targetId)}
      />

      {activeCatalog && (
        <ShareSheet
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          catalog={activeCatalog}
        />
      )}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-accent text-white"
          : "border border-border bg-surface text-muted hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

function EmptyState({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <SearchIcon className="size-6" />
      </div>
      <p className="text-sm font-medium text-foreground">
        {hasAny ? "No items match" : "Nothing here yet"}
      </p>
      <p className="mt-1 max-w-[15rem] text-sm text-muted">
        {hasAny
          ? "Try clearing the filters or search."
          : "Head to Capture and snap your first item — it'll appear here automatically."}
      </p>
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.7" />
      <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function ShareIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M4 12v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6M12 3v12m0-12L8 7m4-4 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

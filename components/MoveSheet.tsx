"use client";

import { cn } from "@/lib/cn";
import type { Catalog } from "@/lib/types";

// Bottom sheet to pick a destination bucket. Used for both a single item and a
// bulk selection. The current bucket is excluded as a target.
export function MoveSheet({
  open,
  onClose,
  catalogs,
  excludeId,
  count,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  catalogs: Catalog[];
  excludeId: string;
  count: number;
  onPick: (targetId: string) => void;
}) {
  const targets = catalogs.filter((c) => c.id !== excludeId);

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

        <h2 className="text-lg font-semibold">
          Move {count === 1 ? "item" : `${count} items`} to…
        </h2>

        {targets.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            You only have one bucket. Create another bucket first, then move
            items into it.
          </p>
        ) : (
          <div className="mt-4 flex max-h-72 flex-col gap-1 overflow-y-auto">
            {targets.map((c) => (
              <button
                key={c.id}
                onClick={() => onPick(c.id)}
                className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-medium transition-colors hover:bg-zinc-100"
              >
                <span className="flex size-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <FolderIcon className="size-4" />
                </span>
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                <ArrowIcon className="size-4 text-zinc-400" />
              </button>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-5 h-11 w-full rounded-xl border border-border bg-surface text-sm font-medium shadow-sm hover:bg-zinc-50"
        >
          Cancel
        </button>
      </div>
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
function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

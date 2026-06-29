"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { AdminUserRow } from "@/lib/telemetry";

function fmtDate(iso: string | null): string {
  if (!iso) return "never";
  const d = new Date(iso);
  return d.toLocaleDateString("en", { month: "short", day: "numeric", year: "2-digit" });
}

export function UserList({
  users: initial,
  adminId,
}: {
  users: AdminUserRow[];
  adminId: string;
}) {
  const [users, setUsers] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(userId: string, action: "ban" | "unban" | "delete") {
    setBusy(userId);
    setError(null);
    const res = await fetch("/api/admin/user", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, action }),
    });
    setBusy(null);
    setConfirmDelete(null);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Action failed.");
      return;
    }
    if (action === "delete") {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } else {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, banned: action === "ban" } : u,
        ),
      );
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {users.map((u) => {
        const isSelf = u.id === adminId;
        const working = busy === u.id;
        return (
          <div
            key={u.id}
            className="rounded-2xl border border-border bg-surface p-3.5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{u.email}</p>
                <p className="mt-0.5 text-xs text-muted">
                  Joined {fmtDate(u.createdAt)} · Active {fmtDate(u.lastSignInAt)}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-medium",
                    u.hasKey
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-zinc-100 text-zinc-500",
                  )}
                >
                  {u.hasKey ? "Key set" : "No key"}
                </span>
                {u.banned && (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                    Blocked
                  </span>
                )}
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted">
                {u.items} {u.items === 1 ? "item" : "items"}
              </span>

              {isSelf ? (
                <span className="text-xs text-zinc-400">You</span>
              ) : confirmDelete === u.id ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted">Delete account?</span>
                  <button
                    onClick={() => act(u.id, "delete")}
                    disabled={working}
                    className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-muted hover:bg-zinc-100"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => act(u.id, u.banned ? "unban" : "ban")}
                    disabled={working}
                    className="rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-zinc-200 disabled:opacity-50"
                  >
                    {u.banned ? "Unblock" : "Block"}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(u.id)}
                    disabled={working}
                    className="rounded-lg px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

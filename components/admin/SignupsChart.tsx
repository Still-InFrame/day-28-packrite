"use client";

import { useState } from "react";
import { LineChart } from "@/components/admin/LineChart";
import { cn } from "@/lib/cn";
import type { Series } from "@/lib/telemetry";

type Range = "day" | "week" | "month";

export function SignupsChart({
  signups,
}: {
  signups: { day: Series; week: Series; month: Series };
}) {
  const [range, setRange] = useState<Range>("day");
  const series = signups[range];
  const total = series.data.reduce((a, b) => a + b, 0);

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Signups</h3>
          <p className="text-xs text-muted">
            {total} in this {range === "day" ? "month" : `last ${range === "week" ? "12 weeks" : "12 months"}`}
          </p>
        </div>
        <div className="flex gap-1 rounded-lg bg-zinc-100 p-0.5">
          {(["day", "week", "month"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                range === r
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted hover:text-foreground",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <LineChart labels={series.labels} data={series.data} />
    </div>
  );
}

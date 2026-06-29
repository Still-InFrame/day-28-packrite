"use client";

import { useState } from "react";
import { LineChart } from "@/components/admin/LineChart";
import { cn } from "@/lib/cn";
import type { Series } from "@/lib/telemetry";

type Range = "day" | "week" | "month";

const RANGE_LABEL: Record<Range, string> = {
  day: "last 30 days",
  week: "last 12 weeks",
  month: "last 12 months",
};

export function RangeChart({
  title,
  series,
  color = "#4f46e5",
}: {
  title: string;
  series: { day: Series; week: Series; month: Series };
  color?: string;
}) {
  const [range, setRange] = useState<Range>("day");
  const s = series[range];
  const total = s.data.reduce((a, b) => a + b, 0);

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted">
            {total} · {RANGE_LABEL[range]}
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
      <LineChart labels={s.labels} data={s.data} color={color} />
    </div>
  );
}

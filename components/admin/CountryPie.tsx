"use client";

import { Doughnut } from "react-chartjs-2";
import { ArcElement, Chart, Legend, Tooltip } from "chart.js";

Chart.register(ArcElement, Tooltip, Legend);

// High-contrast categorical palette — adjacent slices stay visually distinct
// (the old indigo/violet pair read as one color).
const COLORS = [
  "#4f46e5", // indigo (brand)
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#ef4444", // red
  "#8b5cf6", // violet
  "#84cc16", // lime
  "#a1a1aa", // zinc (other)
];

export function CountryPie({
  labels,
  data,
}: {
  labels: string[];
  data: number[];
}) {
  const total = data.reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="h-[200px] w-[200px] shrink-0">
        <Doughnut
          data={{
            labels,
            datasets: [{ data, backgroundColor: COLORS, borderWidth: 0 }],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            cutout: "62%",
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.parsed}` },
              },
            },
          }}
        />
      </div>

      {/* Key: country + count (+ share) */}
      <ul className="w-full flex-1 space-y-1.5">
        {labels.map((label, i) => {
          const count = data[i] ?? 0;
          const pct = total ? Math.round((count / total) * 100) : 0;
          return (
            <li
              key={label}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="truncate text-foreground">{label}</span>
              </span>
              <span className="shrink-0 tabular-nums text-muted">
                <span className="font-medium text-foreground">{count}</span>
                <span className="ml-1 text-xs text-zinc-400">{pct}%</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

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
  return (
    <div style={{ height: 240 }}>
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
            legend: {
              position: "bottom",
              labels: {
                boxWidth: 10,
                boxHeight: 10,
                padding: 12,
                font: { size: 11 },
                color: "#52525b",
              },
            },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ${ctx.parsed}`,
              },
            },
          },
        }}
      />
    </div>
  );
}

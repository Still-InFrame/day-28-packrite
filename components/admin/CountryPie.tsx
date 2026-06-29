"use client";

import { Doughnut } from "react-chartjs-2";
import { ArcElement, Chart, Legend, Tooltip } from "chart.js";

Chart.register(ArcElement, Tooltip, Legend);

const COLORS = [
  "#4f46e5",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#ea580c",
  "#16a34a",
  "#a1a1aa",
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

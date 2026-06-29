"use client";

import { Line } from "react-chartjs-2";
import {
  CategoryScale,
  Chart,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
} from "chart.js";

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
);

const options: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 300 },
  plugins: {
    legend: { display: false },
    tooltip: { intersect: false, mode: "index" },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        maxRotation: 0,
        autoSkip: true,
        maxTicksLimit: 6,
        font: { size: 10 },
        color: "#a1a1aa",
      },
    },
    y: {
      beginAtZero: true,
      border: { display: false },
      grid: { color: "#f4f4f5" },
      ticks: {
        precision: 0,
        maxTicksLimit: 4,
        font: { size: 10 },
        color: "#a1a1aa",
      },
    },
  },
  elements: { point: { radius: 0, hoverRadius: 4 } },
};

export function LineChart({
  labels,
  data,
  color = "#4f46e5",
  height = 180,
}: {
  labels: string[];
  data: number[];
  color?: string;
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <Line
        options={options}
        data={{
          labels,
          datasets: [
            {
              data,
              borderColor: color,
              backgroundColor: `${color}1f`,
              fill: true,
              tension: 0.35,
              borderWidth: 2,
            },
          ],
        }}
      />
    </div>
  );
}

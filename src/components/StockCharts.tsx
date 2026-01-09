"use client";

import { useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip as ChartTooltip,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTooltip,
  Filler,
);

type ChartCompany = {
  symbol: string;
  name: string;
  prices: { label: string; value: number }[];
};

const COMPANY_COLORS = [
  "#3B82F6", // blue-500
  "#EF4444", // red-500
  "#10B981", // emerald-500
  "#F59E0B", // amber-500
  "#8B5CF6", // violet-500
  "#EC4899", // pink-500
  "#06B6D4", // cyan-500
  "#84CC16", // lime-500
];

export function StockCharts({ companies }: { companies: ChartCompany[] }) {
  const hasAnyPrices = companies.some((c) => c.prices.length > 0);
  if (!hasAnyPrices) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-600">
        📊 No price data yet. Operator updates prices every 15 minutes via code.
      </div>
    );
  }

  // Helper to sort Y/Q labels like "Y1 Q1", "Y2 Q3" chronologically
  const parsePeriod = (label: string) => {
    const match = label.match(/Y(\d+)\s+Q(\d+)/);
    if (!match) return { year: 0, quarter: 0 };
    return { year: parseInt(match[1], 10), quarter: parseInt(match[2], 10) };
  };

  const comparePeriod = (a: string, b: string) => {
    const pa = parsePeriod(a);
    const pb = parsePeriod(b);
    if (pa.year !== pb.year) return pa.year - pb.year;
    return pa.quarter - pb.quarter;
  };

  // Build unified, sorted list of all periods across companies
  const allPeriods = useMemo(() => {
    const set = new Set<string>();
    companies.forEach((company) => {
      company.prices.forEach((price) => {
        set.add(price.label);
      });
    });
    return Array.from(set).sort(comparePeriod);
  }, [companies]);

  // Build datasets, carrying forward the last known price for each company
  const datasets = useMemo(() => {
    const bySymbol: Record<string, number[]> = {};
    const lastValues: Record<string, number | undefined> = {};

    companies.forEach((c) => {
      bySymbol[c.symbol] = [];
    });

    allPeriods.forEach((period) => {
      companies.forEach((company) => {
        const symbol = company.symbol;
        const pricePoint = company.prices.find((p) => p.label === period);
        if (pricePoint) {
          lastValues[symbol] = pricePoint.value;
        }
        const value = lastValues[symbol];
        bySymbol[symbol].push(typeof value === "number" ? value : NaN);
      });
    });

    return companies.map((company, index) => {
      const color = COMPANY_COLORS[index % COMPANY_COLORS.length];
      return {
        label: `${company.symbol} - ${company.name}`,
        data: bySymbol[company.symbol],
        borderColor: color,
        backgroundColor: color,
        borderWidth: 3,
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: "#ffffff",
        pointBorderColor: color,
        pointBorderWidth: 2,
        spanGaps: true,
      };
    });
  }, [allPeriods, companies]);

  const hasDataPoints = datasets.some((ds) => ds.data.some((v) => !Number.isNaN(v)));

  if (!allPeriods.length || !hasDataPoints) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-600">
        📊 No chartable price history yet.
      </div>
    );
  }

  const [visibleSymbols, setVisibleSymbols] = useState<string[]>(
    companies.map((c) => c.symbol)
  );

  const toggleSymbol = (symbol: string) => {
    setVisibleSymbols((prev) =>
      prev.includes(symbol)
        ? prev.filter((s) => s !== symbol)
        : [...prev, symbol]
    );
  };

  const chartData = useMemo(() => {
    const filteredDatasets = datasets.filter((ds) =>
      visibleSymbols.some((sym) => ds.label.startsWith(sym + " "))
    );

    return {
      labels: allPeriods,
      datasets: filteredDatasets,
    };
  }, [allPeriods, datasets, visibleSymbols]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "nearest" as const,
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          callbacks: {
            label: (ctx: any) => {
              const value = ctx.parsed.y as number;
              return `$${value.toFixed(2)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
        },
        y: {
          grid: {
            color: "#e5e7eb",
          },
          ticks: {
            callback: (value: number | string) => `$${Number(value).toFixed(0)}`,
          },
        },
      },
    }),
    [],
  );

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">📈 Stock Price History</h3>
          <p className="text-sm text-zinc-600">All companies over time</p>
        </div>
      </div>

      {/* Company visibility toggles */}
      <div className="flex flex-wrap gap-2 mb-4 text-xs">
        {companies.map((company, index) => {
          const active = visibleSymbols.includes(company.symbol);
          const color = COMPANY_COLORS[index % COMPANY_COLORS.length];
          return (
            <button
              key={company.symbol}
              type="button"
              onClick={() => toggleSymbol(company.symbol)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 transition-colors ${
                active
                  ? "border-transparent bg-zinc-100 text-zinc-800"
                  : "border-zinc-200 bg-white text-zinc-400"
              }`}
            >
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor: color,
                  opacity: active ? 1 : 0.25,
                }}
              />
              <span className="font-medium">{company.symbol}</span>
            </button>
          );
        })}
      </div>

      <div className="h-80">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}


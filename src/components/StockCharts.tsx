"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";

type ChartCompany = {
  symbol: string;
  name: string;
  prices: { label: string; value: number }[];
};

type ChartDataPoint = {
  period: string;
  [key: string]: string | number; // Dynamic keys for each company
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
  const allPeriods = new Set<string>();
  companies.forEach((company) => {
    company.prices.forEach((price) => {
      allPeriods.add(price.label);
    });
  });
  const sortedPeriods = Array.from(allPeriods).sort(comparePeriod);

  // Precompute quick lookup maps of prices by period per company
  const priceByCompanyAndPeriod: Record<string, Record<string, number>> = {};
  companies.forEach((company) => {
    const map: Record<string, number> = {};
    company.prices.forEach((price) => {
      map[price.label] = price.value;
    });
    priceByCompanyAndPeriod[company.symbol] = map;
  });

  // Build chart data, carrying forward the last known price for each company
  const chartData: ChartDataPoint[] = [];
  const lastValues: Record<string, number | undefined> = {};

  sortedPeriods.forEach((period) => {
    const point: ChartDataPoint = { period };

    companies.forEach((company) => {
      const symbol = company.symbol;
      const valueAtPeriod = priceByCompanyAndPeriod[symbol]?.[period];
      if (typeof valueAtPeriod === "number") {
        lastValues[symbol] = valueAtPeriod;
      }
      if (typeof lastValues[symbol] === "number") {
        point[symbol] = lastValues[symbol] as number;
      }
    });

    chartData.push(point);
  });

  const hasDataPoints = chartData.some((point) =>
    companies.some((company) => typeof point[company.symbol] === "number")
  );

  if (!chartData.length || !hasDataPoints) {
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
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
            <CartesianGrid stroke="#e5e7eb" />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 12, fill: "#6b7280" }}
              axisLine={{ stroke: "#d1d5db" }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#6b7280" }}
              axisLine={{ stroke: "#d1d5db" }}
              tickFormatter={(value: number) => `$${value.toFixed(0)}`}
            />

            {companies.map((company, index) => (
              <Line
                key={company.symbol}
                type="monotoneX"
                dataKey={company.symbol}
                stroke={COMPANY_COLORS[index % COMPANY_COLORS.length]}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={{
                  r: 4,
                  stroke: "#ffffff",
                  strokeWidth: 1,
                }}
                activeDot={{
                  r: 6,
                  stroke: "#ffffff",
                  strokeWidth: 2,
                }}
                isAnimationActive={false}
                hide={!visibleSymbols.includes(company.symbol)}
                name={`${company.symbol} - ${company.name}`}
                style={{ shapeRendering: "geometricPrecision" }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


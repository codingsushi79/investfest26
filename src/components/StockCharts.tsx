"use client";

import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
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

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">📈 Stock Price History</h3>
          <p className="text-sm text-zinc-600">All companies over time</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {companies.slice(0, 4).map((company, index) => (
            <div key={company.symbol} className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ backgroundColor: COMPANY_COLORS[index % COMPANY_COLORS.length] }}
              />
              <span className="text-zinc-700">{company.symbol}</span>
            </div>
          ))}
          {companies.length > 4 && (
            <span className="text-zinc-500">+ {companies.length - 4} more</span>
          )}
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
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
            <Legend />

            {companies.map((company, index) => (
              <Line
                key={company.symbol}
                type="monotone"
                dataKey={company.symbol}
                stroke={COMPANY_COLORS[index % COMPANY_COLORS.length]}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                name={`${company.symbol} - ${company.name}`}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


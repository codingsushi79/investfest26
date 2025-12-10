"use client";

import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type ChartCompany = {
  symbol: string;
  name: string;
  prices: { label: string; value: number }[];
};

export function StockCharts({ companies }: { companies: ChartCompany[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {companies.map((company) => (
        <div
          key={company.symbol}
          className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-800">
                {company.symbol}
              </p>
              <p className="text-xs text-zinc-500">{company.name}</p>
            </div>
            <span className="text-sm font-medium text-indigo-600">
              ${company.prices[company.prices.length - 1]?.value.toFixed(2)}
            </span>
          </div>
          <div className="mt-2 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={company.prices}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  domain={["dataMin - 5", "dataMax + 5"]}
                />
                <Tooltip
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "Price"]}
                  labelStyle={{ color: "#52525b" }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
  );
}


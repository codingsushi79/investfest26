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

type CustomTooltipProps = {
  active?: boolean;
  payload?: Array<{
    color: string;
    dataKey: string;
    name: string;
    value: number;
    payload: ChartDataPoint;
  }>;
  label?: string;
  companies: ChartCompany[];
};

const CustomTooltip = ({ active, payload, label, companies }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const companySymbol = data.dataKey;
    const price = data.value;
    const period = label;

    // Find company name
    const company = companies.find(c => c.symbol === companySymbol);

    return (
      <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-800">{`Company: ${companySymbol} - ${company?.name || 'Unknown'}`}</p>
        <p className="text-gray-600">{`Period: ${period}`}</p>
        <p className="text-green-600 font-medium">{`Price: $${price.toFixed(2)}`}</p>
      </div>
    );
  }
  return null;
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
        No price data yet. Operator updates prices every 15 minutes via code.
      </div>
    );
  }

  // Create unified timeline data
  const allPeriods = new Set<string>();
  companies.forEach(company => {
    company.prices.forEach(price => {
      allPeriods.add(price.label);
    });
  });

  const sortedPeriods = Array.from(allPeriods).sort((a, b) => {
    // Sort by year and quarter
    const aMatch = a.match(/Y(\d+)\s+Q(\d+)/);
    const bMatch = b.match(/Y(\d+)\s+Q(\d+)/);

    if (aMatch && bMatch) {
      const aYear = parseInt(aMatch[1]);
      const bYear = parseInt(bMatch[1]);
      if (aYear !== bYear) return aYear - bYear;

      const aQuarter = parseInt(aMatch[2]);
      const bQuarter = parseInt(bMatch[2]);
      return aQuarter - bQuarter;
    }

    return a.localeCompare(b);
  });

  const chartData: ChartDataPoint[] = sortedPeriods.map(period => {
    const dataPoint: ChartDataPoint = { period };

    companies.forEach(company => {
      const priceEntry = company.prices.find(p => p.label === period);
      if (priceEntry) {
        dataPoint[company.symbol] = priceEntry.value;
      }
    });

    return dataPoint;
  });

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">Stock Price History</h3>
          <p className="text-sm text-zinc-600">All companies over time • Hover for details</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-zinc-600">HH</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-zinc-600">DMI</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
            <span className="text-zinc-600">MG</span>
          </div>
          <div className="text-zinc-500">+ {companies.length - 3} more</div>
        </div>
      </div>

      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#d1d5db' }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#d1d5db' }}
              domain={["dataMin - 10", "dataMax + 10"]}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip content={<CustomTooltip companies={companies} />} />
            <Legend />

            {companies.map((company, index) => (
              <Line
                key={company.symbol}
                type="monotone"
                dataKey={company.symbol}
                stroke={COMPANY_COLORS[index % COMPANY_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3, fill: COMPANY_COLORS[index % COMPANY_COLORS.length] }}
                activeDot={{
                  r: 6,
                  fill: COMPANY_COLORS[index % COMPANY_COLORS.length],
                  stroke: '#fff',
                  strokeWidth: 2
                }}
                connectNulls={false}
                name={`${company.symbol} - ${company.name}`}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Current Prices Summary */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {companies.map((company, index) => {
          const latestPrice = company.prices[company.prices.length - 1];
          return (
            <div key={company.symbol} className="text-center">
              <div
                className="w-4 h-4 rounded-full mx-auto mb-1"
                style={{ backgroundColor: COMPANY_COLORS[index % COMPANY_COLORS.length] }}
              ></div>
              <div className="text-xs font-medium text-zinc-800">{company.symbol}</div>
              <div className="text-sm font-semibold text-zinc-900">
                ${latestPrice?.value.toFixed(2) || 'N/A'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


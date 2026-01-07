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
};

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const price = payload[0].value;

    return (
      <div className="bg-white px-2 py-1 border border-gray-300 rounded shadow-lg">
        <p className="text-green-600 font-medium text-sm">{`$${price.toFixed(2)}`}</p>
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
      <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-600 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
        📊 No price data yet. Operator updates prices every 15 minutes via code.
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


  // Check if we have valid chart data with actual values
  const hasDataPoints = chartData.some(dataPoint =>
    companies.some(company => dataPoint[company.symbol] !== undefined)
  );

  if (!chartData || chartData.length === 0 || !hasDataPoints) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-600 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
        📊 Preparing chart data...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm hover:shadow-lg transition-all duration-300 animate-in fade-in-0 slide-in-from-bottom-6 duration-700">
      <div className="flex items-center justify-between mb-6 animate-in fade-in-0 slide-in-from-top-4 duration-500">
        <div className="animate-in fade-in-0 slide-in-from-left-4 duration-500" style={{ animationDelay: '100ms' }}>
          <h3 className="text-lg font-semibold text-zinc-900 animate-in fade-in-0 duration-300" style={{ animationDelay: '200ms' }}>📈 Stock Price History</h3>
          <p className="text-sm text-zinc-600 animate-in fade-in-0 duration-300" style={{ animationDelay: '300ms' }}>All companies over time • Hover for details</p>
        </div>
        <div className="flex items-center gap-4 text-sm animate-in fade-in-0 slide-in-from-right-4 duration-500" style={{ animationDelay: '400ms' }}>
          {companies.slice(0, 3).map((company, index) => (
            <div key={company.symbol} className="flex items-center gap-2 animate-in fade-in-0 duration-300" style={{ animationDelay: `${500 + index * 100}ms` }}>
              <div className={`w-3 h-3 rounded-full animate-pulse`} style={{ backgroundColor: COMPANY_COLORS[index % COMPANY_COLORS.length] }}></div>
              <span className="text-zinc-600">{company.symbol}</span>
            </div>
          ))}
          {companies.length > 3 && (
            <div className="text-zinc-500 animate-in fade-in-0 duration-300" style={{ animationDelay: '800ms' }}>
              + {companies.length - 3} more
            </div>
          )}
        </div>
      </div>

      <div className="animate-in fade-in-0 duration-700" style={{ animationDelay: '600ms' }}>
        <ResponsiveContainer width="100%" height={400}>
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
              domain={["dataMin - 50", "dataMax + 50"]}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
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


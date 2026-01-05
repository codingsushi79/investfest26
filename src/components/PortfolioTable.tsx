type HoldingRow = {
  symbol: string;
  name: string;
  shares: number;
  latestPrice: number;
  value: number;
};

export function PortfolioTable({ rows }: { rows: HoldingRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-600">
        You have no holdings yet. Use Buy shares to get started.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in-0 slide-in-from-bottom-2">
      <table className="min-w-full divide-y divide-zinc-200 text-sm">
        <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-4 py-2">Company</th>
            <th className="px-4 py-2">Shares</th>
            <th className="px-4 py-2">Price</th>
            <th className="px-4 py-2">Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((row, index) => (
            <tr
              key={row.symbol}
              className="hover:bg-zinc-50 hover:scale-[1.01] transition-all duration-200 cursor-pointer"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <td className="px-4 py-2 font-medium text-zinc-900 animate-in fade-in-0 slide-in-from-left-2">
                {row.symbol} <span className="text-xs text-zinc-500">{row.name}</span>
              </td>
              <td className="px-4 py-2 text-zinc-800 animate-in fade-in-0 slide-in-from-right-2">{row.shares}</td>
              <td className="px-4 py-2 text-zinc-800 animate-in fade-in-0 slide-in-from-right-2">
                ${row.latestPrice.toFixed(2)}
              </td>
              <td className="px-4 py-2 font-semibold text-zinc-900 animate-in fade-in-0 slide-in-from-right-2">
                ${row.value.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


type LeaderRow = {
  name: string | null;
  username?: string;
  balance: number;
  invested: number;
  portfolioValue: number;
  holdings: { symbol: string; shares: number; value: number }[];
};

export function LeaderboardTable({ rows }: { rows: LeaderRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-zinc-200 text-sm">
        <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-4 py-2">Rank</th>
            <th className="px-4 py-2">User</th>
            <th className="px-4 py-2">Portfolio</th>
            <th className="px-4 py-2">Cash</th>
            <th className="px-4 py-2">Holdings</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((row, idx) => (
            <tr key={`${row.username}-${idx}`} className="hover:bg-zinc-50">
              <td className="px-4 py-2 text-zinc-800">{idx + 1}</td>
              <td className="px-4 py-2 font-medium text-zinc-900">
                <div className="flex flex-col">
                  {row.name && row.name.trim() !== "" && (
                    <span className="text-sm text-zinc-700">{row.name}</span>
                  )}
                  {row.username && (
                    <span className="text-xs text-zinc-500">@{row.username}</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-2 font-semibold text-indigo-700">
                ${row.portfolioValue.toFixed(2)}
                <div className="text-xs text-zinc-500">
                  Invested ${row.invested.toFixed(2)}
                </div>
              </td>
              <td className="px-4 py-2 text-zinc-800">
                ${row.balance.toFixed(2)}
              </td>
              <td className="px-4 py-2 text-xs text-zinc-600">
                {row.holdings.length === 0
                  ? "No positions"
                  : row.holdings
                      .map((h) => `${h.symbol}:${h.shares} ($${h.value.toFixed(0)})`)
                      .join(" · ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


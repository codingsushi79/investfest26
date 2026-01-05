"use client";

import { useState, useEffect } from "react";

type LeaderRow = {
  name: string | null;
  username?: string;
  email?: string | null;
  balance: number;
  invested: number;
  portfolioValue: number;
  holdings: { symbol: string; shares: number; value: number }[];
};

export function LeaderboardTable({ rows, isOperator = false }: { rows: LeaderRow[]; isOperator?: boolean }) {
  const [tradingEnded, setTradingEnded] = useState(false);

  useEffect(() => {
    const ended = localStorage.getItem("tradingEnded") === "true";
    setTradingEnded(ended);

    // Listen for storage changes (when event is ended/resumed in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "tradingEnded") {
        setTradingEnded(e.newValue === "true");
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);
  
  const getMedalEmoji = (rank: number) => {
    if (rank === 0) return "🥇";
    if (rank === 1) return "🥈";
    if (rank === 2) return "🥉";
    return null;
  };

  const getMedalBg = (rank: number) => {
    if (!tradingEnded) return "";
    if (rank === 0) return "bg-yellow-100";
    if (rank === 1) return "bg-gray-200";
    if (rank === 2) return "bg-amber-100";
    return "";
  };

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm hover:shadow-lg transition-all duration-300 animate-in fade-in-0 slide-in-from-bottom-4">
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
          {rows.map((row, idx) => {
            const medal = getMedalEmoji(idx);
            const bgClass = getMedalBg(idx);
            return (
            <tr
              key={`${row.username}-${idx}`}
              className={`hover:bg-zinc-50 hover:scale-[1.01] transition-all duration-200 cursor-pointer ${bgClass}`}
              style={{ animationDelay: `${idx * 75}ms` }}
            >
              <td className="px-4 py-2 text-zinc-800 font-semibold animate-in fade-in-0 slide-in-from-left-3">
                {medal || idx + 1}
              </td>
              <td className="px-4 py-2 font-medium text-zinc-900 animate-in fade-in-0 slide-in-from-left-2">
                <div className="flex flex-col">
                  {row.name && row.name.trim() !== "" && (
                    <span className="text-sm text-zinc-700">{row.name}</span>
                  )}
                  {row.username && (
                    <span className="text-xs text-zinc-500">@{row.username}</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-2 font-semibold text-indigo-700 animate-in fade-in-0 slide-in-from-right-2">
                ${row.portfolioValue.toFixed(2)}
                <div className="text-xs text-zinc-500">
                  Invested ${row.invested.toFixed(2)}
                </div>
              </td>
              <td className="px-4 py-2 text-zinc-800 animate-in fade-in-0 slide-in-from-right-2">
                ${row.balance.toFixed(2)}
              </td>
              <td className="px-4 py-2 text-xs text-zinc-600 animate-in fade-in-0 slide-in-from-right-2">
                {row.holdings.length === 0
                  ? "No positions"
                  : row.holdings
                      .map((h) => `${h.symbol}:${h.shares} ($${h.value.toFixed(0)})`)
                      .join(" · ")}
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


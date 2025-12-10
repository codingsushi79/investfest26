"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";

interface Portfolio {
  userId: string;
  username: string | null;
  name: string | null;
  balance: number;
  holdings: Array<{
    symbol: string;
    shares: number;
    latestPrice: number;
    value: number;
  }>;
}

export default function PortfoliosPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchPortfolios();
  }, []);

  const fetchPortfolios = async () => {
    try {
      const response = await fetch("/api/portfolios");
      if (response.ok) {
        const data = await response.json();
        setPortfolios(data);
      }
    } catch (error) {
      console.error("Failed to fetch portfolios:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPortfolios = useMemo(() => {
    if (!searchQuery.trim()) {
      return portfolios;
    }

    const query = searchQuery.toLowerCase();
    return portfolios.filter((portfolio) => {
      const username = portfolio.username?.toLowerCase() || "";
      const name = portfolio.name?.toLowerCase() || "";
      return username.includes(query) || name.includes(query);
    });
  }, [portfolios, searchQuery]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-zinc-900">All portfolios</h1>
          <p className="text-sm text-zinc-600">
            Snapshot of every account&apos;s positions and cash.
          </p>
        </div>
        <Link href="/" className="text-indigo-700 hover:underline ml-4">
          ← Back
        </Link>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg border border-zinc-200 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by username or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-0 outline-none text-zinc-900 placeholder-zinc-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {searchQuery && (
          <div className="mt-2 text-sm text-zinc-600">
            Showing {filteredPortfolios.length} of {portfolios.length} portfolios
          </div>
        )}
      </div>

      <div className="space-y-4">
        {filteredPortfolios.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-12 h-12 text-zinc-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.203-2.47M12 7v14" />
            </svg>
            <h3 className="text-lg font-medium text-zinc-900 mb-2">
              {searchQuery ? "No portfolios found" : "No portfolios yet"}
            </h3>
            <p className="text-zinc-600">
              {searchQuery
                ? `No portfolios match "${searchQuery}". Try a different search term.`
                : "Portfolios will appear here once users start trading."
              }
            </p>
          </div>
        ) : (
          filteredPortfolios.map((p) => (
            <div
              key={p.userId}
              className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-zinc-900">
                    {p.name && p.name.trim() !== "" && (
                      <div className="text-zinc-700">{p.name}</div>
                    )}
                    {p.username && (
                      <div className="text-xs text-zinc-500">@{p.username}</div>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">Cash ${p.balance.toFixed(2)}</p>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-sm text-zinc-700">
                {p.holdings.length === 0 ? (
                  <p className="text-zinc-500">No holdings yet.</p>
                ) : (
                  p.holdings.map((h) => (
                    <div
                      key={h.symbol}
                      className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2"
                    >
                      <span className="font-medium">{h.symbol}</span>
                      <span>{h.shares} shares</span>
                      <span>${h.latestPrice.toFixed(2)}</span>
                      <span className="font-semibold">
                        ${h.value.toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


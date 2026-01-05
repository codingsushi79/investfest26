"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { buyShares, sellShares } from "@/app/actions";

type CompanyOption = { symbol: string; name: string; price: number };
type Holding = { symbol: string; shares: number };

export function TradeControls({
  companies,
  holdings,
  balance,
}: {
  companies: CompanyOption[];
  holdings: Holding[];
  balance: number;
}) {
  const [mode, setMode] = useState<"BUY" | "SELL" | null>(null);
  const [symbol, setSymbol] = useState(companies[0]?.symbol ?? "");
  const [shares, setShares] = useState<number>(1);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const priceBySymbol = useMemo(
    () => new Map(companies.map((c) => [c.symbol, c.price])),
    [companies]
  );

  const ownedShares = useMemo(
    () => new Map(holdings.map((h) => [h.symbol, h.shares])),
    [holdings]
  );

  function reset() {
    setShares(1);
    setMessage(null);
  }

  function close() {
    setMode(null);
    reset();
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!mode) return;
    setMessage(null);
    const action = mode === "BUY" ? buyShares : sellShares;
    startTransition(async () => {
      try {
        await action({ symbol, shares });
        setMessage("Success!");
      } catch (err) {
        setMessage((err as Error).message);
      }
    });
  }

  const currentPrice = priceBySymbol.get(symbol) ?? 0;
  const cost = mode === "BUY" ? currentPrice * shares : currentPrice * shares;
  const maxSell = ownedShares.get(symbol) ?? 0;

  return (
    <div className="flex items-center gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
      <button
        onClick={() => {
          setMode("BUY");
          reset();
        }}
        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 hover:scale-105 transition-all duration-200 hover:shadow-lg animate-in fade-in-0 slide-in-from-left-4 duration-500"
        style={{ animationDelay: '100ms' }}
      >
        📈 Buy shares
      </button>
      <button
        onClick={() => {
          setMode("SELL");
          reset();
        }}
        className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-rose-700 hover:scale-105 transition-all duration-200 hover:shadow-lg animate-in fade-in-0 slide-in-from-right-4 duration-500"
        style={{ animationDelay: '200ms' }}
      >
        📉 Sell shares
      </button>

      {mode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in-0 duration-300">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl animate-in fade-in-0 zoom-in-95 duration-300">
            <div className="flex items-center justify-between animate-in fade-in-0 slide-in-from-top-2 duration-300">
              <h2 className="text-lg font-semibold animate-in fade-in-0 duration-300" style={{ animationDelay: '100ms' }}>
                {mode === "BUY" ? "📈 Buy" : "📉 Sell"} shares
              </h2>
              <button
                onClick={close}
                className="text-sm text-zinc-500 hover:text-zinc-800 hover:scale-110 transition-all duration-200 p-1 rounded hover:bg-zinc-100 animate-in fade-in-0 duration-300"
                style={{ animationDelay: '150ms' }}
              >
                ✕
              </button>
            </div>
            <form className="mt-4 space-y-4 animate-in fade-in-0 duration-500" style={{ animationDelay: '200ms' }} onSubmit={handleSubmit}>
              <div className="space-y-1 animate-in fade-in-0 slide-in-from-left-2 duration-400" style={{ animationDelay: '250ms' }}>
                <label className="text-sm font-medium text-zinc-700 animate-in fade-in-0 duration-300" style={{ animationDelay: '300ms' }}>
                  Company
                </label>
                <select
                  className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 hover:border-zinc-300 animate-in fade-in-0 slide-in-from-right-2 duration-400"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  style={{ animationDelay: '350ms' }}
                >
                  {companies.map((c) => (
                    <option key={c.symbol} value={c.symbol}>
                      {c.symbol} — ${c.price.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 animate-in fade-in-0 slide-in-from-left-2 duration-400" style={{ animationDelay: '400ms' }}>
                <label className="text-sm font-medium text-zinc-700 animate-in fade-in-0 duration-300" style={{ animationDelay: '450ms' }}>
                  Shares
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={shares}
                  onChange={(e) => setShares(Number(e.target.value))}
                  className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 hover:border-zinc-300 animate-in fade-in-0 slide-in-from-right-2 duration-400"
                  style={{ animationDelay: '500ms' }}
                />
                {mode === "SELL" && (
                  <p className="text-xs text-zinc-500 animate-in fade-in-0 duration-300" style={{ animationDelay: '550ms' }}>
                    You own {maxSell} shares of {symbol}
                  </p>
                )}
              </div>

              <div className="rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-700 animate-in fade-in-0 slide-in-from-bottom-4 duration-400 border border-zinc-200" style={{ animationDelay: '600ms' }}>
                <div className="flex justify-between animate-in fade-in-0 duration-300" style={{ animationDelay: '650ms' }}>
                  <span>Current price</span>
                  <span className="font-semibold">${currentPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between animate-in fade-in-0 duration-300" style={{ animationDelay: '700ms' }}>
                  <span>Total {mode === "BUY" ? "cost" : "value"}</span>
                  <span className={`font-semibold ${mode === "BUY" ? "text-emerald-700" : "text-rose-700"}`}>${cost.toFixed(2)}</span>
                </div>
                {mode === "BUY" && (
                  <div className="flex justify-between text-emerald-700 animate-in fade-in-0 duration-300" style={{ animationDelay: '750ms' }}>
                    <span>Cash available</span>
                    <span className="font-semibold">${balance.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {message && (
                <p className={`text-sm font-medium animate-in fade-in-0 slide-in-from-top-2 duration-300 ${message === "Success!" ? "text-emerald-600" : "text-rose-600"}`} role="alert">
                  {message === "Success!" ? "✅ " : "❌ "}{message}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 animate-in fade-in-0 duration-400" style={{ animationDelay: '800ms' }}>
                <button
                  type="button"
                  onClick={close}
                  className="rounded-md px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 hover:scale-105 transition-all duration-200 animate-in fade-in-0 slide-in-from-left-2 duration-300"
                  style={{ animationDelay: '850ms' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className={`rounded-md px-4 py-2 text-sm font-semibold text-white shadow hover:scale-105 transition-all duration-200 animate-in fade-in-0 slide-in-from-right-2 duration-300 ${
                    mode === "BUY"
                      ? "bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-200"
                      : "bg-rose-600 hover:bg-rose-700 hover:shadow-rose-200"
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                  style={{ animationDelay: '900ms' }}
                >
                  {isPending && (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  <span className={isPending ? 'animate-pulse' : ''}>
                    {isPending ? "Working..." : `${mode === "BUY" ? "💰 Buy" : "💸 Sell"} ${shares} shares`}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


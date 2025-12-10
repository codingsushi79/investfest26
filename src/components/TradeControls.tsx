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
    <div className="flex items-center gap-3">
      <button
        onClick={() => {
          setMode("BUY");
          reset();
        }}
        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700"
      >
        Buy shares
      </button>
      <button
        onClick={() => {
          setMode("SELL");
          reset();
        }}
        className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-rose-700"
      >
        Sell shares
      </button>

      {mode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {mode === "BUY" ? "Buy" : "Sell"} shares
              </h2>
              <button
                onClick={close}
                className="text-sm text-zinc-500 hover:text-zinc-800"
              >
                Close
              </button>
            </div>
            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-700">
                  Company
                </label>
                <select
                  className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                >
                  {companies.map((c) => (
                    <option key={c.symbol} value={c.symbol}>
                      {c.symbol} — ${c.price.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-700">
                  Shares
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={shares}
                  onChange={(e) => setShares(Number(e.target.value))}
                  className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
                />
                {mode === "SELL" && (
                  <p className="text-xs text-zinc-500">
                    You own {maxSell} shares of {symbol}
                  </p>
                )}
              </div>

              <div className="rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                <div className="flex justify-between">
                  <span>Current price</span>
                  <span>${currentPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total {mode === "BUY" ? "cost" : "value"}</span>
                  <span>${cost.toFixed(2)}</span>
                </div>
                {mode === "BUY" && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Cash available</span>
                    <span>${balance.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {message && (
                <p className="text-sm text-rose-600" role="alert">
                  {message}
                </p>
              )}

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={close}
                  className="rounded-md px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-60"
                >
                  {isPending ? "Working..." : mode === "BUY" ? "Buy" : "Sell"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


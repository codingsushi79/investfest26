import Link from "next/link";
import { getAllPortfolios } from "@/lib/data";

export default async function PortfoliosPage() {
  const portfolios = await getAllPortfolios();

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">All portfolios</h1>
          <p className="text-sm text-zinc-600">
            Snapshot of every account’s positions and cash.
          </p>
        </div>
        <Link href="/" className="text-indigo-700 hover:underline">
          ← Back
        </Link>
      </div>

      <div className="space-y-4">
        {portfolios.map((p) => (
          <div
            key={p.userId}
            className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-900">
                  {p.username ? `@${p.username}` : p.name}
                </p>
                <p className="text-xs text-zinc-500">Cash ${p.balance.toFixed(2)}</p>
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
        ))}
      </div>
    </div>
  );
}


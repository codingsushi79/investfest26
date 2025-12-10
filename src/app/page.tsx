import Link from "next/link";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authConfig } from "@/lib/auth";
import { getDashboardData, getLatestPrices } from "@/lib/data";
import { TradeControls } from "@/components/TradeControls";
import { StockCharts } from "@/components/StockCharts";
import { PortfolioTable } from "@/components/PortfolioTable";
import { UsernameForm } from "@/components/UsernameForm";
import { SignInButton } from "@/components/SignInButton";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = (await getServerSession(authConfig)) as Session | null;
  const dashboard = await getDashboardData(session?.user?.id);
  const latestPrices = await getLatestPrices();

  const companyOptions = dashboard.companies.map((c) => ({
    symbol: c.symbol,
    name: c.name,
    price: latestPrices.get(c.id)?.price ?? 0,
  }));

  const holdingsSimple =
    dashboard.holdings.map((h) => ({ symbol: h.symbol, shares: h.shares })) ??
    [];

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="text-lg font-bold text-indigo-700">InvestFest 26</div>
            {session && (
              <TradeControls
                companies={companyOptions}
                holdings={holdingsSimple}
                balance={dashboard.cash}
              />
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/leaderboard" className="text-indigo-700 hover:underline">
              Leaderboard
            </Link>
            <Link href="/portfolios" className="text-indigo-700 hover:underline">
              All portfolios
            </Link>
            {session ? (
              <form action="/api/auth/signout" method="post">
                <button className="rounded-md bg-zinc-900 px-3 py-2 text-white hover:bg-zinc-800">
                  Sign out
                </button>
              </form>
            ) : (
              <SignInButton />
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-zinc-600">
              Each player starts with $1000 and must buy one $100 share of the 8
              companies. Prices update every 15 minutes by the operator.
            </p>
            {session && (
              <p className="text-sm text-zinc-600">
                Signed in as {session.user?.email}
              </p>
            )}
          </div>
          {session && (
            <div className="text-right text-sm text-zinc-600">
              <div>Cash: ${dashboard.cash.toFixed(2)}</div>
              <div>Portfolio value: ${dashboard.portfolioValue.toFixed(2)}</div>
            </div>
          )}
        </div>

        {session ? (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase text-zinc-500">Cash</p>
              <p className="text-2xl font-semibold">${dashboard.cash.toFixed(2)}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase text-zinc-500">Invested</p>
              <p className="text-2xl font-semibold">
                ${dashboard.invested.toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase text-zinc-500">Portfolio</p>
              <p className="text-2xl font-semibold">
                ${dashboard.portfolioValue.toFixed(2)}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-6">
            <p className="text-sm text-zinc-700">
              Sign in with Google to start trading and track your holdings.
            </p>
            <div className="mt-3">
              <SignInButton />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              Portfolio overview
            </h2>
            <p className="text-sm text-zinc-600">
              Update your username for the leaderboard.
            </p>
          </div>
          {session && <UsernameForm initial={session.user?.username ?? null} />}
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-900">
            Price history (updates every 15 minutes by operator)
          </h2>
          <StockCharts
            companies={dashboard.companies.map((c) => ({
              symbol: c.symbol,
              name: c.name,
              prices: c.prices.map((p) => ({ label: p.label, value: p.value })),
            }))}
          />
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900">Your holdings</h2>
            <Link href="/leaderboard" className="text-sm text-indigo-700 hover:underline">
              View leaderboard
            </Link>
          </div>
          <PortfolioTable rows={dashboard.holdings} />
        </section>
      </main>
    </div>
  );
}

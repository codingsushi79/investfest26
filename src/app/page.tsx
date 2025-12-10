import Link from "next/link";
import { getCurrentUser } from "@/lib/auth-utils";
import { getDashboardData, getLatestPrices } from "@/lib/data";
import { TradeControls } from "@/components/TradeControls";
import { StockCharts } from "@/components/StockCharts";
import { PortfolioTable } from "@/components/PortfolioTable";
import { UsernameForm } from "@/components/UsernameForm";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  const dashboard = await getDashboardData(user?.id);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="border-b border-slate-200/60 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              InvestFest 26
            </div>
            {user && (
              <TradeControls
                companies={companyOptions}
                holdings={holdingsSimple}
                balance={dashboard.cash}
              />
            )}
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/trade"
              className="rounded-lg bg-gradient-to-r from-green-600 to-green-700 px-4 py-2 font-semibold text-white hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Trade Shares
            </Link>
            <Link
              href="/leaderboard"
              className="text-slate-700 hover:text-blue-600 transition-colors font-medium"
            >
              Leaderboard
            </Link>
            <Link
              href="/portfolios"
              className="text-slate-700 hover:text-blue-600 transition-colors font-medium"
            >
              All portfolios
            </Link>
            {user ? (
              <form action="/api/auth/signout" method="post">
                <button className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 transition-all duration-200 shadow-sm hover:shadow-md">
                  Sign out
                </button>
              </form>
            ) : (
              <Link
                href="/signin"
                className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 font-semibold text-white hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">Virtual Stock Trading</h1>
            <p className="text-slate-600 leading-relaxed">
              Each player starts with $1,000 and can trade shares in 8 companies.
              Prices are updated every 15 minutes by the operator.
            </p>
            {user && (
              <p className="text-sm font-medium text-slate-700 bg-blue-50 px-3 py-1 rounded-full inline-block">
                Signed in as <span className="text-blue-600">{user.username}</span>
              </p>
            )}
          </div>
          {user && (
            <div className="flex gap-6 text-right">
              <div className="bg-white rounded-lg px-4 py-3 shadow-sm border border-slate-200">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Cash</div>
                <div className="text-lg font-bold text-green-600">${dashboard.cash.toFixed(2)}</div>
              </div>
              <div className="bg-white rounded-lg px-4 py-3 shadow-sm border border-slate-200">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Portfolio</div>
                <div className="text-lg font-bold text-blue-600">${dashboard.portfolioValue.toFixed(2)}</div>
              </div>
            </div>
          )}
        </div>

        {user ? (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Available Cash</p>
                  <p className="text-2xl font-bold text-slate-900">${dashboard.cash.toFixed(2)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Invested</p>
                  <p className="text-2xl font-bold text-slate-900">${dashboard.invested.toFixed(2)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Value</p>
                  <p className="text-2xl font-bold text-slate-900">${dashboard.portfolioValue.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 p-8 text-center shadow-sm">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Ready to Start Trading?</h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              Create an account to begin your virtual stock trading journey and track your portfolio performance.
            </p>
            <Link
              href="/signin"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Get Started
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-1">
                Portfolio Overview
              </h2>
              <p className="text-slate-600">
                Update your username to appear on the leaderboard and track your performance.
              </p>
            </div>
            {user && <UsernameForm initial={user.username} />}
          </div>
        </div>

        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Price History</h2>
              <p className="text-sm text-slate-600">Live charts updated every 15 minutes by the operator</p>
            </div>
          </div>
          <StockCharts
            companies={dashboard.companies.map((c) => ({
              symbol: c.symbol,
              name: c.name,
              prices: c.prices.map((p) => ({ label: p.label, value: p.value })),
            }))}
          />
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Your Holdings</h2>
                <p className="text-sm text-slate-600">Current stock positions and values</p>
              </div>
            </div>
            <Link
              href="/leaderboard"
              className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
            >
              View leaderboard →
            </Link>
          </div>
          <PortfolioTable rows={dashboard.holdings} />
        </section>
      </main>
    </div>
  );
}

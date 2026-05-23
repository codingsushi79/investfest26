"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { StockCharts } from "@/components/StockCharts";
import { PortfolioTable } from "@/components/PortfolioTable";
import { UsernameForm } from "@/components/UsernameForm";
import { TiltButton } from "@/components/TiltButton";
import { TiltLink } from "@/components/TiltLink";
import { appConfig, featuresConfig, authConfig } from "@/lib/config";

interface User {
  id: string;
  username: string;
  balance: number;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [dashboard, setDashboard] = useState<{
    companies: Array<{
      symbol: string;
      name: string;
      actualShares: number;
      valuationShares: number;
      inBaseline: boolean;
      latestLabel: string;
      nextLabel: string;
      prices: Array<{ label: string; value: number }>;
    }>;
    holdings: Array<{symbol: string, shares: number, name: string, latestPrice: number, value: number}>,
    cash: number,
    invested: number,
    portfolioValue: number
  }>({
    companies: [],
    holdings: [],
    cash: 0,
    invested: 0,
    portfolioValue: 0
  });
  const [loading, setLoading] = useState(true);

  // Operator modal state
  const [showOperatorModal, setShowOperatorModal] = useState(false);
  const [operatorCompany, setOperatorCompany] = useState("");
  const [operatorCompanyValue, setOperatorCompanyValue] = useState("");
  const [advancePeriod, setAdvancePeriod] = useState(false);
  const [updatingPrice, setUpdatingPrice] = useState(false);
  const [tradingEnded, setTradingEnded] = useState(false);

  useEffect(() => {
    fetchData();
    // Check if trading has ended
    const ended = localStorage.getItem("tradingEnded") === "true";
    setTradingEnded(ended);

    const intervalId = setInterval(() => {
      fetchData();
    }, 30000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [dashboardRes, pricesRes] = await Promise.all([
        fetch("/api/dashboard"),
        fetch("/api/prices"),
      ]);

      if (dashboardRes.ok) {
        const dashboardData = await dashboardRes.json();
        setUser(dashboardData.user);
        setDashboard({
          companies: dashboardData.companies,
          holdings: dashboardData.holdings,
          cash: dashboardData.cash,
          invested: dashboardData.invested,
          portfolioValue: dashboardData.portfolioValue,
        });
      }

      if (pricesRes.ok) {
        // Prices data fetched but not stored locally since we get it from dashboard
        await pricesRes.json();
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOperatorPriceUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operatorCompany || !operatorCompanyValue) return;

    const companyValue = parseFloat(operatorCompanyValue);
    if (isNaN(companyValue) || companyValue <= 0) {
      alert("Please enter a valid company value greater than 0");
      return;
    }

    const selectedCompany = dashboard.companies.find(c => c.symbol === operatorCompany);
    if (!selectedCompany) return;

    const isAdvancing = !selectedCompany.inBaseline || advancePeriod;

    if (isAdvancing && selectedCompany.actualShares <= 0) {
      alert("Cannot advance past Y0 Q4 until students own shares in this company.");
      return;
    }

    const nextLabel = selectedCompany.nextLabel;

    console.log("Client-side user check:", {
      user,
      username: user?.username,
      isOperator: user?.username === authConfig.operatorUsername
    });

    setUpdatingPrice(true);
    try {
      console.log("Sending company value update:", {
        symbol: operatorCompany,
        label: nextLabel,
        companyValue,
      });

      const response = await fetch("/api/admin/update-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{
          symbol: operatorCompany,
          label: isAdvancing ? nextLabel : selectedCompany.latestLabel,
          companyValue,
          advancePeriod: isAdvancing,
        }]),
      });

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      if (response.ok) {
        console.log("Price update successful");
        setShowOperatorModal(false);
        setOperatorCompany("");
        setOperatorCompanyValue("");
        setAdvancePeriod(false);
        // Refresh data
        await fetchData();
      } else {
        const errorData = await response.json();
        console.error("Price update failed:", errorData);
        alert(`Failed to update company value: ${errorData.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error updating price:", error);
      alert(`Error updating company value: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setUpdatingPrice(false);
    }
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="border-b border-slate-200/60 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {appConfig.title}
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {user && user.username === authConfig.operatorUsername && (
              <TiltButton
                onClick={() => {
                  const newState = !tradingEnded;
                  localStorage.setItem("tradingEnded", newState ? "true" : "false");
                  setTradingEnded(newState);
                  // Broadcast to other tabs
                  window.dispatchEvent(new StorageEvent("storage", {
                    key: "tradingEnded",
                    newValue: newState ? "true" : "false",
                  }));
                }}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  tradingEnded
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-red-600 text-white hover:bg-red-700"
                }`}
              >
                {tradingEnded ? "Resume Event" : "End Event"}
              </TiltButton>
            )}
            {featuresConfig.trading && (
              <TiltLink
                href="/trade"
                className="rounded-lg bg-gradient-to-r from-green-600 to-green-700 px-4 py-2 font-semibold text-white hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                🏪 Trade Shares
              </TiltLink>
            )}
            {featuresConfig.leaderboard && (
              <Link
                href="/leaderboard"
                className="text-slate-700 hover:text-blue-600 transition-colors font-medium"
              >
                Leaderboard
              </Link>
            )}
            {featuresConfig.portfolios && (
              <Link
                href="/portfolios"
                className="text-slate-700 hover:text-blue-600 transition-colors font-medium"
              >
                All portfolios
              </Link>
            )}
            {user && user.username === authConfig.operatorUsername && (
              <>
                {featuresConfig.companyValues && (
                  <Link
                    href="/company-values"
                    className="text-purple-700 hover:text-purple-800 transition-colors font-medium"
                  >
                    Company Values
                  </Link>
                )}
                <Link
                  href="/moderator/profiles"
                  className="text-purple-700 hover:text-purple-800 transition-colors font-medium"
                >
                  View Profiles
                </Link>
              </>
            )}
            {user ? (
              <form action="/api/auth/signout" method="post">
                <TiltButton className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 transition-all duration-200 shadow-sm hover:shadow-md">
                  Sign out
                </TiltButton>
              </form>
            ) : (
              <TiltLink
                href="/signin"
                className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 font-semibold text-white hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                🔐 Sign in
              </TiltLink>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">{appConfig.title} Dashboard</h1>
            <p className="text-slate-600 leading-relaxed">
              Each player starts with $1,000 and can trade shares in 8 companies.
              During Y0 Q4, each company has 100 baseline shares. After Y0 Q4, company value
              updates move invested share prices.
            </p>
            {user && (
              <div className="flex items-center gap-4">
                <p className="text-sm font-medium text-slate-700 bg-blue-50 px-3 py-1 rounded-full">
                  Signed in as <span className="text-blue-600">{user.username}</span>
                </p>
                <div className="flex gap-2">
                  {featuresConfig.userProfiles && (
                    <Link
                      href="/profile"
                      className="text-slate-700 hover:text-blue-600 transition-colors font-medium text-sm px-3 py-2 rounded-lg hover:bg-slate-50"
                    >
                      Profile
                    </Link>
                  )}
                  {featuresConfig.trading && (
                    <TiltLink
                      href="/trade"
                      className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      🏪 Trade Shares
                    </TiltLink>
                  )}
                  {featuresConfig.offers && (
                    <TiltLink
                      href="/offers"
                      className="rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-semibold text-white hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      🤝 Trading Offers
                    </TiltLink>
                  )}
                  {featuresConfig.leaderboard && (
                    <Link
                      href="/leaderboard"
                      className="text-slate-700 hover:text-blue-600 transition-colors font-medium text-sm px-3 py-2 rounded-lg hover:bg-slate-50"
                    >
                      Leaderboard
                    </Link>
                  )}
                  {featuresConfig.portfolios && (
                    <Link
                      href="/portfolios"
                      className="text-slate-700 hover:text-blue-600 transition-colors font-medium text-sm px-3 py-2 rounded-lg hover:bg-slate-50"
                    >
                      All portfolios
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
          {user && (
            <div className="flex gap-6 text-right">
              <div className="bg-white rounded-lg px-4 py-3 shadow-sm border border-slate-200">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Cash</div>
                <div className="text-lg font-bold text-green-700">${dashboard.cash.toFixed(2)}</div>
              </div>
              <div className="bg-white rounded-lg px-4 py-3 shadow-sm border border-slate-200">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Portfolio</div>
                <div className="text-lg font-bold text-blue-600">${dashboard.portfolioValue.toFixed(2)}</div>
              </div>
            </div>
          )}
        </div>

        {user ? (
          <div className="grid gap-6 md:grid-cols-3 animate-in fade-in-0 slide-in-from-bottom-4">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer animate-in fade-in-0 slide-in-from-left-4" style={{ animationDelay: '100ms' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center animate-pulse">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Available Cash</p>
                  <p className="text-2xl font-bold text-slate-900 animate-in fade-in-0 slide-in-from-bottom-2">${dashboard.cash.toFixed(2)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer animate-in fade-in-0 slide-in-from-bottom-4" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center animate-pulse">
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
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer animate-in fade-in-0 slide-in-from-right-4" style={{ animationDelay: '300ms' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center animate-pulse">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Value</p>
                  <p className="text-2xl font-bold text-slate-900 animate-in fade-in-0 slide-in-from-bottom-2">${(dashboard.portfolioValue + dashboard.cash).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 p-8 text-center shadow-sm hover:shadow-lg transition-all duration-300 animate-in fade-in-0 slide-in-from-bottom-6">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-4 animate-bounce">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2 animate-in fade-in-0 slide-in-from-top-2">Ready to Start Trading?</h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto animate-in fade-in-0 slide-in-from-bottom-2">
              Create an account to begin your virtual stock trading journey and track your portfolio performance.
            </p>
            <Link
              href="/signin"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md animate-in fade-in-0 slide-in-from-bottom-4"
            >
              Get Started
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-lg transition-all duration-300 animate-in fade-in-0 slide-in-from-bottom-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-1 animate-in fade-in-0 slide-in-from-left-2">
                Portfolio Overview
              </h2>
              <p className="text-slate-600 animate-in fade-in-0 slide-in-from-left-2" style={{ animationDelay: '100ms' }}>
                Update your username to appear on the leaderboard and track your performance.
              </p>
            </div>
            {user && <UsernameForm initial={user.username} />}
          </div>
        </div>

        {featuresConfig.trading && (
          <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-lg transition-all duration-300 animate-in fade-in-0 slide-in-from-bottom-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center animate-pulse">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 animate-in fade-in-0 slide-in-from-left-2">Price History</h2>
                  <p className="text-sm text-slate-600 animate-in fade-in-0 slide-in-from-left-2" style={{ animationDelay: '100ms' }}>Share prices stay at $100 during Y0 Q4, then follow company value updates</p>
                </div>
              </div>
              {user && user.username === authConfig.operatorUsername && featuresConfig.adminPriceUpdates && (
                <TiltButton
                  onClick={() => setShowOperatorModal(true)}
                  className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 hover:scale-110 transition-all duration-200 animate-pulse"
                  title="Set company value"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </TiltButton>
              )}
            </div>


            <StockCharts
              companies={dashboard.companies}
            />
          </section>
        )}

        {featuresConfig.portfolios && (
          <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-lg transition-all duration-300 animate-in fade-in-0 slide-in-from-bottom-8 duration-700">
            <div className="flex items-center justify-between mb-6 animate-in fade-in-0 slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-3 animate-in fade-in-0 slide-in-from-left-4 duration-500" style={{ animationDelay: '100ms' }}>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center animate-pulse">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 animate-in fade-in-0 duration-300" style={{ animationDelay: '200ms' }}>📊 Your Holdings</h2>
                  <p className="text-sm text-slate-600 animate-in fade-in-0 duration-300" style={{ animationDelay: '300ms' }}>Current stock positions and values</p>
                </div>
              </div>
              {featuresConfig.leaderboard && (
                <TiltLink
                  href="/leaderboard"
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-all duration-200 hover:scale-105 animate-in fade-in-0 slide-in-from-right-4 duration-500"
                  style={{ animationDelay: '400ms' }}
                >
                  🏆 View leaderboard →
                </TiltLink>
              )}
            </div>
            <PortfolioTable rows={dashboard.holdings} />
          </section>
        )}
      </main>

      {/* Operator Company Value Modal */}
      {showOperatorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Set Company Value</h2>
                <TiltButton
                  onClick={() => setShowOperatorModal(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </TiltButton>
              </div>

              <form onSubmit={handleOperatorPriceUpdate} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Select Company
                  </label>
                  <select
                    value={operatorCompany}
                    onChange={(e) => {
                      setOperatorCompany(e.target.value);
                      setAdvancePeriod(false);
                    }}
                    className="block w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    required
                  >
                    <option value="">Choose a company...</option>
                    {dashboard.companies.map((company) => (
                      <option key={company.symbol} value={company.symbol}>
                        {company.symbol} - {company.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Company Value ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={operatorCompanyValue}
                    onChange={(e) => setOperatorCompanyValue(e.target.value)}
                    className="block w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="Enter total company value (e.g. 15000.00)"
                    required
                  />
                </div>

                {operatorCompany && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                    {(() => {
                      const selectedCompany = dashboard.companies.find(c => c.symbol === operatorCompany);
                      if (!selectedCompany) return null;

                      const parsedValue = parseFloat(operatorCompanyValue);
                      const isAdvancing = !selectedCompany.inBaseline || advancePeriod;
                      const divisor = isAdvancing
                        ? selectedCompany.actualShares
                        : selectedCompany.valuationShares;
                      const impliedPrice =
                        divisor > 0 && !isNaN(parsedValue) && parsedValue > 0
                          ? parsedValue / divisor
                          : null;

                      return (
                        <>
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-sm font-medium text-blue-900">
                                {selectedCompany.inBaseline && !advancePeriod
                                  ? "Y0 Q4 Setup"
                                  : "Next Time Period"}
                              </span>
                            </div>
                            <p className="text-sm text-blue-800">
                              {selectedCompany.inBaseline && !advancePeriod ? (
                                <>Updating <strong>Y0 Q4</strong> company value (portfolios stay at $100/share)</>
                              ) : (
                                <>Advancing to <strong>{selectedCompany.nextLabel}</strong> (portfolio values will update)</>
                              )}
                            </p>
                          </div>
                          <div className="text-sm text-blue-800 space-y-1">
                            <p>
                              Share price = company value ÷ shares invested
                            </p>
                            <p>
                              Shares for this update:{" "}
                              <strong>
                                {isAdvancing
                                  ? selectedCompany.actualShares.toLocaleString()
                                  : `${selectedCompany.valuationShares.toLocaleString()} (Y0 Q4 baseline)`}
                              </strong>
                            </p>
                            {isAdvancing && selectedCompany.actualShares <= 0 ? (
                              <p className="text-amber-700">
                                Students must own shares before advancing past Y0 Q4.
                              </p>
                            ) : impliedPrice !== null ? (
                              <p>
                                New share price: <strong>${impliedPrice.toFixed(2)}</strong>
                              </p>
                            ) : null}
                          </div>
                          {selectedCompany.inBaseline && (
                            <label className="flex items-start gap-3 text-sm text-blue-900">
                              <input
                                type="checkbox"
                                checked={advancePeriod}
                                onChange={(e) => setAdvancePeriod(e.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-blue-300 text-purple-600 focus:ring-purple-500"
                              />
                              <span>
                                Advance to {selectedCompany.nextLabel} and start moving invested share prices
                              </span>
                            </label>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <TiltButton
                    type="button"
                    onClick={() => setShowOperatorModal(false)}
                    className="flex-1 bg-slate-100 text-slate-700 px-4 py-3 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </TiltButton>
                  <TiltButton
                    type="submit"
                    disabled={
                      updatingPrice ||
                      !operatorCompany ||
                      !operatorCompanyValue ||
                      (() => {
                        const selectedCompany = dashboard.companies.find(
                          (company) => company.symbol === operatorCompany
                        );
                        if (!selectedCompany) return true;
                        const isAdvancing =
                          !selectedCompany.inBaseline || advancePeriod;
                        return isAdvancing && selectedCompany.actualShares <= 0;
                      })()
                    }
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    {updatingPrice ? (
                      <div className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Updating...
                      </div>
                    ) : (
                      advancePeriod ||
                      !dashboard.companies.find((c) => c.symbol === operatorCompany)?.inBaseline
                        ? "Set Company Value"
                        : "Update Y0 Q4 Setup"
                    )}
                  </TiltButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

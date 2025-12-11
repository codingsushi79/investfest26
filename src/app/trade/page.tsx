"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Company {
  symbol: string;
  name: string;
  price: number;
}

interface Holding {
  symbol: string;
  shares: number;
}

interface User {
  id: string;
  username: string;
  balance: number;
}

export default function TradePage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [shares, setShares] = useState<string>("");
  const [tradingEnded, setTradingEnded] = useState(false);
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [trading, setTrading] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const router = useRouter();

  const fetchTradeData = useCallback(async () => {
    try {
      const [dashboardRes, pricesRes] = await Promise.all([
        fetch("/api/dashboard"),
        fetch("/api/prices"),
      ]);

      if (dashboardRes.ok) {
        const dashboard = await dashboardRes.json();
        setUser(dashboard.user);
        setHoldings(dashboard.holdings || []);
      } else if (dashboardRes.status === 401) {
        router.push("/signin");
        return;
      }

      if (pricesRes.ok) {
        const prices = await pricesRes.json();
        const companyData = [
          { symbol: "HH", name: "Hazard Holdings" },
          { symbol: "DMI", name: "Drake Maye Industries" },
          { symbol: "MG", name: "Mantis Group" },
          { symbol: "THFT", name: "Penny Pinchers United" },
          { symbol: "KEY", name: "Royal Key" },
          { symbol: "TN", name: "True North Investments" },
          { symbol: "TMB", name: "Trust Me Bro" },
          { symbol: "TGOC", name: "Two Guys one Company" },
        ].map(company => ({
          ...company,
          price: prices[company.symbol] || 0,
        }));
        setCompanies(companyData);
      }

      // Check if trading has ended
      const tradingEndedStatus = localStorage.getItem("investfest-trading-ended") === "true";
      setTradingEnded(tradingEndedStatus);
    } catch {
      setError("Failed to load trading data");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchTradeData();
  }, [fetchTradeData]);

  const handleTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Require company selection for buying
    if (!selectedCompany) {
      setError("Please select a company to trade");
      return;
    }

    if (!shares || !user) {
      setError("Please enter number of shares");
      return;
    }

    const sharesNum = parseInt(shares);
    if (sharesNum <= 0) {
      setError("Number of shares must be greater than 0");
      return;
    }

    const company = companies.find(c => c.symbol === selectedCompany);
    if (!company) {
      setError("Selected company not found");
      return;
    }

    const totalCost = company.price * sharesNum;

    // Check affordability for buying
    if (tradeType === "buy") {
      if (totalCost > user.balance) {
        setError(`Insufficient funds. You need $${totalCost.toFixed(2)} but only have $${user.balance.toFixed(2)}`);
        return;
      }
    } else {
      // Check if user has enough shares for selling
      const holding = holdings.find(h => h.symbol === selectedCompany);
      if (!holding || holding.shares < sharesNum) {
        setError(`You don't have enough shares. You have ${holding?.shares || 0} shares of ${selectedCompany}`);
        return;
      }
    }

    setTrading(true);
    try {
      const response = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: selectedCompany,
          shares: sharesNum,
          type: tradeType.toUpperCase(),
        }),
      });

      if (response.ok) {
        setSuccess(`${tradeType === "buy" ? "Bought" : "Sold"} ${sharesNum} shares of ${selectedCompany} for $${totalCost.toFixed(2)}`);
        setShares("");
        setShowTradeModal(false);
        // Refresh data
        await fetchTradeData();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Trade failed");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setTrading(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Please sign in to trade</h1>
          <Link
            href="/signin"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (tradingEnded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Event Has Ended</h1>
          <p className="text-lg text-slate-600 mb-8 max-w-md">
            The trading event has concluded. Check the leaderboard to see the final rankings!
          </p>
          <Link
            href="/leaderboard"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 text-white font-semibold rounded-lg hover:from-yellow-700 hover:to-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            View Final Rankings
          </Link>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="border-b border-slate-200/60 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              InvestFest 2026
            </Link>
            <span className="text-slate-500">→</span>
            <span className="text-slate-700 font-medium">Trade</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-600">
              Balance: <span className="font-semibold text-green-600">${user.balance.toFixed(2)}</span>
            </div>
            <Link
              href="/"
              className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* Action Buttons */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setShowTradeModal(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
          >
            🏪 Trade Shares
          </button>
        </div>


        <div className="grid gap-8 lg:grid-cols-2">

          {/* Holdings Summary */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Your Holdings</h3>
              {holdings.length > 0 ? (
                <div className="space-y-3">
                  {holdings.map((holding) => {
                    const company = companies.find(c => c.symbol === holding.symbol);
                    const value = company ? company.price * holding.shares : 0;
                    return (
                      <div key={holding.symbol} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                        <div>
                          <div className="font-medium text-slate-900">{holding.symbol}</div>
                          <div className="text-sm text-slate-600">{holding.shares} shares</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-slate-900">${value.toFixed(2)}</div>
                          <div className="text-sm text-slate-600">
                            @ ${company?.price.toFixed(2) || "0.00"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-8">
                  You don&apos;t own any shares yet. Start trading to build your portfolio!
                </p>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-600">Available Cash</span>
                  <span className="font-semibold text-green-600">${user.balance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Holdings</span>
                  <span className="font-semibold text-blue-600">
                    ${holdings.reduce((total, h) => {
                      const company = companies.find(c => c.symbol === h.symbol);
                      return total + (company ? company.price * h.shares : 0);
                    }, 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-3">
                  <span className="font-medium text-slate-900">Portfolio Value</span>
                  <span className="font-bold text-lg text-slate-900">
                    ${(user.balance + holdings.reduce((total, h) => {
                      const company = companies.find(c => c.symbol === h.symbol);
                      return total + (company ? company.price * h.shares : 0);
                    }, 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trade Modal */}
        {showTradeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-900">Trade Shares</h2>
                  <button
                    onClick={() => setShowTradeModal(false)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleTrade} className="space-y-6">
                  {/* Trade Type */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                      What would you like to do?
                    </label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setTradeType("buy")}
                        className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
                          tradeType === "buy"
                            ? "bg-green-600 text-white shadow-lg"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        🛒 Buy Shares
                      </button>
                      <button
                        type="button"
                        onClick={() => setTradeType("sell")}
                        className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
                          tradeType === "sell"
                            ? "bg-red-600 text-white shadow-lg"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        💰 Sell Shares
                      </button>
                    </div>
                  </div>

                  {/* Company Selection - Required for buying */}
                  <div>
                    <label htmlFor="company" className="block text-sm font-semibold text-slate-700 mb-2">
                      Select Company {tradeType === "buy" && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      id="company"
                      value={selectedCompany}
                      onChange={(e) => setSelectedCompany(e.target.value)}
                      className="block w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      required={tradeType === "buy"}
                    >
                      <option value="">Choose a company...</option>
                      {companies.map((company) => (
                        <option key={company.symbol} value={company.symbol}>
                          {company.symbol} - {company.name} (${company.price.toFixed(2)})
                        </option>
                      ))}
                    </select>
                    {tradeType === "buy" && !selectedCompany && (
                      <p className="text-xs text-red-600 mt-1">Company selection is required for buying</p>
                    )}
                  </div>

                  {/* Shares Input */}
                  <div>
                    <label htmlFor="shares" className="block text-sm font-semibold text-slate-700 mb-2">
                      Number of Shares
                    </label>
                    <input
                      type="number"
                      id="shares"
                      value={shares}
                      onChange={(e) => setShares(e.target.value)}
                      min="1"
                      className="block w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholder="Enter number of shares"
                      required
                    />
                  </div>

                  {/* Trade Summary */}
                  {selectedCompany && shares && (
                    <div className={`rounded-lg p-4 ${
                      tradeType === "buy"
                        ? "bg-green-50 border border-green-200"
                        : "bg-red-50 border border-red-200"
                    }`}>
                      {(() => {
                        const company = companies.find(c => c.symbol === selectedCompany);
                        const holding = holdings.find(h => h.symbol === selectedCompany);
                        const sharesNum = parseInt(shares || "0");
                        const totalCost = company ? company.price * sharesNum : 0;

                        return (
                          <>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-slate-700">
                                {tradeType === "buy" ? "Buying" : "Selling"}:
                              </span>
                              <span className="font-semibold">
                                {sharesNum} shares of {selectedCompany}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-600">
                                Price per share: ${company?.price.toFixed(2)}
                              </span>
                              <span className={`font-bold text-lg ${
                                tradeType === "buy" ? "text-green-600" : "text-red-600"
                              }`}>
                                Total: ${totalCost.toFixed(2)}
                              </span>
                            </div>
                            {tradeType === "sell" && holding && (
                              <div className="mt-2 text-sm text-slate-600">
                                You own: {holding.shares} shares
                              </div>
                            )}
                            {tradeType === "buy" && totalCost > user!.balance && (
                              <div className="mt-2 text-sm text-red-600 font-medium">
                                ⚠️ Insufficient funds! You need ${totalCost.toFixed(2)} but only have ${user!.balance.toFixed(2)}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* Error Messages */}
                  {error && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm text-red-800 font-medium">{error}</p>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowTradeModal(false)}
                      className="flex-1 bg-slate-100 text-slate-700 px-4 py-3 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={trading || (tradeType === "buy" && !selectedCompany) || !shares}
                      className={`flex-1 py-3 px-6 rounded-lg font-semibold text-white transition-all duration-200 ${
                        tradeType === "buy"
                          ? "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-green-400 disabled:to-green-500"
                          : "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-red-400 disabled:to-red-500"
                      } disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg`}
                    >
                      {trading ? (
                        <div className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </div>
                      ) : (
                        `${tradeType === "buy" ? "Buy" : "Sell"} Shares`
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Success Message Overlay */}
        {success && (
          <div className="fixed top-4 right-4 bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg z-50 max-w-sm">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-green-800 font-medium">{success}</p>
              <button
                onClick={() => setSuccess("")}
                className="ml-auto text-green-500 hover:text-green-700"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

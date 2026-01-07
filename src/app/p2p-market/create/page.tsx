"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Company {
  id: string;
  symbol: string;
  name: string;
  currentPrice: number;
}

interface Holding {
  companyId: string;
  companySymbol: string;
  companyName: string;
  shares: number;
  currentPrice: number;
}

interface User {
  id: string;
  username: string;
  balance: number;
  isPaused: boolean;
  isBanned: boolean;
}

export default function CreateP2PListingPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [userHoldings, setUserHoldings] = useState<Holding[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [selectedHolding, setSelectedHolding] = useState<string>("");
  const [shares, setShares] = useState<string>("");
  const [pricePerShare, setPricePerShare] = useState<string>("");

  const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return '$0.00';
    }
    return `$${amount.toFixed(2)}`;
  };

  const fetchData = async () => {
    try {
      // Fetch user data
      const userResponse = await fetch("/api/auth/user");
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData.user);
      }

      // Fetch dashboard data (includes holdings and companies)
      const dashboardResponse = await fetch("/api/dashboard");
      if (dashboardResponse.ok) {
        const dashboardData = await dashboardResponse.json();

        // Set companies first
        const companyData = dashboardData.companies.map((company: any) => ({
          id: company.symbol, // Use symbol as ID for easier matching
          symbol: company.symbol,
          name: company.name,
          currentPrice: company.prices[company.prices.length - 1]?.value || 0
        }));
        setCompanies(companyData);

        // Set user holdings
        if (dashboardData.holdings) {
          setUserHoldings(dashboardData.holdings.map((holding: any) => ({
            companyId: holding.symbol, // Use symbol as ID
            companySymbol: holding.symbol,
            companyName: holding.name,
            shares: holding.shares,
            currentPrice: holding.latestPrice
          })).filter((holding: any) => holding.shares > 0)); // Only show holdings with shares
        }
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedHoldingData = userHoldings.find(h => h.companyId === selectedHolding);
  const maxShares = selectedHoldingData ? selectedHoldingData.shares : 0;
  const totalValue = (() => {
    if (!shares || !pricePerShare) return 0;
    const sharesNum = parseInt(shares);
    const priceNum = parseFloat(pricePerShare);
    if (isNaN(sharesNum) || isNaN(priceNum)) return 0;
    return sharesNum * priceNum;
  })();

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedHolding || !shares || !pricePerShare) {
      alert("Please fill in all fields");
      return;
    }

    const sharesNum = parseInt(shares);
    const priceNum = parseFloat(pricePerShare);

    if (sharesNum <= 0 || priceNum <= 0) {
      alert("Shares and price must be positive numbers");
      return;
    }

    if (sharesNum > maxShares) {
      alert("You don't have enough shares");
      return;
    }

    setCreating(true);

    try {
      const response = await fetch("/api/p2p/listings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyId: selectedHolding,
          shares: sharesNum,
          pricePerShare: priceNum,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Listing created successfully! ${result.listing.shares} shares of ${result.listing.companySymbol} listed for $${result.listing.pricePerShare} each`);
        router.push("/p2p-market");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create listing");
      }
    } catch (error) {
      console.error("Error creating listing:", error);
      alert("Failed to create listing");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-zinc-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Create Listing Modal */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-zinc-900">Create P2P Listing</h2>
              <button
                onClick={() => router.push('/p2p-market')}
                className="text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {!user ? (
              <div className="text-center py-8">
                <h3 className="text-lg font-semibold text-zinc-900 mb-2">Please Sign In</h3>
                <Link href="/signin">
                  <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                    Sign In 🔐
                  </button>
                </Link>
              </div>
            ) : user.isPaused || user.isBanned ? (
              <div className="text-center py-8">
                <h3 className="text-lg font-semibold text-zinc-900 mb-2">Account Suspended</h3>
                <p className="text-zinc-600 mb-6">
                  Your account is currently {user.isBanned ? "banned" : "paused"} and cannot create listings.
                </p>
                <button
                  onClick={() => router.push('/p2p-market')}
                  className="bg-zinc-600 text-white px-6 py-3 rounded-lg hover:bg-zinc-700 transition-colors"
                >
                  Back to Market ←
                </button>
              </div>
            ) : userHoldings.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-lg font-semibold text-zinc-900 mb-2">No Holdings Found</h3>
                <p className="text-zinc-600 mb-6">
                  You need to own shares before you can create P2P listings. Buy some shares on the main market first!
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => router.push('/trade')}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Buy Shares 🏪
                  </button>
                  <button
                    onClick={() => router.push('/p2p-market')}
                    className="bg-zinc-600 text-white px-6 py-3 rounded-lg hover:bg-zinc-700 transition-colors"
                  >
                    Back to Market ←
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateListing} className="space-y-6">
                {/* Company Selection */}
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-2">
                    Select Company Shares to Sell
                  </label>
                  <select
                    value={selectedHolding}
                    onChange={(e) => setSelectedHolding(e.target.value)}
                    className="block w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 transition-all"
                    required
                  >
                    <option value="">Choose a company...</option>
                    {userHoldings.map((holding) => (
                      <option key={holding.companyId} value={holding.companyId}>
                        {holding.companySymbol} - {holding.companyName} ({holding.shares} shares owned)
                      </option>
                    ))}
                  </select>
                  {selectedHoldingData && (
                    <p className="text-xs text-zinc-600 mt-1">
                      Current market price: {formatCurrency(selectedHoldingData.currentPrice)} per share
                    </p>
                  )}
                </div>

                {/* Shares Input */}
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-2">
                    Number of Shares
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={maxShares}
                    value={shares}
                    onChange={(e) => setShares(e.target.value)}
                    className="block w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 transition-all"
                    placeholder="Enter number of shares"
                    required
                  />
                </div>

                {/* Price Input */}
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-2">
                    Price per Share ($)
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={pricePerShare}
                    onChange={(e) => setPricePerShare(e.target.value)}
                    className="block w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 transition-all"
                    placeholder="Enter your asking price"
                    required
                  />
                  {selectedHoldingData && pricePerShare && (
                    <div className="mt-2 text-sm">
                      {parseFloat(pricePerShare) < selectedHoldingData.currentPrice ? (
                        <span className="text-green-600">
                          💰 You're offering a discount of {formatCurrency(selectedHoldingData.currentPrice - parseFloat(pricePerShare))} per share!
                        </span>
                      ) : parseFloat(pricePerShare) > selectedHoldingData.currentPrice ? (
                        <span className="text-orange-600">
                          ⚠️ You're asking more than the current market price
                        </span>
                      ) : (
                        <span className="text-zinc-600">
                          📊 At current market price
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Summary */}
                {shares && pricePerShare && selectedHoldingData && (
                  <div className="rounded-lg p-4 bg-zinc-50 border border-zinc-200">
                    <h3 className="font-medium text-zinc-900 mb-2">Listing Summary</h3>
                    <div className="space-y-1 text-sm text-zinc-600">
                      <div>Shares: {shares}</div>
                      <div>Price per share: {formatCurrency(parseFloat(pricePerShare))}</div>
                      <div className="font-medium text-zinc-900">
                        Total value: {formatCurrency(totalValue)}
                      </div>
                      <div>
                        Market value: {formatCurrency(parseInt(shares) * selectedHoldingData.currentPrice)}
                      </div>
                      <div className={totalValue > parseInt(shares) * selectedHoldingData.currentPrice ? 'text-red-600' : 'text-green-600'}>
                        {totalValue > parseInt(shares) * selectedHoldingData.currentPrice ? '🔺' : '🔻'}
                        {(() => {
                          const marketValue = parseInt(shares) * selectedHoldingData.currentPrice;
                          const percentage = Math.abs(((totalValue - marketValue) / marketValue) * 100);
                          return percentage.toFixed(1);
                        })()}%
                        from market value
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => router.push('/p2p-market')}
                    className="flex-1 bg-zinc-100 text-zinc-700 px-4 py-3 rounded-lg font-medium hover:bg-zinc-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !selectedHolding || !shares || !pricePerShare}
                    className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 disabled:from-green-400 disabled:to-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    {creating ? (
                      <div className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating...
                      </div>
                    ) : (
                      `Create Listing 🏷️`
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
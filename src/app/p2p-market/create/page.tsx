"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TiltButton } from "@/components/TiltButton";

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
  const [tradingEnded, setTradingEnded] = useState(false);

  const [selectedHolding, setSelectedHolding] = useState<string>("");
  const [shares, setShares] = useState<string>("");
  const [pricePerShare, setPricePerShare] = useState<string>("");

  const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return '$0.00';
    }
    return `$${amount.toFixed(2)}`;
  };

  useEffect(() => {
    fetchData();

    // Check if trading has ended
    const checkTradingEnded = () => {
      const ended = localStorage.getItem("tradingEnded") === "true";
      setTradingEnded(ended);
      if (ended) {
        router.push("/p2p-market");
      }
    };

    checkTradingEnded();

    // Listen for changes to tradingEnded
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "tradingEnded") {
        const ended = e.newValue === "true";
        setTradingEnded(ended);
        if (ended) {
          router.push("/p2p-market");
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [router]);

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

        // Set companies
        setCompanies(dashboardData.companies.map((company: any) => ({
          id: company.id,
          symbol: company.symbol,
          name: company.name,
          currentPrice: company.currentPrice
        })));

        // Set user holdings
        if (dashboardData.holdings) {
          setUserHoldings(dashboardData.holdings.map((holding: any) => ({
            companyId: holding.company.id,
            companySymbol: holding.company.symbol,
            companyName: holding.company.name,
            shares: holding.shares,
            currentPrice: holding.company.currentPrice
          })));
        }
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

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
      <div className="min-h-screen bg-zinc-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900">Please Sign In</h1>
          <Link href="/signin">
            <TiltButton className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
              Sign In 🔐
            </TiltButton>
          </Link>
        </div>
      </div>
    );
  }

  if (user.isPaused || user.isBanned) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900">Account Suspended</h1>
          <p className="text-zinc-600">
            Your account is currently {user.isBanned ? "banned" : "paused"} and cannot create listings.
          </p>
          <Link href="/p2p-market">
            <TiltButton className="bg-zinc-600 text-white px-6 py-3 rounded-lg hover:bg-zinc-700 transition-colors">
              Back to Market ←
            </TiltButton>
          </Link>
        </div>
      </div>
    );
  }

  if (userHoldings.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-4">📊</div>
          <h1 className="text-2xl font-bold text-zinc-900">No Holdings Found</h1>
          <p className="text-zinc-600">
            You need to own shares before you can create P2P listings. Buy some shares on the main market first!
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/trade">
              <TiltButton className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors">
                Buy Shares 🏪
              </TiltButton>
            </Link>
            <Link href="/p2p-market">
              <TiltButton className="bg-zinc-600 text-white px-6 py-3 rounded-lg hover:bg-zinc-700 transition-colors">
                Back to Market ←
              </TiltButton>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 animate-in fade-in-0 slide-in-from-left-4 duration-500">
                Create P2P Listing 🏷️
              </h1>
              <p className="text-zinc-600" style={{ animationDelay: '100ms' }}>
                Sell your shares directly to other players
              </p>
            </div>
            <Link href="/p2p-market">
              <TiltButton className="bg-zinc-100">
                ← Back to Market
              </TiltButton>
            </Link>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white" style={{ animationDelay: '200ms' }}>
          <form onSubmit={handleCreateListing} className="space-y-6">
            {/* Company Selection */}
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Select Company Shares to Sell
              </label>
              <select
                value={selectedHolding}
                onChange={(e) => setSelectedHolding(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300"
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
                <div className="mt-2 text-sm text-zinc-600">
                  Current market price: {formatCurrency(selectedHoldingData.currentPrice)} per share
                </div>
              )}
            </div>

            {/* Shares Input */}
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Number of Shares to Sell
              </label>
              <input
                type="number"
                min="1"
                max={maxShares}
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                placeholder="Enter number of shares"
                className="w-full px-3 py-2 border border-zinc-300"
                required
              />
              {selectedHoldingData && (
                <div className="mt-2 text-sm text-zinc-600">
                  Available: {maxShares} shares
                </div>
              )}
            </div>

            {/* Price Input */}
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Price per Share ($)
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={pricePerShare}
                onChange={(e) => setPricePerShare(e.target.value)}
                placeholder="Enter your asking price"
                className="w-full px-3 py-2 border border-zinc-300"
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
              <div className="bg-zinc-50">
                <h3 className="font-medium text-zinc-900">Listing Summary</h3>
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
                    {Math.abs(((totalValue - (parseInt(shares) * selectedHoldingData.currentPrice)) / (parseInt(shares) * selectedHoldingData.currentPrice)) * 100).toFixed(1)}%
                    from market value
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-4">
              <TiltButton
                type="submit"
                disabled={creating || !selectedHolding || !shares || !pricePerShare}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg font-medium"
              >
                {creating ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Listing...
                  </div>
                ) : (
                  `Create Listing for ${formatCurrency(totalValue)} 🏷️`
                )}
              </TiltButton>
            </div>
          </form>
        </div>

        {/* Tips */}
        <div className="mt-8 bg-blue-50">
          <h3 className="font-medium text-blue-900">
            💡 Pro Tips for P2P Trading
          </h3>
          <ul className="text-sm text-blue-800">
            <li>• Lower prices attract more buyers and sell faster</li>
            <li>• Consider current market trends when setting prices</li>
            <li>• You can cancel listings anytime before they're bought</li>
            <li>• All transactions are instant and secure</li>
            <li>• Your shares remain in your account until sold</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

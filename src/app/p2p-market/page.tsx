"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TiltButton } from "@/components/TiltButton";

interface P2PListing {
  id: string;
  sellerId: string;
  sellerUsername: string;
  companyId: string;
  companySymbol: string;
  companyName: string;
  shares: number;
  pricePerShare: number;
  totalValue: number;
  currentMarketPrice: number;
  discount: number;
  createdAt: string;
}

interface User {
  id: string;
  username: string;
  balance: number;
  isPaused: boolean;
  isBanned: boolean;
}

export default function P2PMarketPage() {
  const [listings, setListings] = useState<P2PListing[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [buyingListing, setBuyingListing] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [tradingEnded, setTradingEnded] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState<P2PListing | null>(null);
  const [offerPrice, setOfferPrice] = useState<string>("");
  const [makingOffer, setMakingOffer] = useState(false);

  useEffect(() => {
    fetchListings();
    fetchUser();

    // Check if trading has ended
    const checkTradingEnded = () => {
      const ended = localStorage.getItem("tradingEnded") === "true";
      setTradingEnded(ended);
    };

    checkTradingEnded();

    // Listen for changes to tradingEnded
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "tradingEnded") {
        setTradingEnded(e.newValue === "true");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const fetchListings = async () => {
    try {
      const response = await fetch("/api/p2p/listings");
      if (response.ok) {
        const data = await response.json();
        setListings(data);
      }
    } catch (error) {
      console.error("Failed to fetch listings:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUser = async () => {
    try {
      const response = await fetch("/api/auth/user");
      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
    }
  };

  const handleBuyListing = async (listingId: string) => {
    if (!user) return;

    setBuyingListing(listingId);

    try {
      const response = await fetch(`/api/p2p/listings/${listingId}`, {
        method: "PUT",
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Purchase successful! Paid ${formatCurrency(result.totalCost)} for ${result.shares} shares`);
        fetchListings(); // Refresh listings
        fetchUser(); // Refresh user balance
      } else {
        const error = await response.json();
        alert(error.error || "Failed to purchase listing");
      }
    } catch (error) {
      console.error("Error buying listing:", error);
      alert("Failed to purchase listing");
    } finally {
      setBuyingListing(null);
    }
  };

  const handleMakeOffer = async () => {
    if (!selectedListing || !offerPrice) return;

    const offerPriceNum = parseFloat(offerPrice);
    if (offerPriceNum <= 0) {
      alert("Offer price must be positive");
      return;
    }

    setMakingOffer(true);

    try {
      const response = await fetch("/api/p2p/offers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          listingId: selectedListing.id,
          offeredPrice: offerPriceNum,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Offer submitted successfully! You offered $${offerPriceNum.toFixed(2)} per share (${formatCurrency(result.offer.totalValue)} total)`);
        setShowOfferModal(false);
        setOfferPrice("");
        setSelectedListing(null);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to submit offer");
      }
    } catch (error) {
      console.error("Error making offer:", error);
      alert("Failed to submit offer");
    } finally {
      setMakingOffer(false);
    }
  };

  const filteredListings = listings
    .filter(listing =>
      listing.companySymbol.toLowerCase().includes(filter.toLowerCase()) ||
      listing.companyName.toLowerCase().includes(filter.toLowerCase()) ||
      listing.sellerUsername.toLowerCase().includes(filter.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "pricePerShare":
          return a.pricePerShare - b.pricePerShare;
        case "totalValue":
          return a.totalValue - b.totalValue;
        case "discount":
          return b.discount - a.discount; // Higher discount first
        case "shares":
          return b.shares - a.shares; // Higher shares first
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return '$0.00';
    }
    return `$${amount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-zinc-900 dark:border-zinc-100"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      {/* Trading Ended Banner */}
      {tradingEnded && (
        <div className="bg-red-50 dark:bg-red-900/20 border-b-2 border-red-200 dark:border-red-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="text-center">
              <h2 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">Event Has Ended</h2>
              <p className="text-red-600 dark:text-red-400">P2P trading is no longer available. You can still view listings for reference.</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-zinc-800 shadow-sm border-b border-zinc-200 dark:border-zinc-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 animate-in fade-in-0 slide-in-from-left-4 duration-500">
                P2P Market 🏪
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400 mt-2 animate-in fade-in-0 slide-in-from-left-2 duration-500" style={{ animationDelay: '100ms' }}>
                {tradingEnded ? "View completed and remaining listings" : "Buy shares directly from other players at negotiated prices"}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {user && (
                <div className="text-right animate-in fade-in-0 slide-in-from-right-4 duration-500" style={{ animationDelay: '200ms' }}>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">Balance</div>
                  <div className="text-lg font-semibold text-green-600">
                    {formatCurrency(user.balance)}
                  </div>
                </div>
              )}
              <Link href="/">
              <TiltButton className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors">
                ← Back to Dashboard
              </TiltButton>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6 mb-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '300ms' }}>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="flex-1 max-w-md">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Company symbol, name, or seller..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Sort by
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
                >
                  <option value="createdAt">Newest First</option>
                  <option value="pricePerShare">Price per Share</option>
                  <option value="totalValue">Total Value</option>
                  <option value="discount">Biggest Discount</option>
                  <option value="shares">Most Shares</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <Link href="/p2p-market/my-listings">
                <TiltButton className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md rounded-lg">
                  My Listings 📋
                </TiltButton>
              </Link>
              {!tradingEnded && (
                <Link href="/p2p-market/create">
                  <TiltButton className="bg-gradient-to-r from-green-600 to-green-700 px-4 py-2 text-sm font-semibold text-white hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-sm hover:shadow-md rounded-lg">
                    Create Listing ➕
                  </TiltButton>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Listings Grid */}
        {filteredListings.length === 0 ? (
          <div className="text-center py-12 animate-in fade-in-0 duration-500" style={{ animationDelay: '400ms' }}>
            <div className="text-6xl mb-4">🏪</div>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              {filter ? "No listings match your search" : "No active listings"}
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              {filter ? "Try adjusting your search terms" : "Be the first to create a P2P listing!"}
            </p>
            <Link href="/p2p-market/create">
              <TiltButton className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-3 text-lg font-semibold text-white hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-sm hover:shadow-md rounded-lg">
                Create First Listing 🚀
              </TiltButton>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing, index) => (
              <div
                key={listing.id}
                className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6 hover:shadow-lg transition-all duration-300 cursor-pointer animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: `${400 + index * 100}ms` }}
              >
                {/* Company Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    {listing.companySymbol}
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {listing.companyName}
                  </p>
                  </div>
                  {listing.discount > 0 && !isNaN(listing.discount) && (
                    <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full text-xs font-medium">
                      -{listing.discount.toFixed(1)}% off
                    </div>
                  )}
                </div>

                {/* Price Info */}
                <div className="mb-4">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(listing.pricePerShare)}
                    </span>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      per share
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {listing.shares} shares
                    </span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      Total: {formatCurrency(listing.totalValue)}
                    </span>
                  </div>
                  {listing.currentMarketPrice > 0 && (
                    <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                      Market: {formatCurrency(listing.currentMarketPrice)}
                    </div>
                  )}
                </div>

                {/* Seller Info */}
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    Seller: <span className="font-medium">{listing.sellerUsername}</span>
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-500">
                    {new Date(listing.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Action Buttons */}
                {user && listing.sellerId !== user.id && !user.isPaused && !user.isBanned && (
                  <div className="space-y-2">
                    <TiltButton
                      onClick={() => handleBuyListing(listing.id)}
                      disabled={buyingListing === listing.id || user.balance < listing.totalValue || tradingEnded}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      {tradingEnded ? (
                        "Trading Ended"
                      ) : buyingListing === listing.id ? (
                        <div className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Buying...
                        </div>
                      ) : user.balance < listing.totalValue ? (
                        "Insufficient Balance"
                      ) : (
                        `Buy for ${formatCurrency(listing.totalValue)} 💰`
                      )}
                    </TiltButton>

                    <TiltButton
                      onClick={() => {
                        setSelectedListing(listing);
                        setOfferPrice("");
                        setShowOfferModal(true);
                      }}
                      disabled={tradingEnded}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 px-4 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      Make Offer 💬
                    </TiltButton>
                  </div>
                )}

                {user && listing.sellerId === user.id && (
                  <div className="w-full bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 py-2 px-4 rounded-lg text-center text-sm">
                    Your Listing
                  </div>
                )}

                {!user && (
                  <Link href="/signin" className="block">
                    <TiltButton className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md">
                      Sign In to Buy 🔐
                    </TiltButton>
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Offer Modal */}
        {showOfferModal && selectedListing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Make an Offer</h2>
                  <button
                    onClick={() => setShowOfferModal(false)}
                    className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Listing Info */}
                <div className="bg-zinc-50 dark:bg-zinc-700 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {selectedListing.companySymbol} - {selectedListing.companyName}
                    </h3>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {selectedListing.shares} shares
                    </span>
                  </div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    Listed by: <span className="font-medium">{selectedListing.sellerUsername}</span>
                  </div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    Asking: {formatCurrency(selectedListing.pricePerShare)} per share
                    ({formatCurrency(selectedListing.totalValue)} total)
                  </div>
                  {selectedListing.currentMarketPrice > 0 && (
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      Market: {formatCurrency(selectedListing.currentMarketPrice)} per share
                    </div>
                  )}
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleMakeOffer(); }} className="space-y-6">
                  {/* Offer Price Input */}
                  <div>
                    <label htmlFor="offerPrice" className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                      Your Offer Price per Share ($)
                    </label>
                    <input
                      type="number"
                      id="offerPrice"
                      value={offerPrice}
                      onChange={(e) => setOfferPrice(e.target.value)}
                      min="0.01"
                      step="0.01"
                      className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 px-4 py-3 text-sm bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 transition-all"
                      placeholder="Enter your offer price"
                      required
                    />
                  </div>

                  {/* Offer Summary */}
                  {offerPrice && selectedListing && (
                    <div className={`rounded-lg p-4 ${
                      parseFloat(offerPrice) >= selectedListing.pricePerShare
                        ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                        : "bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800"
                    }`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          Your offer:
                        </span>
                        <span className="font-semibold">
                          {formatCurrency(parseFloat(offerPrice))} × {selectedListing.shares} shares
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">
                          Total cost:
                        </span>
                        <span className={`font-bold text-lg ${
                          parseFloat(offerPrice) >= selectedListing.pricePerShare
                            ? "text-green-600 dark:text-green-400"
                            : "text-orange-600 dark:text-orange-400"
                        }`}>
                          {formatCurrency(parseFloat(offerPrice) * selectedListing.shares)}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                        {parseFloat(offerPrice) >= selectedListing.pricePerShare
                          ? "💰 You're offering at or above the asking price!"
                          : "🤝 This is a negotiation offer - the seller can accept or decline"
                        }
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowOfferModal(false)}
                      className="flex-1 bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-4 py-3 rounded-lg font-medium hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={makingOffer || !offerPrice || parseFloat(offerPrice) <= 0}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 disabled:from-purple-400 disabled:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      {makingOffer ? (
                        <div className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Submitting...
                        </div>
                      ) : (
                        `Submit Offer 💬`
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

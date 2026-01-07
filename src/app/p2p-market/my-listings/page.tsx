"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TiltButton } from "@/components/TiltButton";

interface UserListing {
  id: string;
  companySymbol: string;
  companyName: string;
  shares: number;
  pricePerShare: number;
  totalValue: number;
  currentMarketPrice: number;
  status: string;
  buyerUsername: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface User {
  id: string;
  username: string;
  balance: number;
  isPaused: boolean;
  isBanned: boolean;
}

export default function MyP2PListingsPage() {
  const [listings, setListings] = useState<UserListing[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [offers, setOffers] = useState<{[key: string]: any[]}>({});
  const [processingOffer, setProcessingOffer] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchOffersForListing = async (listingId: string) => {
    try {
      const response = await fetch(`/api/p2p/listings/${listingId}/offers`);
      if (response.ok) {
        const offersData = await response.json();
        setOffers(prev => ({
          ...prev,
          [listingId]: offersData
        }));
      }
    } catch (error) {
      console.error("Failed to fetch offers:", error);
    }
  };

  const fetchData = async () => {
    try {
      // Fetch user data
      const userResponse = await fetch("/api/auth/user");
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData.user);
      }

      // Fetch user's listings
      const listingsResponse = await fetch("/api/p2p/my-listings");
      if (listingsResponse.ok) {
        const listingsData = await listingsResponse.json();
        setListings(listingsData);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelListing = async (listingId: string) => {
    if (!confirm("Are you sure you want to cancel this listing?")) {
      return;
    }

    setCancellingId(listingId);

    try {
      const response = await fetch(`/api/p2p/listings/${listingId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        alert("Listing cancelled successfully");
        fetchData(); // Refresh listings
      } else {
        const error = await response.json();
        alert(error.error || "Failed to cancel listing");
      }
    } catch (error) {
      console.error("Error cancelling listing:", error);
      alert("Failed to cancel listing");
    } finally {
      setCancellingId(null);
    }
  };

  const handleOfferResponse = async (offerId: string, action: "accept" | "decline") => {
    setProcessingOffer(offerId);

    try {
      const response = await fetch(`/api/p2p/offers/${offerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        fetchData(); // Refresh listings and offers
      } else {
        const error = await response.json();
        alert(error.error || "Failed to process offer");
      }
    } catch (error) {
      console.error("Error processing offer:", error);
      alert("Failed to process offer");
    } finally {
      setProcessingOffer(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "accepted":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "declined":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200";
    }
  };

  const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return '$0.00';
    }
    return `$${amount.toFixed(2)}`;
  };


  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return "🟢";
      case "completed":
        return "✅";
      case "cancelled":
        return "❌";
      default:
        return "❓";
    }
  };

  const activeListings = listings.filter(l => l.status === "active");
  const completedListings = listings.filter(l => l.status === "completed");
  const cancelledListings = listings.filter(l => l.status === "cancelled");

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">Please Sign In</h1>
          <Link href="/signin">
            <TiltButton className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
              Sign In 🔐
            </TiltButton>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-800 shadow-sm border-b border-zinc-200 dark:border-zinc-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 animate-in fade-in-0 slide-in-from-left-4 duration-500">
                My P2P Listings 📋
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400 mt-2 animate-in fade-in-0 slide-in-from-left-2 duration-500" style={{ animationDelay: '100ms' }}>
                Manage your active and past listings
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/p2p-market">
                <TiltButton className="bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 px-4 py-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors">
                  ← Back to Market
                </TiltButton>
              </Link>
              <Link href="/p2p-market/my-offers">
                <TiltButton className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                  My Offers 💬
                </TiltButton>
              </Link>
              <Link href="/p2p-market/create">
                <TiltButton className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                  Create Listing ➕
                </TiltButton>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-3">
              <div className="text-2xl">🟢</div>
              <div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{activeListings.length}</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">Active Listings</div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center gap-3">
              <div className="text-2xl">✅</div>
              <div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{completedListings.length}</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">Completed Sales</div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '400ms' }}>
            <div className="flex items-center gap-3">
              <div className="text-2xl">💰</div>
              <div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-500">
                  {formatCurrency(completedListings.reduce((sum, listing) => sum + listing.totalValue, 0))}
                </div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">Total Earned</div>
              </div>
            </div>
          </div>
        </div>

        {/* Listings Sections */}
        <div className="space-y-8">
          {/* Active Listings */}
          {activeListings.length > 0 && (
            <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '500ms' }}>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                🟢 Active Listings
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeListings.map((listing) => (
                  <div
                    key={listing.id}
                    className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6"
                  >
                    {/* Offers Section */}
                    {offers[listing.id] && offers[listing.id].length > 0 && (
                      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                          💬 Offers Received ({offers[listing.id].filter((o: any) => o.status === 'pending').length} pending)
                        </h4>
                        <div className="space-y-3">
                          {offers[listing.id].map((offer: any) => (
                            <div key={offer.id} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-700 rounded-lg border border-blue-100 dark:border-blue-700">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{offer.offerer.username}</span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(offer.status)}`}>
                                    {offer.status}
                                  </span>
                                </div>
                                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                                  {formatCurrency(offer.offeredPrice)} per share × {listing.shares} shares = {formatCurrency(offer.totalValue)}
                                </div>
                              </div>
                              {offer.status === 'pending' && (
                                <div className="flex gap-2 ml-4">
                                  <button
                                    onClick={() => handleOfferResponse(offer.id, 'accept')}
                                    disabled={processingOffer === offer.id}
                                    className="bg-green-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    {processingOffer === offer.id ? '...' : 'Accept'}
                                  </button>
                                  <button
                                    onClick={() => handleOfferResponse(offer.id, 'decline')}
                                    disabled={processingOffer === offer.id}
                                    className="bg-red-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    {processingOffer === offer.id ? '...' : 'Decline'}
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Show offers button if no offers loaded yet */}
                    {(!offers[listing.id] || offers[listing.id].length === 0) && (
                      <div className="mb-4">
                        <button
                          onClick={() => fetchOffersForListing(listing.id)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
                        >
                          Check for offers →
                        </button>
                      </div>
                    )}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                          {listing.companySymbol}
                        </h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          {listing.companyName}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(listing.status)}`}>
                        {getStatusIcon(listing.status)} {listing.status}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between">
                        <span className="text-zinc-600 dark:text-zinc-400">Shares:</span>
                        <span className="font-medium">{listing.shares}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600 dark:text-zinc-400">Price per share:</span>
                        <span className="font-medium">{formatCurrency(listing.pricePerShare)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600 dark:text-zinc-400">Total value:</span>
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(listing.totalValue)}</span>
                      </div>
                      {listing.currentMarketPrice > 0 && (
                        <div className="flex justify-between">
                          <span className="text-zinc-600 dark:text-zinc-400">Market price:</span>
                          <span className="text-sm">{formatCurrency(listing.currentMarketPrice)}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                      Created: {new Date(listing.createdAt).toLocaleDateString()}
                    </div>

                    <TiltButton
                      onClick={() => handleCancelListing(listing.id)}
                      disabled={cancellingId === listing.id}
                      className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {cancellingId === listing.id ? (
                        <div className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Cancelling...
                        </div>
                      ) : (
                        "Cancel Listing ❌"
                      )}
                    </TiltButton>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Listings */}
          {completedListings.length > 0 && (
            <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '600ms' }}>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                ✅ Completed Sales
              </h2>
              <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-zinc-50 dark:bg-zinc-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          Company
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          Shares
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          Price/Share
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          Buyer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          Completed
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                      {completedListings.map((listing) => (
                        <tr key={listing.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-zinc-900 dark:text-zinc-100">
                              {listing.companySymbol}
                            </div>
                            <div className="text-sm text-zinc-500 dark:text-zinc-400">
                              {listing.companyName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-zinc-900 dark:text-zinc-100">
                            {listing.shares}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-zinc-900 dark:text-zinc-100">
                            {formatCurrency(listing.pricePerShare)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-green-600 dark:text-green-500">
                            {formatCurrency(listing.totalValue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-zinc-900 dark:text-zinc-100">
                            {listing.buyerUsername || "Unknown"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">
                            {listing.completedAt ? new Date(listing.completedAt).toLocaleDateString() : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Cancelled Listings */}
          {cancelledListings.length > 0 && (
            <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '700ms' }}>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                ❌ Cancelled Listings
              </h2>
              <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-zinc-50 dark:bg-zinc-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          Company
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          Shares
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          Price/Share
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          Cancelled
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                      {cancelledListings.map((listing) => (
                        <tr key={listing.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-zinc-900 dark:text-zinc-100">
                              {listing.companySymbol}
                            </div>
                            <div className="text-sm text-zinc-500 dark:text-zinc-400">
                              {listing.companyName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-zinc-900 dark:text-zinc-100">
                            {listing.shares}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-zinc-900 dark:text-zinc-100">
                            {formatCurrency(listing.pricePerShare)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-zinc-900 dark:text-zinc-100">
                            {formatCurrency(listing.totalValue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">
                            {new Date(listing.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* No listings message */}
          {listings.length === 0 && (
            <div className="text-center py-12 animate-in fade-in-0 duration-500" style={{ animationDelay: '500ms' }}>
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                No listings yet
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                You haven't created any P2P listings yet. Start selling your shares to other players!
              </p>
              <Link href="/p2p-market/create">
                <TiltButton className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors text-lg">
                  Create Your First Listing 🚀
                </TiltButton>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

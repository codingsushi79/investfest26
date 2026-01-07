"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TiltButton } from "@/components/TiltButton";

interface UserOffer {
  id: string;
  offeredPrice: number;
  totalValue: number;
  status: string;
  createdAt: string;
  listing: {
    id: string;
    shares: number;
    companySymbol: string;
    companyName: string;
    sellerUsername: string;
    listingPrice: number;
  };
}

interface User {
  id: string;
  username: string;
  balance: number;
  isPaused: boolean;
  isBanned: boolean;
}

export default function MyOffersPage() {
  const [offers, setOffers] = useState<UserOffer[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch user data
      const userResponse = await fetch("/api/auth/user");
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData.user);
      }

      // Fetch user's offers
      const offersResponse = await fetch("/api/p2p/my-offers");
      if (offersResponse.ok) {
        const offersData = await offersResponse.json();
        setOffers(offersData);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return '$0.00';
    }
    return `$${amount.toFixed(2)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "accepted":
        return "bg-green-100 text-green-800";
      case "declined":
        return "bg-red-100 text-red-800";
      default:
        return "bg-zinc-100 text-zinc-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return "⏳";
      case "accepted":
        return "✅";
      case "declined":
        return "❌";
      default:
        return "❓";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-zinc-900"></div>
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

  const pendingOffers = offers.filter(o => o.status === 'pending');
  const acceptedOffers = offers.filter(o => o.status === 'accepted');
  const declinedOffers = offers.filter(o => o.status === 'declined');

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900">
                My Offers 💬
              </h1>
              <p className="text-zinc-600" style={{ animationDelay: '100ms' }}>
                Track offers you've made on P2P listings
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

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-3">
              <div className="text-2xl">⏳</div>
              <div>
                <div className="text-2xl font-bold text-zinc-900">{pendingOffers.length}</div>
                <div className="text-sm text-zinc-600">Pending Offers</div>
              </div>
            </div>
          </div>
          <div className="bg-white" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center gap-3">
              <div className="text-2xl">✅</div>
              <div>
                <div className="text-2xl font-bold text-zinc-900">{acceptedOffers.length}</div>
                <div className="text-sm text-zinc-600">Accepted Offers</div>
              </div>
            </div>
          </div>
          <div className="bg-white" style={{ animationDelay: '400ms' }}>
            <div className="flex items-center gap-3">
              <div className="text-2xl">❌</div>
              <div>
                <div className="text-2xl font-bold text-zinc-900">{declinedOffers.length}</div>
                <div className="text-sm text-zinc-600">Declined Offers</div>
              </div>
            </div>
          </div>
        </div>

        {/* Offers Sections */}
        <div className="space-y-8">
          {/* Pending Offers */}
          {pendingOffers.length > 0 && (
            <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '500ms' }}>
              <h2 className="text-xl font-semibold text-zinc-900">
                ⏳ Pending Offers
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingOffers.map((offer) => (
                  <div
                    key={offer.id}
                    className="bg-white"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-zinc-900">
                          {offer.listing.companySymbol}
                        </h3>
                        <p className="text-sm text-zinc-600">
                          {offer.listing.companyName}
                        </p>
                        <p className="text-xs text-zinc-500">
                          Seller: {offer.listing.sellerUsername}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(offer.status)}`}>
                        {getStatusIcon(offer.status)} {offer.status}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between">
                        <span className="text-zinc-600">Your offer:</span>
                        <span className="font-medium">{formatCurrency(offer.offeredPrice)} per share</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600">Total:</span>
                        <span className="font-bold text-zinc-900">{formatCurrency(offer.totalValue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600">Shares:</span>
                        <span className="font-medium">{offer.listing.shares}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600">Listed at:</span>
                        <span className="text-sm">{formatCurrency(offer.listing.listingPrice)} per share</span>
                      </div>
                    </div>

                    <div className="text-xs text-zinc-500">
                      Offered: {new Date(offer.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Accepted Offers */}
          {acceptedOffers.length > 0 && (
            <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '600ms' }}>
              <h2 className="text-xl font-semibold text-zinc-900">
                ✅ Accepted Offers
              </h2>
              <div className="bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-zinc-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500">
                          Company
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500">
                          Your Offer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500">
                          Total Paid
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500">
                          Shares
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500">
                          Seller
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500">
                          Accepted
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {acceptedOffers.map((offer) => (
                        <tr key={offer.id} className="hover:bg-zinc-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-zinc-900">
                              {offer.listing.companySymbol}
                            </div>
                            <div className="text-sm text-zinc-500">
                              {offer.listing.companyName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-zinc-900">
                            {formatCurrency(offer.offeredPrice)}/share
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-green-600">
                            {formatCurrency(offer.totalValue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-zinc-900">
                            {offer.listing.shares}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-zinc-900">
                            {offer.listing.sellerUsername}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                            {new Date(offer.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Declined Offers */}
          {declinedOffers.length > 0 && (
            <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '700ms' }}>
              <h2 className="text-xl font-semibold text-zinc-900">
                ❌ Declined Offers
              </h2>
              <div className="bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-zinc-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500">
                          Company
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500">
                          Your Offer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500">
                          Seller
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500">
                          Declined
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {declinedOffers.map((offer) => (
                        <tr key={offer.id} className="hover:bg-zinc-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-zinc-900">
                              {offer.listing.companySymbol}
                            </div>
                            <div className="text-sm text-zinc-500">
                              {offer.listing.companyName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-zinc-900">
                            {formatCurrency(offer.offeredPrice)}/share
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-zinc-900">
                            {offer.listing.sellerUsername}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                            {new Date(offer.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* No offers message */}
          {offers.length === 0 && (
            <div className="text-center py-12 animate-in fade-in-0 duration-500" style={{ animationDelay: '500ms' }}>
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-xl font-semibold text-zinc-900">
                No offers yet
              </h3>
              <p className="text-zinc-600">
                You haven't made any offers on P2P listings yet. Browse the market to find listings you want to negotiate on!
              </p>
              <Link href="/p2p-market">
                <TiltButton className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors text-lg">
                  Browse P2P Market 🏪
                </TiltButton>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

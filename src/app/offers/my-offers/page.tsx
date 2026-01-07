'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TiltButton } from '@/components/TiltButton';
import { TiltLink } from '@/components/TiltLink';

interface MySellOffer {
  id: string;
  shares: number;
  pricePerShare: number;
  status: string;
  createdAt: string;
  completedAt?: string;
  company: {
    symbol: string;
    name: string;
  };
  buyOffers: {
    id: string;
    offeredPrice: number;
    status: string;
    createdAt: string;
    buyer: {
      username: string;
    };
  }[];
}

interface MyBuyOffer {
  id: string;
  offeredPrice: number;
  status: string;
  createdAt: string;
  sellOffer: {
    shares: number;
    pricePerShare: number;
    company: {
      symbol: string;
      name: string;
    };
    seller: {
      username: string;
    };
  };
}

export default function MyOffersPage() {
  const [sellOffers, setSellOffers] = useState<MySellOffer[]>([]);
  const [buyOffers, setBuyOffers] = useState<MyBuyOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'sell' | 'buy'>('sell');

  useEffect(() => {
    fetchMyOffers();
  }, []);

  const fetchMyOffers = async () => {
    try {
      setLoading(true);
      const [sellResponse, buyResponse] = await Promise.all([
        fetch('/api/offers/my-sell-offers'),
        fetch('/api/offers/my-buy-offers'),
      ]);

      if (!sellResponse.ok || !buyResponse.ok) {
        throw new Error('Failed to fetch offers');
      }

      const sellData = await sellResponse.json();
      const buyData = await buyResponse.json();

      setSellOffers(sellData.offers || []);
      setBuyOffers(buyData.offers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRespondToOffer = async (buyOfferId: string, action: 'accept' | 'decline') => {
    try {
      const response = await fetch('/api/offers/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buyOfferId,
          action,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to respond to offer');
      }

      fetchMyOffers(); // Refresh the offers
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to respond to offer');
    }
  };

  const handleCancelSellOffer = async (sellOfferId: string) => {
    try {
      const response = await fetch('/api/offers/cancel-sell-offer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sellOfferId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel offer');
      }

      fetchMyOffers(); // Refresh the offers
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel offer');
    }
  };

  const formatCurrency = (amount: number) => {
    if (isNaN(amount)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      active: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-blue-100 text-blue-800',
      declined: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        statusStyles[status as keyof typeof statusStyles] || 'bg-gray-100 text-gray-800'
      }`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading your offers...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="text-center">
            <div className="rounded-lg bg-red-50 border border-red-200 p-6">
              <p className="text-red-800">Error: {error}</p>
              <button
                onClick={fetchMyOffers}
                className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-slate-900">My Offers</h1>
            <TiltLink
              href="/offers"
              className="rounded-lg bg-slate-200 px-4 py-2 text-slate-700 hover:bg-slate-300 transition-colors"
            >
              ← Back to Offers
            </TiltLink>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg mb-6">
            <button
              onClick={() => setActiveTab('sell')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                activeTab === 'sell'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My Sell Offers ({sellOffers.length})
            </button>
            <button
              onClick={() => setActiveTab('buy')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                activeTab === 'buy'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My Buy Offers ({buyOffers.length})
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'sell' ? (
          <div className="space-y-6">
            {sellOffers.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📈</div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">No sell offers yet</h3>
                <p className="text-slate-600 mb-6">Create your first sell offer to start trading!</p>
                <TiltLink
                  href="/offers/create-sell"
                  className="inline-block rounded-lg bg-green-600 px-6 py-3 text-white font-semibold hover:bg-green-700 transition-colors"
                >
                  Create Sell Offer
                </TiltLink>
              </div>
            ) : (
              sellOffers.map((offer) => (
                <div
                  key={offer.id}
                  className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold">
                        {offer.company.symbol[0]}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{offer.company.name}</h3>
                        <p className="text-sm text-slate-600">{offer.company.symbol}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {getStatusBadge(offer.status)}
                      <span className="text-sm text-slate-600">
                        {formatDate(offer.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-slate-600">Shares</p>
                      <p className="font-semibold text-slate-900">{offer.shares.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Price per Share</p>
                      <p className="font-semibold text-green-600">{formatCurrency(offer.pricePerShare)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Total Value</p>
                      <p className="font-semibold text-slate-900">
                        {formatCurrency(offer.shares * offer.pricePerShare)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Offers Received</p>
                      <p className="font-semibold text-slate-900">{offer.buyOffers.length}</p>
                    </div>
                  </div>

                  {/* Buy Offers */}
                  {offer.buyOffers.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium text-slate-900 mb-3">Offers Received:</h4>
                      <div className="space-y-2">
                        {offer.buyOffers.map((buyOffer) => (
                          <div
                            key={buyOffer.id}
                            className="flex items-center justify-between bg-slate-50 rounded-lg p-3"
                          >
                            <div className="flex items-center space-x-3">
                              <span className="font-medium text-slate-900">{buyOffer.buyer.username}</span>
                              <span className="text-sm text-slate-600">
                                offered {formatCurrency(buyOffer.offeredPrice)}/share
                              </span>
                              <span className="text-sm text-slate-600">
                                total: {formatCurrency(buyOffer.offeredPrice * offer.shares)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              {getStatusBadge(buyOffer.status)}
                              {offer.status === 'active' && buyOffer.status === 'pending' && (
                                <div className="flex space-x-1">
                                  <TiltButton
                                    onClick={() => handleRespondToOffer(buyOffer.id, 'accept')}
                                    className="rounded px-2 py-1 text-xs bg-green-600 text-white hover:bg-green-700 transition-colors"
                                  >
                                    Accept
                                  </TiltButton>
                                  <TiltButton
                                    onClick={() => handleRespondToOffer(buyOffer.id, 'decline')}
                                    className="rounded px-2 py-1 text-xs bg-red-600 text-white hover:bg-red-700 transition-colors"
                                  >
                                    Decline
                                  </TiltButton>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {offer.status === 'active' && (
                    <div className="flex justify-end">
                      <TiltButton
                        onClick={() => handleCancelSellOffer(offer.id)}
                        className="rounded-lg bg-red-600 px-4 py-2 text-white font-medium hover:bg-red-700 transition-colors"
                      >
                        Cancel Offer
                      </TiltButton>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {buyOffers.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📉</div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">No buy offers yet</h3>
                <p className="text-slate-600 mb-6">Make offers on sell listings to start trading!</p>
                <TiltLink
                  href="/offers"
                  className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 transition-colors"
                >
                  Browse Offers
                </TiltLink>
              </div>
            ) : (
              buyOffers.map((offer) => (
                <div
                  key={offer.id}
                  className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                        {offer.sellOffer.company.symbol[0]}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{offer.sellOffer.company.name}</h3>
                        <p className="text-sm text-slate-600">{offer.sellOffer.company.symbol}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-600">Seller</p>
                      <p className="font-medium text-slate-900">{offer.sellOffer.seller.username}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-slate-600">Shares Offered</p>
                      <p className="font-semibold text-slate-900">{offer.sellOffer.shares.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Your Offer</p>
                      <p className="font-semibold text-blue-600">{formatCurrency(offer.offeredPrice)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Total Cost</p>
                      <p className="font-semibold text-slate-900">
                        {formatCurrency(offer.sellOffer.shares * offer.offeredPrice)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Offered</p>
                      <p className="font-semibold text-slate-900">{formatDate(offer.createdAt)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusBadge(offer.status)}
                      <span className="text-sm text-slate-600">
                        Asking: {formatCurrency(offer.sellOffer.pricePerShare)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

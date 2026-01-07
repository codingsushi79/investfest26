'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TiltButton } from '@/components/TiltButton';
import { TiltLink } from '@/components/TiltLink';

interface SellOffer {
  id: string;
  shares: number;
  pricePerShare: number;
  createdAt: string;
  seller: {
    username: string;
  };
  company: {
    symbol: string;
    name: string;
  };
}

interface BuyOffer {
  id: string;
  offeredPrice: number;
  createdAt: string;
  buyer: {
    username: string;
  };
  sellOffer: {
    shares: number;
    company: {
      symbol: string;
      name: string;
    };
  };
}

export default function OffersPage() {
  const [sellOffers, setSellOffers] = useState<SellOffer[]>([]);
  const [buyOffers, setBuyOffers] = useState<BuyOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'sell' | 'buy'>('sell');
  const [showBuyOfferModal, setShowBuyOfferModal] = useState(false);
  const [selectedSellOffer, setSelectedSellOffer] = useState<SellOffer | null>(null);
  const [buyOfferPrice, setBuyOfferPrice] = useState('');
  const [submittingBuyOffer, setSubmittingBuyOffer] = useState(false);

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const [sellResponse, buyResponse] = await Promise.all([
        fetch('/api/offers/sell'),
        fetch('/api/offers/buy'),
      ]);

      // Handle authentication errors
      if (sellResponse.status === 401 || buyResponse.status === 401) {
        window.location.href = '/signin';
        return;
      }

      if (!sellResponse.ok || !buyResponse.ok) {
        const sellError = sellResponse.ok ? null : await sellResponse.json();
        const buyError = buyResponse.ok ? null : await buyResponse.json();
        const errorMessage = sellError?.error || buyError?.error || 'Failed to fetch offers';
        throw new Error(errorMessage);
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

  const handleMakeBuyOffer = (sellOffer: SellOffer) => {
    setSelectedSellOffer(sellOffer);
    setBuyOfferPrice(sellOffer.pricePerShare.toString());
    setShowBuyOfferModal(true);
  };

  const submitBuyOffer = async () => {
    if (!selectedSellOffer || !buyOfferPrice) return;

    setSubmittingBuyOffer(true);
    try {
      const response = await fetch('/api/offers/make-buy-offer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sellOfferId: selectedSellOffer.id,
          offeredPrice: parseFloat(buyOfferPrice),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to make offer');
      }

      setShowBuyOfferModal(false);
      setSelectedSellOffer(null);
      setBuyOfferPrice('');
      fetchOffers(); // Refresh the offers
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to make offer');
    } finally {
      setSubmittingBuyOffer(false);
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

      fetchOffers(); // Refresh the offers
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to respond to offer');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading offers...</p>
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
                onClick={fetchOffers}
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
            <h1 className="text-3xl font-bold text-slate-900">Trading Offers</h1>
            <TiltLink
              href="/"
              className="rounded-lg bg-slate-200 px-4 py-2 text-slate-700 hover:bg-slate-300 transition-colors"
            >
              ← Back to Dashboard
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
              Sell Offers ({sellOffers.length})
            </button>
            <button
              onClick={() => setActiveTab('buy')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                activeTab === 'buy'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Buy Offers ({buyOffers.length})
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <TiltLink
              href="/offers/create-sell"
              className="rounded-lg bg-gradient-to-r from-green-600 to-green-700 px-6 py-3 text-white font-semibold hover:from-green-700 hover:to-green-800 transition-all shadow-sm hover:shadow-md text-center"
            >
              💰 Create Sell Offer
            </TiltLink>
            <TiltLink
              href="/offers/my-offers"
              className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm hover:shadow-md text-center"
            >
              📋 My Offers
            </TiltLink>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'sell' ? (
          <div className="space-y-4">
            {sellOffers.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📈</div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">No sell offers available</h3>
                <p className="text-slate-600 mb-6">Be the first to create a sell offer!</p>
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
                  className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow"
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
                    <div className="text-right">
                      <p className="text-sm text-slate-600">Listed by</p>
                      <p className="font-medium text-slate-900">{offer.seller.username}</p>
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
                      <p className="text-sm text-slate-600">Listed</p>
                      <p className="font-semibold text-slate-900">{formatDate(offer.createdAt)}</p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <TiltButton
                      onClick={() => handleMakeBuyOffer(offer)}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 transition-colors"
                    >
                      Make Buy Offer
                    </TiltButton>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {buyOffers.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📉</div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">No buy offers available</h3>
                <p className="text-slate-600">Buy offers will appear here when users make offers on sell listings.</p>
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
                      <p className="text-sm text-slate-600">Offered by</p>
                      <p className="font-medium text-slate-900">{offer.buyer.username}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-slate-600">Shares Offered</p>
                      <p className="font-semibold text-slate-900">{offer.sellOffer.shares.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Offered Price</p>
                      <p className="font-semibold text-blue-600">{formatCurrency(offer.offeredPrice)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Total Value</p>
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
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Pending
                    </span>
                    <div className="flex space-x-2">
                      <TiltButton
                        onClick={() => handleRespondToOffer(offer.id, 'accept')}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white font-medium hover:bg-green-700 transition-colors"
                      >
                        Accept
                      </TiltButton>
                      <TiltButton
                        onClick={() => handleRespondToOffer(offer.id, 'decline')}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white font-medium hover:bg-red-700 transition-colors"
                      >
                        Decline
                      </TiltButton>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Buy Offer Modal */}
        {showBuyOfferModal && selectedSellOffer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Make Buy Offer</h3>

                <div className="mb-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold">
                      {selectedSellOffer.company.symbol[0]}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">{selectedSellOffer.company.name}</h4>
                      <p className="text-sm text-slate-600">{selectedSellOffer.company.symbol}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-600">Shares available:</p>
                      <p className="font-medium">{selectedSellOffer.shares.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Asking price:</p>
                      <p className="font-medium">{formatCurrency(selectedSellOffer.pricePerShare)}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label htmlFor="offerPrice" className="block text-sm font-medium text-slate-900 mb-2">
                    Your Offer Price per Share
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">$</span>
                    <input
                      type="number"
                      id="offerPrice"
                      value={buyOfferPrice}
                      onChange={(e) => setBuyOfferPrice(e.target.value)}
                      min="0.01"
                      step="0.01"
                      className="block w-full rounded-lg border border-slate-300 pl-8 pr-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholder="0.00"
                    />
                  </div>
                  {buyOfferPrice && (
                    <div className="mt-2 text-sm">
                      <p className="text-slate-600">Total cost: {formatCurrency(selectedSellOffer.shares * parseFloat(buyOfferPrice))}</p>
                      {parseFloat(buyOfferPrice) >= selectedSellOffer.pricePerShare ? (
                        <p className="text-green-600">Above asking price</p>
                      ) : (
                        <p className="text-blue-600">Below asking price</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowBuyOfferModal(false);
                      setSelectedSellOffer(null);
                      setBuyOfferPrice('');
                    }}
                    className="flex-1 rounded-lg bg-slate-200 px-4 py-2 text-slate-700 font-medium hover:bg-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <TiltButton
                    onClick={submitBuyOffer}
                    disabled={submittingBuyOffer || !buyOfferPrice}
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {submittingBuyOffer ? 'Submitting...' : 'Make Offer'}
                  </TiltButton>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

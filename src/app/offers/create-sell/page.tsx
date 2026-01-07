'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TiltButton } from '@/components/TiltButton';
import { TiltLink } from '@/components/TiltLink';

interface Holding {
  companyId: string;
  symbol: string;
  name: string;
  shares: number;
  latestPrice: number;
}

interface UserData {
  balance: number;
  holdings: Holding[];
}

export default function CreateSellOfferPage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [selectedHolding, setSelectedHolding] = useState<string>('');
  const [shares, setShares] = useState<string>('');
  const [pricePerShare, setPricePerShare] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/dashboard');
      if (response.status === 401) {
        window.location.href = '/signin';
        return;
      }
      if (!response.ok) throw new Error('Failed to fetch user data');

      const data = await response.json();
      setUserData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const selectedHoldingData = userData?.holdings.find(
    (h) => h.companyId === selectedHolding
  );

  const maxShares = selectedHoldingData?.shares || 0;
  const totalValue = shares && pricePerShare
    ? parseInt(shares) * parseFloat(pricePerShare)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHoldingData || !shares || !pricePerShare) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/offers/create-sell', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: selectedHolding,
          shares: parseInt(shares),
          pricePerShare: parseFloat(pricePerShare),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create offer');
      }

      // Redirect to offers page
      window.location.href = '/offers';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create offer');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-2xl px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-2xl px-4 py-8">
          <div className="text-center">
            <div className="rounded-lg bg-red-50 border border-red-200 p-6">
              <p className="text-red-800">Failed to load user data. Please try again.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (userData.holdings.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-2xl px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-slate-900">Create Sell Offer</h1>
              <TiltLink
                href="/offers"
                className="rounded-lg bg-slate-200 px-4 py-2 text-slate-700 hover:bg-slate-300 transition-colors"
              >
                ← Back to Offers
              </TiltLink>
            </div>
          </div>

          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No holdings to sell</h3>
            <p className="text-slate-600 mb-6">You need to buy some shares first before you can create sell offers.</p>
            <TiltLink
              href="/trade"
              className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 transition-colors"
            >
              Go to Trade
            </TiltLink>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-slate-900">Create Sell Offer</h1>
            <TiltLink
              href="/offers"
              className="rounded-lg bg-slate-200 px-4 py-2 text-slate-700 hover:bg-slate-300 transition-colors"
            >
              ← Back to Offers
            </TiltLink>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {/* Company Selection */}
            <div>
              <label htmlFor="company" className="block text-sm font-medium text-slate-900 mb-2">
                Select Company
              </label>
              <select
                id="company"
                value={selectedHolding}
                onChange={(e) => {
                  setSelectedHolding(e.target.value);
                  setShares('');
                }}
                className="block w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                required
              >
                <option value="">Choose a company...</option>
                {userData.holdings.map((holding) => (
                  <option key={holding.companyId} value={holding.companyId}>
                    {holding.name} ({holding.symbol}) - {holding.shares} shares @ {formatCurrency(holding.latestPrice)}
                  </option>
                ))}
              </select>
            </div>

            {/* Shares Input */}
            {selectedHoldingData && (
              <div>
                <label htmlFor="shares" className="block text-sm font-medium text-slate-900 mb-2">
                  Number of Shares (Max: {maxShares})
                </label>
                <input
                  type="number"
                  id="shares"
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                  min="1"
                  max={maxShares}
                  className="block w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="Enter number of shares"
                  required
                />
              </div>
            )}

            {/* Price Input */}
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-slate-900 mb-2">
                Price per Share
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">$</span>
                <input
                  type="number"
                  id="price"
                  value={pricePerShare}
                  onChange={(e) => setPricePerShare(e.target.value)}
                  min="0.01"
                  step="0.01"
                  className="block w-full rounded-lg border border-slate-300 pl-8 pr-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="0.00"
                  required
                />
              </div>
              {selectedHoldingData && pricePerShare && (
                <p className="text-sm text-slate-600 mt-1">
                  Current market price: {formatCurrency(selectedHoldingData.latestPrice)}
                  {parseFloat(pricePerShare) > selectedHoldingData.latestPrice && (
                    <span className="text-green-600 ml-2">
                      (+{formatCurrency(parseFloat(pricePerShare) - selectedHoldingData.latestPrice)} above market)
                    </span>
                  )}
                  {parseFloat(pricePerShare) < selectedHoldingData.latestPrice && (
                    <span className="text-red-600 ml-2">
                      ({formatCurrency(parseFloat(pricePerShare) - selectedHoldingData.latestPrice)} below market)
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Summary */}
            {shares && pricePerShare && (
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-medium text-slate-900 mb-2">Offer Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600">Shares to sell:</p>
                    <p className="font-medium">{parseInt(shares).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Price per share:</p>
                    <p className="font-medium">{formatCurrency(parseFloat(pricePerShare))}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-600">Total value:</p>
                    <p className="font-semibold text-lg text-green-600">{formatCurrency(totalValue)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <TiltButton
              type="submit"
              disabled={submitting || !selectedHolding || !shares || !pricePerShare}
              className="w-full rounded-lg bg-green-600 px-6 py-3 text-white font-semibold hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Creating Offer...' : 'Create Sell Offer'}
            </TiltButton>
          </form>
        </div>
      </div>
    </div>
  );
}

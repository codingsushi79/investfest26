'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AC } from '@/lib/autocomplete';

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
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [selectedHolding, setSelectedHolding] = useState<string>('');
  const [shares, setShares] = useState<string>('');
  const [pricePerShare, setPricePerShare] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/user', { credentials: 'include' });
      if (response.status === 401) {
        router.push('/signin');
        return;
      }
      if (!response.ok) throw new Error('Failed to fetch user data');

      const data = await response.json();
      setUserData(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load user data');
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

    try {
      const response = await fetch('/api/offers/create-sell', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
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

      toast.success(
        `Sell offer created for ${selectedHoldingData.symbol} — ${shares} shares at $${parseFloat(
          pricePerShare
        ).toFixed(2)} per share`
      );
      setSelectedHolding('');
      setShares('');
      setPricePerShare('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create offer');
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
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 max-w-2xl" />
      </div>
    );
  }

  if (!userData) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Unable to load data"
        description="We couldn't load your holdings. Please try again."
      />
    );
  }

  if (userData.holdings.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Create sell offer"
          description="List shares from your portfolio for other traders to buy."
        />
        <EmptyState
          icon={BarChart3}
          title="No holdings to sell"
          description="You need to buy some shares first before you can create sell offers."
          action={{ href: '/trade', label: 'Go to trade' }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Create sell offer"
        description="List shares from your portfolio for other traders to buy."
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Offer details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="company">Select company</Label>
              <Select
                value={selectedHolding}
                onValueChange={(value) => {
                  if (value) {
                    setSelectedHolding(value);
                    setShares('');
                  }
                }}
              >
                <SelectTrigger id="company">
                  <SelectValue placeholder="Choose a company…" />
                </SelectTrigger>
                <SelectContent>
                  {userData.holdings.map((holding) => (
                    <SelectItem key={holding.companyId} value={holding.companyId}>
                      {holding.name} ({holding.symbol}) — {holding.shares} shares @{' '}
                      {formatCurrency(holding.latestPrice)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedHoldingData && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="shares">Number of shares (max: {maxShares})</Label>
                <Input
                  type="number"
                  id="shares"
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                  autoComplete={AC.off}
                  min={1}
                  max={maxShares}
                  placeholder="Enter number of shares"
                  required
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="price">Price per share</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="number"
                  id="price"
                  value={pricePerShare}
                  onChange={(e) => setPricePerShare(e.target.value)}
                  autoComplete={AC.off}
                  min="0.01"
                  step="0.01"
                  className="pl-9"
                  placeholder="0.00"
                  required
                />
              </div>
              {selectedHoldingData && pricePerShare && (
                <p className="text-sm text-muted-foreground">
                  Current market price: {formatCurrency(selectedHoldingData.latestPrice)}
                  {parseFloat(pricePerShare) > selectedHoldingData.latestPrice && (
                    <span className="ml-2 text-primary">
                      (+{formatCurrency(parseFloat(pricePerShare) - selectedHoldingData.latestPrice)} above market)
                    </span>
                  )}
                  {parseFloat(pricePerShare) < selectedHoldingData.latestPrice && (
                    <span className="ml-2 text-destructive">
                      ({formatCurrency(parseFloat(pricePerShare) - selectedHoldingData.latestPrice)} below market)
                    </span>
                  )}
                </p>
              )}
            </div>

            {shares && pricePerShare && (
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <h4 className="mb-2 font-medium">Offer summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Shares to sell</p>
                    <p className="font-medium">{parseInt(shares).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Price per share</p>
                    <p className="font-medium">{formatCurrency(parseFloat(pricePerShare))}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Total value</p>
                    <p className="text-lg font-semibold text-primary">{formatCurrency(totalValue)}</p>
                  </div>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting || !selectedHolding || !shares || !pricePerShare}
              className="w-full"
            >
              {submitting ? 'Creating offer…' : 'Create sell offer'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

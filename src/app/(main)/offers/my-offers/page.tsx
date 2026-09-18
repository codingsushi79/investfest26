'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    shares: number;
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
  shares: number;
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

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === 'active'
      ? 'default'
      : status === 'completed' || status === 'accepted'
        ? 'secondary'
        : status === 'pending'
          ? 'outline'
          : 'destructive';

  return (
    <Badge variant={variant}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export default function MyOffersPage() {
  const router = useRouter();
  const [sellOffers, setSellOffers] = useState<MySellOffer[]>([]);
  const [buyOffers, setBuyOffers] = useState<MyBuyOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'sell' | 'buy'>('sell');

  useEffect(() => {
    fetchMyOffers();
    const intervalId = setInterval(() => {
      fetchMyOffers();
    }, 30000);
    return () => clearInterval(intervalId);
  }, []);

  const fetchMyOffers = async () => {
    try {
      setLoading(true);
      const [sellResponse, buyResponse] = await Promise.all([
        fetch('/api/offers/my-sell-offers', { credentials: 'include' }),
        fetch('/api/offers/my-buy-offers', { credentials: 'include' }),
      ]);

      if (sellResponse.status === 401 || buyResponse.status === 401) {
        router.push('/signin');
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
      setFetchError(null);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'An error occurred');
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
        credentials: 'include',
        body: JSON.stringify({
          buyOfferId,
          action,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to respond to offer');
      }

      const result = await response.json();
      toast.success(
        result.message ||
          (action === 'accept'
            ? 'Buy offer accepted and trade completed.'
            : 'Buy offer declined.')
      );

      fetchMyOffers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to respond to offer');
    }
  };

  const handleDeleteSellOffer = async (sellOfferId: string) => {
    if (!window.confirm('Delete this listing? This cannot be undone.')) return;

    try {
      const response = await fetch('/api/offers/delete-sell-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sellOfferId }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to delete listing');

      toast.success('Listing deleted');
      fetchMyOffers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete listing');
    }
  };

  const handleCancelSellOffer = async (sellOfferId: string) => {
    try {
      const response = await fetch('/api/offers/cancel-sell-offer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          sellOfferId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel offer');
      }

      toast.success('Sell offer cancelled. Shares returned to your holdings.');
      fetchMyOffers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel offer');
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

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="My offers" description="Track your sell listings and buy offers." />
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
            <p className="text-destructive">{fetchError}</p>
            <Button variant="outline" onClick={fetchMyOffers}>
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My offers"
        description="Track your sell listings and buy offers."
      >
        <Link href="/offers/create-sell" className={buttonVariants()}>
          Create sell offer
        </Link>
      </PageHeader>

      <Tabs value={activeTab} onValueChange={(v) => v && setActiveTab(v as 'sell' | 'buy')}>
        <TabsList>
          <TabsTrigger value="sell">My sell offers ({sellOffers.length})</TabsTrigger>
          <TabsTrigger value="buy">My buy offers ({buyOffers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="sell" className="mt-4 space-y-4">
          {sellOffers.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No sell offers yet"
              description="Create your first sell offer to start trading!"
              action={{ href: '/offers/create-sell', label: 'Create sell offer' }}
            />
          ) : (
            sellOffers.map((offer) => (
              <Card key={offer.id}>
                <CardContent className="pt-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {offer.company.symbol[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{offer.company.name}</h3>
                        <p className="text-sm text-muted-foreground">{offer.company.symbol}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={offer.status} />
                      <span className="text-sm text-muted-foreground">
                        {formatDate(offer.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Shares</p>
                      <p className="font-semibold">{offer.shares.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Price per share</p>
                      <p className="font-semibold text-primary">{formatCurrency(offer.pricePerShare)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total value</p>
                      <p className="font-semibold">{formatCurrency(offer.shares * offer.pricePerShare)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Offers received</p>
                      <p className="font-semibold">{offer.buyOffers.length}</p>
                    </div>
                  </div>

                  {offer.buyOffers.length > 0 && (
                    <div className="mb-4">
                      <h4 className="mb-3 font-medium">Offers received</h4>
                      <div className="space-y-2">
                        {offer.buyOffers.map((buyOffer) => (
                          <div
                            key={buyOffer.id}
                            className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                              <span className="font-medium">{buyOffer.buyer.username}</span>
                              <span className="text-muted-foreground">
                                offered {formatCurrency(buyOffer.offeredPrice)}/share for{' '}
                                {buyOffer.shares.toLocaleString()} shares
                              </span>
                              <span className="text-muted-foreground">
                                total: {formatCurrency(buyOffer.offeredPrice * buyOffer.shares)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusBadge status={buyOffer.status} />
                              {offer.status === 'active' && buyOffer.status === 'pending' && (
                                <div className="flex gap-1">
                                  <Button
                                    size="xs"
                                    onClick={() => handleRespondToOffer(buyOffer.id, 'accept')}
                                  >
                                    Accept
                                  </Button>
                                  <Button
                                    size="xs"
                                    variant="destructive"
                                    onClick={() => handleRespondToOffer(buyOffer.id, 'decline')}
                                  >
                                    Decline
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {offer.status === 'active' && (
                    <div className="flex justify-end gap-2">
                      {offer.buyOffers.filter((b) => b.status === 'pending').length ===
                        0 && (
                        <Button
                          variant="outline"
                          onClick={() => handleDeleteSellOffer(offer.id)}
                        >
                          Delete
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        onClick={() => handleCancelSellOffer(offer.id)}
                      >
                        Cancel offer
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="buy" className="mt-4 space-y-4">
          {buyOffers.length === 0 ? (
            <EmptyState
              icon={TrendingDown}
              title="No buy offers yet"
              description="Make offers on sell listings to start trading!"
              action={{ href: '/offers', label: 'Browse offers' }}
            />
          ) : (
            buyOffers.map((offer) => (
              <Card key={offer.id}>
                <CardContent className="pt-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {offer.sellOffer.company.symbol[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{offer.sellOffer.company.name}</h3>
                        <p className="text-sm text-muted-foreground">{offer.sellOffer.company.symbol}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Seller</p>
                      <p className="font-medium">{offer.sellOffer.seller.username}</p>
                    </div>
                  </div>

                  <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Shares requested</p>
                      <p className="font-semibold">{offer.shares.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Your offer</p>
                      <p className="font-semibold text-primary">{formatCurrency(offer.offeredPrice)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total cost</p>
                      <p className="font-semibold">{formatCurrency(offer.shares * offer.offeredPrice)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Offered</p>
                      <p className="font-semibold">{formatDate(offer.createdAt)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <StatusBadge status={offer.status} />
                    <span className="text-sm text-muted-foreground">
                      Asking: {formatCurrency(offer.sellOffer.pricePerShare)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

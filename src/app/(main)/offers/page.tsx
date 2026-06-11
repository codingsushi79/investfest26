'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  ClipboardList,
  DollarSign,
  Flame,
  Search,
  ThumbsUp,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AC } from '@/lib/autocomplete';
import { cn } from '@/lib/utils';

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
  shares: number;
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

type SellOfferSortOption =
  | 'recent'
  | 'shares-desc'
  | 'shares-asc'
  | 'discount-desc'
  | 'price-desc'
  | 'price-asc';

type BuyOfferSortOption = 'recent' | 'price-desc' | 'price-asc';

const getDiscountPercent = (offer: SellOffer, prices: Record<string, number>) => {
  const marketPrice = prices[offer.company.symbol];
  if (!marketPrice || marketPrice <= 0) return 0;
  return ((marketPrice - offer.pricePerShare) / marketPrice) * 100;
};

const getDealLabel = (discountPercent: number | null) => {
  if (discountPercent === null || discountPercent <= 0) return null;
  if (discountPercent >= 25) {
    return { text: 'Great deal', variant: 'default' as const, icon: Flame };
  }
  if (discountPercent >= 15) {
    return { text: 'Good deal', variant: 'secondary' as const, icon: ThumbsUp };
  }
  if (discountPercent >= 5) {
    return { text: 'Fair price', variant: 'outline' as const, icon: Check };
  }
  return null;
};

export default function OffersPage() {
  const router = useRouter();
  const [sellOffers, setSellOffers] = useState<SellOffer[]>([]);
  const [buyOffers, setBuyOffers] = useState<BuyOffer[]>([]);
  const [user, setUser] = useState<{ balance: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'sell' | 'buy'>('sell');
  const [showBuyOfferModal, setShowBuyOfferModal] = useState(false);
  const [selectedSellOffer, setSelectedSellOffer] = useState<SellOffer | null>(null);
  const [buyOfferPrice, setBuyOfferPrice] = useState('');
  const [buyOfferShares, setBuyOfferShares] = useState('');
  const [submittingBuyOffer, setSubmittingBuyOffer] = useState(false);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [companyFilter, setCompanyFilter] = useState('');
  const [sortOption, setSortOption] = useState<SellOfferSortOption>('recent');
  const [buySortOption, setBuySortOption] = useState<BuyOfferSortOption>('recent');

  useEffect(() => {
    fetchOffers();
    const intervalId = setInterval(() => {
      fetchOffers();
    }, 30000);
    return () => clearInterval(intervalId);
  }, []);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const [sellResponse, buyResponse, userResponse, pricesResponse] = await Promise.all([
        fetch('/api/offers/sell', { credentials: 'include' }),
        fetch('/api/offers/buy', { credentials: 'include' }),
        fetch('/api/user', { credentials: 'include' }),
        fetch('/api/prices'),
      ]);

      if (
        sellResponse.status === 401 ||
        buyResponse.status === 401 ||
        userResponse.status === 401
      ) {
        router.push('/signin');
        return;
      }

      if (!sellResponse.ok || !buyResponse.ok || !userResponse.ok || !pricesResponse.ok) {
        const sellError = sellResponse.ok ? null : await sellResponse.json();
        const buyError = buyResponse.ok ? null : await buyResponse.json();
        const userError = userResponse.ok ? null : await userResponse.json();
        const pricesError = pricesResponse.ok ? null : await pricesResponse.json();
        const errorMessage =
          sellError?.error ||
          buyError?.error ||
          userError?.error ||
          pricesError?.error ||
          'Failed to fetch offers';
        throw new Error(errorMessage);
      }

      const sellData = await sellResponse.json();
      const buyData = await buyResponse.json();
      const userData = await userResponse.json();
      const pricesData = await pricesResponse.json();

      setSellOffers(sellData.offers || []);
      setBuyOffers(buyData.offers || []);
      setUser(userData);
      setPrices(pricesData || {});
      setFetchError(null);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'An error occurred');
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
    setBuyOfferShares(sellOffer.shares.toString());
    setShowBuyOfferModal(true);
  };

  const closeBuyOfferModal = () => {
    setShowBuyOfferModal(false);
    setSelectedSellOffer(null);
    setBuyOfferPrice('');
    setBuyOfferShares('');
  };

  const submitBuyOffer = async () => {
    if (!selectedSellOffer || !buyOfferPrice || !buyOfferShares) return;

    setSubmittingBuyOffer(true);
    try {
      const response = await fetch('/api/offers/make-buy-offer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          sellOfferId: selectedSellOffer.id,
          offeredPrice: parseFloat(buyOfferPrice),
          shares: parseInt(buyOfferShares, 10),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to make offer');
      }

      closeBuyOfferModal();
      toast.success(
        `Buy offer submitted for ${selectedSellOffer.company.symbol} at $${parseFloat(
          buyOfferPrice
        ).toFixed(2)} per share`
      );
      fetchOffers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to make offer');
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

      fetchOffers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to respond to offer');
    }
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
        <PageHeader title="Trading offers" description="Browse sell listings and respond to buy offers." />
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
            <p className="text-destructive">{fetchError}</p>
            <Button variant="outline" onClick={fetchOffers}>
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const normalizedFilter = companyFilter.trim().toLowerCase();
  const filteredSellOffers = sellOffers.filter((offer) => {
    if (!normalizedFilter) return true;
    const nameMatch = offer.company.name.toLowerCase().includes(normalizedFilter);
    const symbolMatch = offer.company.symbol.toLowerCase().includes(normalizedFilter);
    return nameMatch || symbolMatch;
  });

  const displayedSellOffers = [...filteredSellOffers].sort((a, b) => {
    switch (sortOption) {
      case 'shares-desc':
        return b.shares - a.shares;
      case 'shares-asc':
        return a.shares - b.shares;
      case 'price-desc':
        return b.pricePerShare - a.pricePerShare;
      case 'price-asc':
        return a.pricePerShare - b.pricePerShare;
      case 'discount-desc': {
        const diff = getDiscountPercent(b, prices) - getDiscountPercent(a, prices);
        if (diff !== 0) return diff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      case 'recent':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const sortedBuyOffers = [...buyOffers].sort((a, b) => {
    switch (buySortOption) {
      case 'price-desc':
        return b.offeredPrice - a.offeredPrice;
      case 'price-asc':
        return a.offeredPrice - b.offeredPrice;
      case 'recent':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const hasAnySellOffers = sellOffers.length > 0;
  const hasDisplayedSellOffers = displayedSellOffers.length > 0;

  const buyOfferTotal =
    (parseInt(buyOfferShares || '0', 10) || 0) * parseFloat(buyOfferPrice || '0');
  const insufficientBalance = Boolean(
    user && selectedSellOffer && buyOfferTotal > user.balance
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Trading offers"
        description="Browse sell listings and respond to buy offers."
      >
        <Link href="/offers/create-sell" className={buttonVariants()}>
          Create sell offer
        </Link>
        <Link href="/offers/my-offers" className={buttonVariants({ variant: 'outline' })}>
          <ClipboardList data-icon="inline-start" />
          My offers
        </Link>
      </PageHeader>

      <Tabs value={activeTab} onValueChange={(v) => v && setActiveTab(v as 'sell' | 'buy')}>
        <TabsList>
          <TabsTrigger value="sell">Sell offers ({sellOffers.length})</TabsTrigger>
          <TabsTrigger value="buy">Buy offers ({buyOffers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="sell" className="mt-4 space-y-4">
          {!hasAnySellOffers ? (
            <EmptyState
              icon={TrendingUp}
              title="No sell offers available"
              description="Be the first to create a sell offer!"
              action={{ href: '/offers/create-sell', label: 'Create sell offer' }}
            />
          ) : (
            <>
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="relative w-full md:max-w-sm">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                    autoComplete={AC.off}
                    placeholder="Search by company name or symbol…"
                    className="pl-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="shrink-0 text-muted-foreground">Sort by</Label>
                  <Select
                    value={sortOption}
                    onValueChange={(v) => v && setSortOption(v as SellOfferSortOption)}
                  >
                    <SelectTrigger className="w-[220px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Most recent</SelectItem>
                      <SelectItem value="shares-desc">Highest shares</SelectItem>
                      <SelectItem value="shares-asc">Lowest shares</SelectItem>
                      <SelectItem value="discount-desc">Greatest discount vs market</SelectItem>
                      <SelectItem value="price-desc">Highest price per share</SelectItem>
                      <SelectItem value="price-asc">Lowest price per share</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {!hasDisplayedSellOffers ? (
                <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
                  <h3 className="text-lg font-semibold">No offers match your filters</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Try adjusting your search or sort options.
                  </p>
                  {companyFilter && (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setCompanyFilter('')}
                    >
                      Clear search
                    </Button>
                  )}
                </div>
              ) : (
                displayedSellOffers.map((offer) => {
                  const marketPrice = prices[offer.company.symbol];
                  const discountPercent =
                    marketPrice && marketPrice > 0
                      ? getDiscountPercent(offer, prices)
                      : null;
                  const dealLabel = getDealLabel(discountPercent);

                  return (
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
                              <h3 className="flex items-center gap-2 font-semibold">
                                {offer.company.name}
                                {dealLabel && (() => {
                                  const DealIcon = dealLabel.icon;
                                  return (
                                    <Badge variant={dealLabel.variant}>
                                      <DealIcon />
                                      {dealLabel.text}
                                    </Badge>
                                  );
                                })()}
                              </h3>
                              <p className="text-sm text-muted-foreground">{offer.company.symbol}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Listed by</p>
                            <p className="font-medium">{offer.seller.username}</p>
                          </div>
                        </div>

                        <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Shares</p>
                            <p className="font-semibold">{offer.shares.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Price per share</p>
                            <p className="font-semibold text-primary">
                              {formatCurrency(offer.pricePerShare)}
                            </p>
                            {typeof marketPrice === 'number' && marketPrice > 0 && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Market: {formatCurrency(marketPrice)}{' '}
                                {discountPercent !== null && discountPercent !== 0 && (
                                  <span
                                    className={cn(
                                      discountPercent > 0 ? 'text-primary' : 'text-destructive'
                                    )}
                                  >
                                    (
                                    {discountPercent > 0
                                      ? `${discountPercent.toFixed(1)}% below`
                                      : `${Math.abs(discountPercent).toFixed(1)}% above`}{' '}
                                    market)
                                  </span>
                                )}
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Total value</p>
                            <p className="font-semibold">
                              {formatCurrency(offer.shares * offer.pricePerShare)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Listed</p>
                            <p className="font-semibold">{formatDate(offer.createdAt)}</p>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <Button onClick={() => handleMakeBuyOffer(offer)}>
                            Make buy offer
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="buy" className="mt-4 space-y-4">
          {buyOffers.length === 0 ? (
            <EmptyState
              icon={TrendingDown}
              title="No buy offers available"
              description="Buy offers will appear here when users make offers on sell listings."
            />
          ) : (
            <>
              <div className="flex items-center justify-end gap-2">
                <Label className="text-muted-foreground">Sort by</Label>
                <Select
                  value={buySortOption}
                  onValueChange={(v) => v && setBuySortOption(v as BuyOfferSortOption)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most recent</SelectItem>
                    <SelectItem value="price-desc">Highest price per share</SelectItem>
                    <SelectItem value="price-asc">Lowest price per share</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {sortedBuyOffers.map((offer) => (
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
                          <p className="text-sm text-muted-foreground">
                            {offer.sellOffer.company.symbol}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Offered by</p>
                        <p className="font-medium">{offer.buyer.username}</p>
                      </div>
                    </div>

                    <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Shares requested</p>
                        <p className="font-semibold">{offer.shares.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Offered price</p>
                        <p className="font-semibold text-primary">
                          {formatCurrency(offer.offeredPrice)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total value</p>
                        <p className="font-semibold">
                          {formatCurrency(offer.shares * offer.offeredPrice)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Offered</p>
                        <p className="font-semibold">{formatDate(offer.createdAt)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Badge variant="outline">Pending</Badge>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleRespondToOffer(offer.id, 'accept')}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRespondToOffer(offer.id, 'decline')}
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={showBuyOfferModal}
        onOpenChange={(open) => {
          if (!open) closeBuyOfferModal();
          else setShowBuyOfferModal(true);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Make buy offer</DialogTitle>
          </DialogHeader>

          {selectedSellOffer && (
            <>
              <div className="mb-2 flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {selectedSellOffer.company.symbol[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-semibold">{selectedSellOffer.company.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedSellOffer.company.symbol}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Shares available</p>
                  <p className="font-medium">{selectedSellOffer.shares.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Asking price</p>
                  <p className="font-medium">{formatCurrency(selectedSellOffer.pricePerShare)}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="offerPrice">Your offer price per share</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="number"
                      id="offerPrice"
                      value={buyOfferPrice}
                      onChange={(e) => setBuyOfferPrice(e.target.value)}
                      autoComplete={AC.off}
                      min="0.01"
                      step="0.01"
                      className="pl-9"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="offerShares">Number of shares to buy</Label>
                  <Input
                    type="number"
                    id="offerShares"
                    value={buyOfferShares}
                    onChange={(e) => setBuyOfferShares(e.target.value)}
                    autoComplete={AC.off}
                    min={1}
                    max={selectedSellOffer.shares}
                    placeholder="Enter number of shares"
                  />
                  <p className="text-xs text-muted-foreground">
                    Max available: {selectedSellOffer.shares.toLocaleString()} shares
                  </p>
                </div>

                {buyOfferPrice && buyOfferShares && (
                  <div className="text-sm">
                    <p className="text-muted-foreground">
                      Total cost: {formatCurrency(buyOfferTotal)}
                    </p>
                    {parseFloat(buyOfferPrice) >= selectedSellOffer.pricePerShare ? (
                      <p className="text-primary">At or above asking price</p>
                    ) : (
                      <p className="text-muted-foreground">Below asking price</p>
                    )}
                    {insufficientBalance && (
                      <p className="text-destructive">
                        Insufficient balance (you have {formatCurrency(user!.balance)})
                      </p>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter className="-mx-4 -mb-4 mt-2">
                <Button variant="outline" onClick={closeBuyOfferModal}>
                  Cancel
                </Button>
                <Button
                  onClick={submitBuyOffer}
                  disabled={
                    submittingBuyOffer ||
                    !buyOfferPrice ||
                    !buyOfferShares ||
                    !user ||
                    insufficientBalance
                  }
                >
                  {submittingBuyOffer ? 'Submitting…' : 'Make offer'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

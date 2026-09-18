"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Handshake, Search, Store } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AC } from "@/lib/autocomplete";
import { useLiveRefresh } from "@/lib/live";
import { cn } from "@/lib/utils";

const COMPANY_LIST = [
  { symbol: "HH", name: "Hazard Holdings" },
  { symbol: "DMI", name: "Drake Maye Industries" },
  { symbol: "MG", name: "Mantis Group" },
  { symbol: "THFT", name: "Penny Pinchers United" },
  { symbol: "KEY", name: "Royal Key" },
  { symbol: "TN", name: "True North Investments" },
  { symbol: "TMB", name: "Trust Me Bro" },
  { symbol: "TGOC", name: "Two Guys One Company" },
];

export default function TradePage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<
    Array<{ symbol: string; name: string; price: number }>
  >([]);
  const [holdings, setHoldings] = useState<Array<{ symbol: string; shares: number }>>([]);
  const [user, setUser] = useState<{ balance: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [shares, setShares] = useState("");
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [trading, setTrading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tradingEnded, setTradingEnded] = useState(false);
  const [companyFilter, setCompanyFilter] = useState("");
  const refreshLive = useLiveRefresh();

  const fetchTradeData = useCallback(async () => {
    try {
      const [dashboardRes, pricesRes] = await Promise.all([
        fetch("/api/dashboard"),
        fetch("/api/prices"),
      ]);

      if (dashboardRes.status === 401) {
        router.push("/signin");
        return;
      }

      if (dashboardRes.ok) {
        const dashboard = await dashboardRes.json();
        setUser(dashboard.user);
        setHoldings(dashboard.holdings || []);
      }

      if (pricesRes.ok) {
        const prices = await pricesRes.json();
        setCompanies(
          COMPANY_LIST.map((c) => ({ ...c, price: prices[c.symbol] || 0 }))
        );
      }
    } catch {
      toast.error("Failed to load trading data");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    setTradingEnded(localStorage.getItem("tradingEnded") === "true");
    fetchTradeData();
    const interval = setInterval(
      fetchTradeData,
      Number(process.env.NEXT_PUBLIC_LIVE_REFRESH_MS || 8000)
    );
    const onStorage = (e: StorageEvent) => {
      if (e.key === "tradingEnded") setTradingEnded(e.newValue === "true");
    };
    window.addEventListener("storage", onStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", onStorage);
    };
  }, [fetchTradeData]);

  async function handleTrade(e: React.FormEvent) {
    e.preventDefault();
    if (tradingEnded) {
      toast.error("Trading has ended");
      return;
    }
    if (!selectedCompany) {
      toast.error("Select a company");
      return;
    }
    const sharesNum = parseInt(shares, 10);
    if (!sharesNum || sharesNum <= 0) {
      toast.error("Enter a valid number of shares");
      return;
    }

    const company = companies.find((c) => c.symbol === selectedCompany);
    if (!company) return;

    const totalCost =
      tradeType === "buy"
        ? company.price * sharesNum
        : company.price * sharesNum * 0.9;

    if (tradeType === "buy" && user && totalCost > user.balance) {
      toast.error("Insufficient funds");
      return;
    }

    if (tradeType === "sell") {
      const holding = holdings.find((h) => h.symbol === selectedCompany);
      if (!holding || holding.shares < sharesNum) {
        toast.error("Not enough shares");
        return;
      }
    }

    setTrading(true);
    try {
      const response = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: selectedCompany,
          shares: sharesNum,
          type: tradeType.toUpperCase(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Trade failed");
      }

      toast.success(
        `${tradeType === "buy" ? "Bought" : "Sold"} ${sharesNum} shares of ${selectedCompany}`
      );
      setShares("");
      setDialogOpen(false);
      await fetchTradeData();
      // Push the new balance to the sidebar and any other live readers.
      refreshLive();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Trade failed");
    } finally {
      setTrading(false);
    }
  }

  const enrichedHoldings = holdings.map((holding) => {
    const company = companies.find((c) => c.symbol === holding.symbol);
    const price = company?.price ?? 0;
    return {
      ...holding,
      name: company?.name ?? holding.symbol,
      price,
      value: price * holding.shares,
    };
  });

  const filter = companyFilter.trim().toLowerCase();
  const displayedHoldings = enrichedHoldings.filter(
    (h) =>
      !filter ||
      h.symbol.toLowerCase().includes(filter) ||
      h.name.toLowerCase().includes(filter)
  );

  const invested = enrichedHoldings.reduce((sum, h) => sum + h.value, 0);
  const selected = companies.find((c) => c.symbol === selectedCompany);
  const sharesNum = parseInt(shares || "0", 10);
  const previewTotal = selected
    ? selected.price * sharesNum * (tradeType === "sell" ? 0.9 : 1)
    : 0;

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!user) {
    return (
      <EmptyState
        icon={Store}
        title="Sign in to trade"
        description="You need an account to buy and sell shares."
        action={{ href: "/signin", label: "Sign in" }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Trade"
        description={`Available cash: $${user.balance.toFixed(2)}`}
      >
        {!tradingEnded && (
          <>
            <Button onClick={() => setDialogOpen(true)}>
              <Store data-icon="inline-start" />
              Trade with market
            </Button>
            <Link href="/offers" className={buttonVariants({ variant: "outline" })}>
              <Handshake data-icon="inline-start" />
              Offers
            </Link>
          </>
        )}
      </PageHeader>

      {tradingEnded && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Event has ended</p>
              <p className="text-sm text-muted-foreground">Trading is closed.</p>
            </div>
            <Link href="/leaderboard" className={buttonVariants()}>
              View leaderboard
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your holdings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {holdings.length > 0 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filter by symbol or name…"
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  className="pl-9"
                  autoComplete={AC.off}
                />
              </div>
            )}
            {displayedHoldings.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {holdings.length === 0
                  ? "No holdings yet. Open a trade to get started."
                  : "No holdings match your filter."}
              </p>
            ) : (
              <div className="space-y-2">
                {displayedHoldings.map((holding) => (
                  <div
                    key={holding.symbol}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{holding.symbol}</p>
                      <p className="text-xs text-muted-foreground">{holding.name}</p>
                      <Badge variant="secondary" className="mt-1">
                        {holding.shares} shares
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${holding.value.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        @ ${holding.price.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Portfolio summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cash</span>
              <span className="font-medium">${user.balance.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invested</span>
              <span className="font-medium">${invested.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-3 text-base">
              <span className="font-medium">Total</span>
              <span className="font-bold text-primary">
                ${(user.balance + invested).toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Trade shares</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTrade} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={tradeType === "buy" ? "default" : "outline"}
                onClick={() => setTradeType("buy")}
              >
                Buy
              </Button>
              <Button
                type="button"
                variant={tradeType === "sell" ? "destructive" : "outline"}
                onClick={() => setTradeType("sell")}
              >
                Sell
              </Button>
            </div>

            {tradeType === "sell" && (
              <p className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
                Selling returns 90% of market price.
              </p>
            )}

            <div className="flex flex-col gap-2">
              <Label>Company</Label>
              <Select
                value={selectedCompany}
                onValueChange={(v) => v && setSelectedCompany(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.symbol} value={company.symbol}>
                      {company.symbol} — ${company.price.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="shares">Shares</Label>
              <Input
                id="shares"
                type="number"
                min={1}
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                autoComplete={AC.off}
                required
              />
            </div>

            {selectedCompany && sharesNum > 0 && (
              <div
                className={cn(
                  "rounded-lg border p-3 text-sm",
                  tradeType === "buy"
                    ? "border-primary/20 bg-primary/5"
                    : "border-destructive/20 bg-destructive/5"
                )}
              >
                <p>
                  {tradeType === "buy" ? "Cost" : "You receive"}:{" "}
                  <strong>${previewTotal.toFixed(2)}</strong>
                </p>
              </div>
            )}

            <Button type="submit" disabled={trading || !selectedCompany || !shares}>
              {trading ? "Processing…" : tradeType === "buy" ? "Buy shares" : "Sell shares"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

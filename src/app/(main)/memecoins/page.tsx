"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, Plus } from "lucide-react";
import { toast } from "sonner";
import { MemecoinCreateDialog } from "@/components/memecoin-create-dialog";
import { MemecoinSparkline } from "@/components/memecoin-sparkline";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AC } from "@/lib/autocomplete";
import { cn } from "@/lib/utils";

type Coin = {
  id: string;
  symbol: string;
  name: string;
  description: string | null;
  price: number;
  change1h: number;
  change24h: number;
  isActive: boolean;
  history: Array<{ label: string; value: number }>;
  units: number;
  value: number;
};

/** Prices move on their own, so the page keeps pulling fresh ones. */
const REFRESH_MS = 15_000;

function formatPrice(price: number) {
  if (price >= 1) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(4)}`;
}

function ChangeBadge({ change }: { change: number }) {
  const up = change >= 0;
  return (
    <span className={cn("font-medium", up ? "text-emerald-500" : "text-red-500")}>
      {up ? "+" : ""}
      {change.toFixed(2)}%
    </span>
  );
}

export default function MemecoinsPage() {
  const router = useRouter();
  const [coins, setCoins] = useState<Coin[]>([]);
  const [balance, setBalance] = useState(0);
  const [canCreate, setCanCreate] = useState(false);
  const [canTrade, setCanTrade] = useState(true);
  const [sellFee, setSellFee] = useState(0);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [tradeCoin, setTradeCoin] = useState<Coin | null>(null);
  const [tradeType, setTradeType] = useState<"BUY" | "SELL">("BUY");
  const [amount, setAmount] = useState("");
  const [trading, setTrading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [coinsRes, userRes] = await Promise.all([
        fetch("/api/memecoins"),
        fetch("/api/dashboard"),
      ]);

      if (coinsRes.status === 404) {
        router.replace("/");
        return;
      }
      if (coinsRes.ok) {
        const data = await coinsRes.json();
        setCoins(data.coins);
        setCanCreate(data.canCreate);
        setCanTrade(data.canTrade);
        setSellFee(data.sellFeePercentage);
      }
      if (userRes.ok) {
        const dashboard = await userRes.json();
        setBalance(dashboard.cash ?? 0);
      }
    } catch (error) {
      console.error("Failed to load memecoins:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  function openTrade(coin: Coin, type: "BUY" | "SELL") {
    setTradeCoin(coin);
    setTradeType(type);
    setAmount("");
  }

  const parsedAmount = parseFloat(amount);
  const estimate =
    tradeCoin && !isNaN(parsedAmount) && parsedAmount > 0
      ? tradeType === "BUY"
        ? parsedAmount * tradeCoin.price
        : parsedAmount * tradeCoin.price * (1 - sellFee / 100)
      : null;

  async function submitTrade(event: React.FormEvent) {
    event.preventDefault();
    if (!tradeCoin || isNaN(parsedAmount) || parsedAmount <= 0) return;

    setTrading(true);
    try {
      const response = await fetch("/api/memecoins/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: tradeCoin.symbol,
          units: parsedAmount,
          type: tradeType,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Trade failed");

      toast.success(data.message);
      setTradeCoin(null);
      setAmount("");
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Trade failed");
    } finally {
      setTrading(false);
    }
  }

  const bagValue = coins.reduce((sum, coin) => sum + coin.value, 0);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Memecoins"
        description="Prices here move on their own — no operator sets them. Buy the dip at your own risk."
      >
        {canCreate && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus data-icon="inline-start" />
            Launch coin
          </Button>
        )}
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cash
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">${balance.toFixed(2)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Your bag
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">${bagValue.toFixed(2)}</CardContent>
        </Card>
      </div>

      {coins.length === 0 ? (
        <EmptyState
          icon={Coins}
          title="No coins yet"
          description="The operator hasn't launched any memecoins. Once one is live, its price starts moving immediately."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Coin</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">1h</TableHead>
                <TableHead className="text-right">24h</TableHead>
                <TableHead className="text-right">Trend</TableHead>
                <TableHead className="text-right">You hold</TableHead>
                <TableHead className="text-right">Trade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coins.map((coin) => (
                <TableRow key={coin.id}>
                  <TableCell>
                    <div className="flex items-center gap-2 font-medium">
                      ${coin.symbol}
                      {!coin.isActive && (
                        <Badge variant="secondary" className="text-xs">
                          delisted
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{coin.name}</div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatPrice(coin.price)}
                  </TableCell>
                  <TableCell className="text-right">
                    <ChangeBadge change={coin.change1h} />
                  </TableCell>
                  <TableCell className="text-right">
                    <ChangeBadge change={coin.change24h} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <MemecoinSparkline
                        points={coin.history.map((point) => point.value)}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {coin.units > 0 ? (
                      <>
                        <div>{coin.units.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">
                          ${coin.value.toFixed(2)}
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        disabled={!canTrade || !coin.isActive}
                        onClick={() => openTrade(coin, "BUY")}
                      >
                        Buy
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canTrade || coin.units <= 0}
                        onClick={() => openTrade(coin, "SELL")}
                      >
                        Sell
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={tradeCoin !== null} onOpenChange={(open) => !open && setTradeCoin(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {tradeType === "BUY" ? "Buy" : "Sell"} ${tradeCoin?.symbol}
            </DialogTitle>
            <DialogDescription>
              {tradeCoin && `Live price ${formatPrice(tradeCoin.price)}`}
              {tradeType === "SELL" && sellFee > 0 && ` · ${sellFee}% sell fee`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submitTrade} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="coin-amount">Coins</Label>
              <Input
                id="coin-amount"
                type="number"
                step="0.000001"
                min="0"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                autoComplete={AC.off}
                autoFocus
                required
              />
              {tradeType === "SELL" && tradeCoin && (
                <button
                  type="button"
                  className="self-start text-xs text-primary hover:underline"
                  onClick={() => setAmount(String(tradeCoin.units))}
                >
                  Sell all {tradeCoin.units.toLocaleString()}
                </button>
              )}
            </div>

            {estimate !== null && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                {tradeType === "BUY" ? "Costs" : "You receive"}{" "}
                <strong>${estimate.toFixed(2)}</strong>
                <p className="mt-1 text-xs text-muted-foreground">
                  The price can move before your trade lands — the fill uses the
                  price at that moment.
                </p>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTradeCoin(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={trading || !amount}>
                {trading ? "Trading…" : tradeType === "BUY" ? "Buy" : "Sell"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {canCreate && (
        <MemecoinCreateDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}

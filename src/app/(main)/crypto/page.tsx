"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, Plus } from "lucide-react";
import { toast } from "sonner";
import { CryptoCreateDialog } from "@/components/crypto-create-dialog";
import { CryptoSparkline } from "@/components/crypto-sparkline";
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
import { useLive, useLiveRefresh } from "@/lib/live";
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

export default function CryptoPage() {
  const router = useRouter();
  const refreshLive = useLiveRefresh();

  // Prices move on their own, so these poll continuously.
  const { data: market, loading } = useLive<{
    coins: Coin[];
    canCreate: boolean;
    canTrade: boolean;
    sellFeePercentage: number;
  }>("/api/crypto");
  const { data: account } = useLive<{ balance: number }>("/api/user");

  const coins = market?.coins ?? [];
  const canCreate = market?.canCreate ?? false;
  const canTrade = market?.canTrade ?? true;
  const sellFee = market?.sellFeePercentage ?? 0;
  const balance = account?.balance ?? 0;

  const [createOpen, setCreateOpen] = useState(false);
  const [tradeCoin, setTradeCoin] = useState<Coin | null>(null);
  const [tradeType, setTradeType] = useState<"BUY" | "SELL">("BUY");
  const [amount, setAmount] = useState("");
  const [trading, setTrading] = useState(false);

  const fetchData = useCallback(() => {
    refreshLive("/api/crypto", "/api/user");
  }, [refreshLive]);

  // The market endpoint 404s when the feature is switched off.
  const marketError = useLive<unknown>("/api/crypto").error;
  useEffect(() => {
    if (marketError === "HTTP 404") router.replace("/");
  }, [marketError, router]);

  function openTrade(coin: Coin, type: "BUY" | "SELL") {
    setTradeCoin(coin);
    setTradeType(type);
    setAmount("");
  }

  const liveTradeCoin = tradeCoin
    ? coins.find((coin) => coin.id === tradeCoin.id) ?? tradeCoin
    : null;

  const parsedAmount = parseFloat(amount);
  const estimate =
    liveTradeCoin && !isNaN(parsedAmount) && parsedAmount > 0
      ? tradeType === "BUY"
        ? parsedAmount * liveTradeCoin.price
        : parsedAmount * liveTradeCoin.price * (1 - sellFee / 100)
      : null;

  async function submitTrade(event: React.FormEvent) {
    event.preventDefault();
    if (!liveTradeCoin || isNaN(parsedAmount) || parsedAmount <= 0) return;

    setTrading(true);
    try {
      const response = await fetch("/api/crypto/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: liveTradeCoin.symbol,
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
        title="Crypto"
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
          description="The operator hasn't launched any coins. Once one is live, its price starts moving immediately."
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
                      <CryptoSparkline
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
              {tradeType === "BUY" ? "Buy" : "Sell"} ${liveTradeCoin?.symbol}
            </DialogTitle>
            <DialogDescription>
              {liveTradeCoin && `Live price ${formatPrice(liveTradeCoin.price)}`}
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
              {tradeType === "SELL" && liveTradeCoin && (
                <button
                  type="button"
                  className="self-start text-xs text-primary hover:underline"
                  onClick={() => setAmount(String(liveTradeCoin.units))}
                >
                  Sell all {liveTradeCoin.units.toLocaleString()}
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
        <CryptoCreateDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}

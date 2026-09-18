"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AC } from "@/lib/autocomplete";

type Firm = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  manager: { id: string; username: string; name: string | null };
  isManager: boolean;
  isOpen: boolean;
  feePercent: number;
  cash: number;
  nav: number;
  navPerUnit: number;
  totalUnits: number;
  minDeposit: number;
  canTrade: boolean;
  allowMemecoins: boolean;
  holdings: Array<{
    assetType: "STOCK" | "MEMECOIN";
    symbol: string;
    name: string;
    units: number;
    price: number;
    value: number;
  }>;
  members: Array<{
    userId: string;
    username: string;
    units: number;
    invested: number;
    value: number;
    visible: boolean;
  }>;
  membership: {
    units: number;
    invested: number;
    value: number;
    profit: number;
  } | null;
  transactions: Array<{
    id: string;
    type: string;
    assetType: string;
    symbol: string | null;
    units: number;
    price: number;
    amount: number;
    createdAt: string;
  }>;
};

export default function FirmDetailPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [firm, setFirm] = useState<Firm | null>(null);
  const [balance, setBalance] = useState(0);
  const [stocks, setStocks] = useState<string[]>([]);
  const [coins, setCoins] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [investAmount, setInvestAmount] = useState("");
  const [withdrawUnits, setWithdrawUnits] = useState("");
  const [busy, setBusy] = useState(false);

  const [assetType, setAssetType] = useState<"STOCK" | "MEMECOIN">("STOCK");
  const [tradeSymbol, setTradeSymbol] = useState("");
  const [tradeUnits, setTradeUnits] = useState("");
  const [tradeSide, setTradeSide] = useState<"BUY" | "SELL">("BUY");

  const fetchFirm = useCallback(async () => {
    try {
      const [firmRes, dashboardRes] = await Promise.all([
        fetch(`/api/firms/${slug}`),
        fetch("/api/dashboard"),
      ]);

      if (firmRes.status === 404) {
        router.replace("/firms");
        return;
      }
      if (firmRes.ok) {
        setFirm(await firmRes.json());
      }
      if (dashboardRes.ok) {
        const dashboard = await dashboardRes.json();
        setBalance(dashboard.cash ?? 0);
        setStocks(
          (dashboard.companies ?? []).map((company: { symbol: string }) => company.symbol)
        );
      }

      const coinsRes = await fetch("/api/memecoins");
      if (coinsRes.ok) {
        const data = await coinsRes.json();
        setCoins(
          data.coins
            .filter((coin: { isActive: boolean }) => coin.isActive)
            .map((coin: { symbol: string }) => coin.symbol)
        );
      }
    } catch (error) {
      console.error("Failed to load firm:", error);
    } finally {
      setLoading(false);
    }
  }, [router, slug]);

  useEffect(() => {
    fetchFirm();
  }, [fetchFirm]);

  async function post(path: string, body: unknown, successFallback: string) {
    setBusy(true);
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || successFallback);
      toast.success(data.message || successFallback);
      fetchFirm();
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (!firm) return null;

  const symbolOptions = assetType === "STOCK" ? stocks : coins;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/firms"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All firms
      </Link>

      <PageHeader
        title={firm.name}
        description={firm.description ?? `Managed by ${firm.manager.username}`}
      >
        {firm.isManager && <Badge>You manage this firm</Badge>}
        {!firm.isOpen && <Badge variant="outline">Closed to new money</Badge>}
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Assets", value: `$${firm.nav.toFixed(2)}` },
          { label: "Cash", value: `$${firm.cash.toFixed(2)}` },
          { label: "Unit price", value: `$${firm.navPerUnit.toFixed(4)}` },
          { label: "Clients", value: String(firm.members.length) },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{stat.value}</CardContent>
          </Card>
        ))}
      </div>

      {!firm.isManager && (
        <Card>
          <CardHeader>
            <CardTitle>Your stake</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {firm.membership ? (
              <div className="grid gap-2 sm:grid-cols-3">
                <div>
                  <div className="text-xs text-muted-foreground">Value</div>
                  <div className="text-lg font-semibold">
                    ${firm.membership.value.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Invested</div>
                  <div className="text-lg font-semibold">
                    ${firm.membership.invested.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Profit</div>
                  <div
                    className={
                      firm.membership.profit >= 0
                        ? "text-lg font-semibold text-emerald-500"
                        : "text-lg font-semibold text-red-500"
                    }
                  >
                    {firm.membership.profit >= 0 ? "+" : ""}$
                    {firm.membership.profit.toFixed(2)}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                You have not invested in this firm yet. Your cash: ${balance.toFixed(2)}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <form
                className="flex flex-col gap-2"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const amount = parseFloat(investAmount);
                  if (isNaN(amount) || amount <= 0) return;
                  const ok = await post(
                    `/api/firms/${firm.slug}/invest`,
                    { amount },
                    "Invested"
                  );
                  if (ok) setInvestAmount("");
                }}
              >
                <Label htmlFor="invest-amount">Invest cash ($)</Label>
                <div className="flex gap-2">
                  <Input
                    id="invest-amount"
                    type="number"
                    step="0.01"
                    min={firm.minDeposit}
                    value={investAmount}
                    onChange={(event) => setInvestAmount(event.target.value)}
                    placeholder={firm.minDeposit.toFixed(2)}
                    autoComplete={AC.off}
                    disabled={!firm.isOpen}
                  />
                  <Button type="submit" disabled={busy || !investAmount || !firm.isOpen}>
                    Invest
                  </Button>
                </div>
                {firm.feePercent > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {firm.feePercent}% of each deposit goes to the manager.
                  </p>
                )}
              </form>

              <form
                className="flex flex-col gap-2"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const units = parseFloat(withdrawUnits);
                  if (isNaN(units) || units <= 0) return;
                  const ok = await post(
                    `/api/firms/${firm.slug}/withdraw`,
                    { units },
                    "Withdrew"
                  );
                  if (ok) setWithdrawUnits("");
                }}
              >
                <Label htmlFor="withdraw-units">Withdraw units</Label>
                <div className="flex gap-2">
                  <Input
                    id="withdraw-units"
                    type="number"
                    step="0.0001"
                    min="0"
                    value={withdrawUnits}
                    onChange={(event) => setWithdrawUnits(event.target.value)}
                    placeholder="0"
                    autoComplete={AC.off}
                    disabled={!firm.membership}
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={busy || !withdrawUnits || !firm.membership}
                  >
                    Withdraw
                  </Button>
                </div>
                {firm.membership && (
                  <button
                    type="button"
                    className="self-start text-xs text-primary hover:underline"
                    onClick={() => setWithdrawUnits(String(firm.membership!.units))}
                  >
                    Withdraw all {firm.membership.units.toFixed(4)} units
                  </button>
                )}
              </form>
            </div>
          </CardContent>
        </Card>
      )}

      {firm.isManager && firm.canTrade && (
        <Card>
          <CardHeader>
            <CardTitle>Trade client capital</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3 sm:grid-cols-5 sm:items-end"
              onSubmit={async (event) => {
                event.preventDefault();
                const units = parseFloat(tradeUnits);
                if (!tradeSymbol || isNaN(units) || units <= 0) return;
                const ok = await post(
                  `/api/firms/${firm.slug}/trade`,
                  { assetType, symbol: tradeSymbol, units, type: tradeSide },
                  "Trade placed"
                );
                if (ok) setTradeUnits("");
              }}
            >
              {firm.allowMemecoins && (
                <div className="flex flex-col gap-2">
                  <Label>Asset</Label>
                  <Select
                    value={assetType}
                    onValueChange={(value) => {
                      if (!value) return;
                      setAssetType(value as "STOCK" | "MEMECOIN");
                      setTradeSymbol("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STOCK">Stocks</SelectItem>
                      <SelectItem value="MEMECOIN">Memecoins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label>Symbol</Label>
                <Select
                  value={tradeSymbol}
                  onValueChange={(value) => value && setTradeSymbol(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pick one" />
                  </SelectTrigger>
                  <SelectContent>
                    {symbolOptions.map((symbol) => (
                      <SelectItem key={symbol} value={symbol}>
                        {assetType === "MEMECOIN" ? `$${symbol}` : symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Side</Label>
                <Select
                  value={tradeSide}
                  onValueChange={(value) => value && setTradeSide(value as "BUY" | "SELL")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUY">Buy</SelectItem>
                    <SelectItem value="SELL">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="trade-units">
                  {assetType === "STOCK" ? "Shares" : "Coins"}
                </Label>
                <Input
                  id="trade-units"
                  type="number"
                  step={assetType === "STOCK" ? "1" : "0.000001"}
                  min="0"
                  value={tradeUnits}
                  onChange={(event) => setTradeUnits(event.target.value)}
                  autoComplete={AC.off}
                />
              </div>

              <Button type="submit" disabled={busy || !tradeSymbol || !tradeUnits}>
                {tradeSide === "BUY" ? "Buy" : "Sell"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Positions</CardTitle>
        </CardHeader>
        <CardContent>
          {firm.holdings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              The firm holds no positions — all of its money is in cash.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {firm.holdings.map((holding) => (
                  <TableRow key={`${holding.assetType}-${holding.symbol}`}>
                    <TableCell>
                      <div className="font-medium">
                        {holding.assetType === "MEMECOIN" ? "$" : ""}
                        {holding.symbol}
                      </div>
                      <div className="text-xs text-muted-foreground">{holding.name}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      {holding.units.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      ${holding.price.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${holding.value.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {firm.isManager && firm.members.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Invested</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {firm.members.map((member) => (
                  <TableRow key={member.userId}>
                    <TableCell>{member.username}</TableCell>
                    <TableCell className="text-right">
                      {member.units.toFixed(4)}
                    </TableCell>
                    <TableCell className="text-right">
                      ${member.invested.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${member.value.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {firm.transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {firm.transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      {tx.type === "DEPOSIT" || tx.type === "WITHDRAW"
                        ? tx.type === "DEPOSIT"
                          ? "Client deposit"
                          : "Client withdrawal"
                        : `${tx.type === "BUY" ? "Bought" : "Sold"} ${tx.units} ${
                            tx.assetType === "MEMECOIN" ? "$" : ""
                          }${tx.symbol}`}
                    </TableCell>
                    <TableCell className="text-right">${tx.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

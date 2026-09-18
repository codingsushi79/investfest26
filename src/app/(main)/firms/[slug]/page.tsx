"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Store, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { AC } from "@/lib/autocomplete";
import { useLiveRefresh } from "@/lib/live";

type Firm = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  manager: { id: string; username: string; name: string | null };
  isManager: boolean;
  isOpen: boolean;
  depositFeePercent: number;
  withdrawFeePercent: number;
  cash: number;
  nav: number;
  navPerUnit: number;
  totalUnits: number;
  minDeposit: number;
  canTrade: boolean;
  allowCrypto: boolean;
  holdings: Array<{
    assetType: "STOCK" | "CRYPTO";
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
    emailOptIn: boolean;
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
  const [loading, setLoading] = useState(true);

  const [investAmount, setInvestAmount] = useState("");
  const [withdrawUnits, setWithdrawUnits] = useState("");
  const [busy, setBusy] = useState(false);

  const [news, setNews] = useState<
    Array<{
      id: string;
      title: string;
      body: string;
      author: string;
      recipients: number;
      createdAt: string;
    }>
  >([]);
  const [newsTitle, setNewsTitle] = useState("");
  const [newsBody, setNewsBody] = useState("");
  const [newsEmail, setNewsEmail] = useState(true);


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
      }

      const newsRes = await fetch(`/api/firms/${slug}/news`);
      if (newsRes.ok) {
        const newsData = await newsRes.json();
        setNews(newsData.news ?? []);
      }

    } catch (error) {
      console.error("Failed to load firm:", error);
    } finally {
      setLoading(false);
    }
  }, [router, slug]);

  const refreshLive = useLiveRefresh();

  useEffect(() => {
    fetchFirm();
    // A firm's value moves with its positions, so keep it ticking.
    const interval = setInterval(
      fetchFirm,
      Number(process.env.NEXT_PUBLIC_LIVE_REFRESH_MS || 8000)
    );
    return () => clearInterval(interval);
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
      refreshLive();
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function deleteFirm() {
    if (!firm) return;
    if (
      !window.confirm(
        `Delete ${firm.name}? Any cash left in it comes back to you. This cannot be undone.`
      )
    ) {
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`/api/firms/${firm.slug}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not delete firm");

      toast.success(data.message || "Firm deleted");
      refreshLive();
      router.push("/firms");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete firm");
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
        {firm.isManager && (
          <>
            <Link href="/trade" className={buttonVariants({ size: "sm" })}>
              <Store data-icon="inline-start" />
              Trade for this firm
            </Link>
            <Button size="sm" variant="outline" onClick={deleteFirm} disabled={busy}>
              <Trash2 data-icon="inline-start" />
              Delete
            </Button>
          </>
        )}
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

      {(
        <Card>
          <CardHeader>
            <CardTitle>
              {firm.isManager ? "Your own stake" : "Your stake"}
            </CardTitle>
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
                {firm.isManager
                  ? `You have not put your own money in yet. Your cash: $${balance.toFixed(2)}`
                  : `You have not invested in this firm yet. Your cash: $${balance.toFixed(2)}`}
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
                {firm.depositFeePercent > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {firm.isManager
                      ? "You don't pay your own deposit fee."
                      : `${firm.depositFeePercent}% of each deposit goes to the manager.`}
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
                {firm.withdrawFeePercent > 0 && !firm.isManager && (
                  <p className="text-xs text-muted-foreground">
                    {firm.withdrawFeePercent}% of each withdrawal goes to the manager.
                  </p>
                )}
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Updates</CardTitle>
          {firm.membership && !firm.isManager && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={firm.membership.emailOptIn}
                onCheckedChange={(checked) =>
                  post(
                    `/api/firms/${firm.slug}/email-preference`,
                    { emailOptIn: checked === true },
                    "Updated"
                  )
                }
              />
              Email me these
            </label>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {firm.isManager && (
            <form
              className="flex flex-col gap-2 rounded-lg border border-border p-3"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!newsTitle.trim() || !newsBody.trim()) return;
                const ok = await post(
                  `/api/firms/${firm.slug}/news`,
                  {
                    title: newsTitle,
                    body: newsBody,
                    sendEmail: newsEmail,
                  },
                  "Update posted"
                );
                if (ok) {
                  setNewsTitle("");
                  setNewsBody("");
                }
              }}
            >
              <Label htmlFor="news-title">Post an update to your investors</Label>
              <Input
                id="news-title"
                value={newsTitle}
                onChange={(event) => setNewsTitle(event.target.value)}
                placeholder="Title"
                maxLength={140}
                autoComplete={AC.off}
              />
              <Textarea
                value={newsBody}
                onChange={(event) => setNewsBody(event.target.value)}
                placeholder="What happened this week?"
                rows={4}
                maxLength={5000}
              />
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox
                    checked={newsEmail}
                    onCheckedChange={(checked) => setNewsEmail(checked === true)}
                  />
                  Email it to investors who opted in
                </label>
                <Button
                  type="submit"
                  size="sm"
                  disabled={busy || !newsTitle.trim() || !newsBody.trim()}
                >
                  Post
                </Button>
              </div>
            </form>
          )}

          {news.length === 0 ? (
            <p className="text-sm text-muted-foreground">No updates yet.</p>
          ) : (
            news.map((item) => (
              <div key={item.id} className="border-b border-border pb-3 last:border-0">
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="font-medium">{item.title}</h4>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                  {item.body}
                </p>
                {firm.isManager && item.recipients > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Emailed to {item.recipients}
                  </p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Positions</CardTitle>
          {firm.isManager && (
            <Link href="/trade" className="text-sm text-primary hover:underline">
              Trade →
            </Link>
          )}
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
                        {holding.assetType === "CRYPTO" ? "$" : ""}
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
                            tx.assetType === "CRYPTO" ? "$" : ""
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

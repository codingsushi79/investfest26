"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Briefcase,
  Coins,
  Handshake,
  Layers,
  LineChart,
  Plus,
  Store,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { BulkValueDialog } from "@/components/bulk-value-dialog";
import { OperatorValueDialog } from "@/components/operator-value-dialog";
import { PageHeader } from "@/components/page-header";
import { PortfolioTable } from "@/components/PortfolioTable";
import { StockCharts } from "@/components/StockCharts";
import { UsernameForm } from "@/components/UsernameForm";
import { EmptyState } from "@/components/empty-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authConfig, featuresConfig } from "@/lib/config";
import { useLiveRefresh } from "@/lib/live";
import { cn } from "@/lib/utils";

/** Shared cadence for anything that updates without a reload. */
const LIVE_REFRESH_MS = Number(process.env.NEXT_PUBLIC_LIVE_REFRESH_MS || 8000);

type DashboardState = {
  companies: Array<{
    symbol: string;
    name: string;
    actualShares: number;
    valuationShares: number;
    inBaseline: boolean;
    latestLabel: string;
    nextLabel: string;
    prices: Array<{ label: string; value: number }>;
  }>;
  holdings: Array<{
    symbol: string;
    shares: number;
    name: string;
    latestPrice: number;
    value: number;
  }>;
  cash: number;
  invested: number;
  portfolioValue: number;
};

export default function DashboardPage() {
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [dashboard, setDashboard] = useState<DashboardState>({
    companies: [],
    holdings: [],
    cash: 0,
    invested: 0,
    portfolioValue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [valueDialogOpen, setValueDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [tradingEnded, setTradingEnded] = useState(false);

  const isOperator = user?.username === authConfig.operatorUsername;

  async function fetchData() {
    try {
      const response = await fetch("/api/dashboard");
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setDashboard({
          companies: data.companies,
          holdings: data.holdings,
          cash: data.cash,
          invested: data.invested,
          portfolioValue: data.portfolioValue,
        });
      }
    } catch (error) {
      console.error("Failed to fetch dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  const refreshLive = useLiveRefresh();

  useEffect(() => {
    setTradingEnded(localStorage.getItem("tradingEnded") === "true");
    fetchData();
    // Dashboard numbers move whenever anyone trades, so keep them current.
    const interval = setInterval(fetchData, LIVE_REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  function toggleTradingEnded() {
    const next = !tradingEnded;
    localStorage.setItem("tradingEnded", next ? "true" : "false");
    setTradingEnded(next);
    window.dispatchEvent(
      new StorageEvent("storage", { key: "tradingEnded", newValue: next ? "true" : "false" })
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col gap-10 sm:gap-12">
        <PageHeader
          title="Virtual stock trading"
          description="Start with $1,000 and trade shares across 8 companies. Company values update each class period."
        />
        <EmptyState
          icon={LineChart}
          title="Sign in to start trading"
          description="Create an account or sign in to view your portfolio, trade shares, and compete on the leaderboard."
          action={{ href: "/signin", label: "Sign in" }}
        />
      </div>
    );
  }

  const quickLinks = [
    featuresConfig.trading && {
      href: "/trade",
      label: "Trade shares",
      description: "Buy and sell at market prices",
      icon: Store,
    },
    featuresConfig.offers && {
      href: "/offers",
      label: "Trading offers",
      description: "Peer-to-peer buy and sell offers",
      icon: Handshake,
    },
    featuresConfig.crypto && {
      href: "/crypto",
      label: "Crypto",
      description: "Prices that move on their own",
      icon: Coins,
    },
    featuresConfig.firms && {
      href: "/firms",
      label: "Investment firms",
      description: "Invest for clients, or hire a manager",
      icon: Briefcase,
    },
    featuresConfig.leaderboard && {
      href: "/leaderboard",
      label: "Leaderboard",
      description: "See who's winning the event",
      icon: TrendingUp,
    },
  ].filter(Boolean) as Array<{
    href: string;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Welcome back, ${user.username}`}
        description="Track your portfolio, trade shares, and follow company value updates each period."
      >
        {isOperator && (
          <>
            <Button
              variant={tradingEnded ? "default" : "destructive"}
              size="sm"
              onClick={toggleTradingEnded}
            >
              {tradingEnded ? "Resume event" : "End event"}
            </Button>
            {featuresConfig.adminPriceUpdates && (
              <>
                <Button size="sm" onClick={() => setValueDialogOpen(true)}>
                  <Plus data-icon="inline-start" />
                  Set price
                </Button>
                {featuresConfig.bulkPriceUpdates && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBulkDialogOpen(true)}
                  >
                    <Layers data-icon="inline-start" />
                    Set many
                  </Button>
                )}
              </>
            )}
          </>
        )}
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Cash", value: `$${dashboard.cash.toFixed(2)}`, icon: Wallet },
          { label: "Invested", value: `$${dashboard.invested.toFixed(2)}`, icon: TrendingUp },
          { label: "Portfolio", value: `$${dashboard.portfolioValue.toFixed(2)}`, icon: LineChart },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-primary/10">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <Icon className="size-4 text-primary" />
              </CardHeader>
              <CardContent className="text-2xl font-bold">{stat.value}</CardContent>
            </Card>
          );
        })}
      </div>

      {quickLinks.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-auto flex-col items-start gap-2 p-4 text-left"
                )}
              >
                <Icon className="size-5 text-primary" />
                <span className="font-semibold">{link.label}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {link.description}
                </span>
                <ArrowRight className="size-4 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Username</CardTitle>
        </CardHeader>
        <CardContent>
          <UsernameForm initial={user.username} />
        </CardContent>
      </Card>

      {featuresConfig.trading && (
        <Card>
          <CardHeader>
            <CardTitle>Price history</CardTitle>
          </CardHeader>
          <CardContent>
            <StockCharts companies={dashboard.companies} />
          </CardContent>
        </Card>
      )}

      {featuresConfig.portfolios && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Your holdings</CardTitle>
            {featuresConfig.leaderboard && (
              <Link href="/leaderboard" className="text-sm text-primary hover:underline">
                Leaderboard →
              </Link>
            )}
          </CardHeader>
          <CardContent>
            <PortfolioTable rows={dashboard.holdings} />
          </CardContent>
        </Card>
      )}

      {isOperator && featuresConfig.adminPriceUpdates && (
        <>
          <OperatorValueDialog
            open={valueDialogOpen}
            onOpenChange={setValueDialogOpen}
            companies={dashboard.companies}
            onSuccess={() => {
              fetchData();
              refreshLive();
            }}
          />
          {featuresConfig.bulkPriceUpdates && (
            <BulkValueDialog
              open={bulkDialogOpen}
              onOpenChange={setBulkDialogOpen}
              companies={dashboard.companies}
              onSuccess={() => {
                fetchData();
                refreshLive();
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AC } from "@/lib/autocomplete";

interface Portfolio {
  userId: string;
  username: string | null;
  name: string | null;
  balance: number;
  holdings: Array<{
    symbol: string;
    shares: number;
    latestPrice: number;
    value: number;
  }>;
  portfolioValue: number;
}

export default function PortfoliosPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/portfolios")
      .then((r) => (r.ok ? r.json() : []))
      .then(setPortfolios)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return portfolios;
    const q = searchQuery.toLowerCase();
    return portfolios.filter(
      (p) =>
        p.username?.toLowerCase().includes(q) ||
        p.name?.toLowerCase().includes(q)
    );
  }, [portfolios, searchQuery]);

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
        title="All portfolios"
        description="Browse every trader's holdings and portfolio value."
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or username…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          autoComplete={AC.off}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map((portfolio) => (
          <Card key={portfolio.userId} className="border-primary/10">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div>
                <CardTitle className="text-base">
                  {portfolio.name || portfolio.username}
                </CardTitle>
                {portfolio.username && (
                  <p className="text-sm text-muted-foreground">@{portfolio.username}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-primary">
                  ${portfolio.portfolioValue.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  ${portfolio.balance.toFixed(2)} cash
                </p>
              </div>
            </CardHeader>
            <CardContent>
              {portfolio.holdings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No holdings</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {portfolio.holdings.map((h) => (
                    <Badge key={h.symbol} variant="secondary">
                      {h.symbol} ×{h.shares} (${h.value.toFixed(0)})
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
          <Users className="size-10 opacity-40" />
          <p>No portfolios match your search.</p>
        </div>
      )}
    </div>
  );
}

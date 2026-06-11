"use client";

import { useEffect, useState } from "react";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function LeaderboardPage() {
  const [rows, setRows] = useState<
    Array<{
      name: string | null;
      username: string;
      balance: number;
      invested: number;
      portfolioValue: number;
      holdings: { symbol: string; shares: number; value: number }[];
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => (r.ok ? r.json() : []))
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);

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
        title="Leaderboard"
        description="Ranked by total portfolio value — the worth of all shares you own."
      />
      <LeaderboardTable rows={rows} />
    </div>
  );
}

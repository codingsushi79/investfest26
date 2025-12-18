"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { LeaderboardTable } from "@/components/LeaderboardTable";

interface LeaderboardRow {
  userId: string;
  name: string | null;
  username: string;
  email?: string | null;
  balance: number;
  invested: number;
  portfolioValue: number;
  holdings: { symbol: string; shares: number; value: number; price: number }[];
}

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ username?: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch current user
        const userResponse = await fetch("/api/auth/user");
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setCurrentUser(userData.user);
        }

        // Fetch leaderboard data
        const leaderboardResponse = await fetch("/api/leaderboard");
        if (leaderboardResponse.ok) {
          const leaderboardData = await leaderboardResponse.json();
          setRows(leaderboardData);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const isOperator = currentUser?.username === (process.env.NEXT_PUBLIC_OP_USERNAME || "operator");

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Leaderboard</h1>
          <p className="text-sm text-zinc-600">
            Ranked by portfolio value (total worth of shares owned).
          </p>
        </div>
        <Link
          href="/"
          className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
        >
          ← Back
        </Link>
      </div>
      <LeaderboardTable
        rows={rows.map((r) => ({
          name: r.name,
          username: r.username,
          email: r.email,
          balance: r.balance,
          invested: r.invested,
          portfolioValue: r.portfolioValue,
          holdings: r.holdings,
        }))}
        isOperator={isOperator}
      />
    </div>
  );
}


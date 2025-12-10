import Link from "next/link";
import { getLeaderboard } from "@/lib/data";
import { LeaderboardTable } from "@/components/LeaderboardTable";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const rows = await getLeaderboard();

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Leaderboard</h1>
          <p className="text-sm text-zinc-600">
            Ranked by total portfolio value (cash + holdings).
          </p>
        </div>
        <Link href="/" className="text-indigo-700 hover:underline">
          ← Back
        </Link>
      </div>
      <LeaderboardTable
        rows={rows.map((r) => ({
          name: r.name,
          username: r.username,
          balance: r.balance,
          invested: r.invested,
          portfolioValue: r.portfolioValue,
          holdings: r.holdings,
        }))}
      />
    </div>
  );
}


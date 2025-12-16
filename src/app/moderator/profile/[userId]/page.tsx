"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface ProfileData {
  user: {
    id: string;
    username: string;
    name: string | null;
    email: string | null;
    balance: number;
    createdAt: string;
  };
  balanceHistory: Array<{ date: string; balance: number; totalValue: number }>;
  currentHoldings: Array<{ symbol: string; name: string; shares: number; price: number; value: number }>;
  currentPortfolioValue: number;
  currentTotalValue: number;
  totalTransactions: number;
}

export default function ModeratorProfileViewPage({ params }: { params: Promise<{ userId: string }> }) {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ username?: string } | null>(null);
  const [userId, setUserId] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Resolve params
        const resolvedParams = await params;
        setUserId(resolvedParams.userId);

        // Get current user
        const userRes = await fetch("/api/auth/user");
        if (userRes.ok) {
          const userData = await userRes.json();
          setCurrentUser(userData.user);

          // Check if user is operator
          const isOperator = userData.user?.username === (process.env.NEXT_PUBLIC_OP_USERNAME || "operator");
          if (!isOperator) {
            router.push("/");
            return;
          }

          // Fetch profile data for the target user
          const profileRes = await fetch(`/api/profile/${resolvedParams.userId}`);
          if (profileRes.ok) {
            const data = await profileRes.json();
            setProfileData(data);
          }
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Profile not found</h1>
          <Link
            href="/moderator/profiles"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
          >
            Back to Profiles
          </Link>
        </div>
      </div>
    );
  }

  // Format chart data
  const chartData = profileData.balanceHistory.map((point) => ({
    date: new Date(point.date).toLocaleDateString(),
    balance: point.balance,
    totalValue: point.totalValue,
  }));

  const initialBalance = 1000;
  const gainLoss = profileData.currentTotalValue - initialBalance;
  const percentage = ((gainLoss / initialBalance) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="border-b border-slate-200/60 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              InvestFest 2026
            </Link>
            <span className="text-slate-500">→</span>
            <span className="text-slate-700 font-medium">Moderator: View Profile</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/moderator/profiles"
              className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
            >
              ← Back to Profiles
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        {/* User Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {profileData.user.name || profileData.user.username}
              </h1>
              <p className="text-slate-600">@{profileData.user.username}</p>
              {profileData.user.email && (
                <p className="text-sm text-slate-500 mt-1">{profileData.user.email}</p>
              )}
              <p className="text-sm text-slate-500 mt-2">
                Joined {new Date(profileData.user.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-500">Total Value</div>
              <div className="text-3xl font-bold text-slate-900">
                ${profileData.currentTotalValue.toFixed(2)}
              </div>
              <div className={`text-sm font-medium ${gainLoss >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {gainLoss >= 0 ? '+' : ''}${gainLoss.toFixed(2)} ({percentage >= 0 ? '+' : ''}{percentage.toFixed(2)}%)
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Cash</div>
            <div className="text-2xl font-bold text-green-600">${profileData.user.balance.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Portfolio</div>
            <div className="text-2xl font-bold text-blue-600">${profileData.currentPortfolioValue.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Holdings</div>
            <div className="text-2xl font-bold text-purple-600">{profileData.currentHoldings.length}</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Transactions</div>
            <div className="text-2xl font-bold text-orange-600">{profileData.totalTransactions}</div>
          </div>
        </div>

        {/* Balance History Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">All-Time Balance History</h2>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => `$${value.toFixed(2)}`}
                labelStyle={{ color: "#1e293b" }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="balance"
                stroke="#10b981"
                strokeWidth={2}
                name="Cash Balance"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="totalValue"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Total Value"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Current Holdings */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Current Holdings</h2>
          {profileData.currentHoldings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Company</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Shares</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Price</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {profileData.currentHoldings.map((holding) => (
                    <tr key={holding.symbol} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{holding.symbol}</div>
                        <div className="text-sm text-slate-600">{holding.name}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{holding.shares}</td>
                      <td className="px-4 py-3 text-slate-700">${holding.price.toFixed(2)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">${holding.value.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">No holdings yet</p>
          )}
        </div>
      </main>
    </div>
  );
}


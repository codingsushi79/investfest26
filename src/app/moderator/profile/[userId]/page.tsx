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
    isPaused?: boolean;
    isBanned?: boolean;
  };
  balanceHistory: Array<{ date: string; balance: number; totalValue: number }>;
  currentHoldings: Array<{ symbol: string; name: string; shares: number; price: number; value: number }>;
  currentPortfolioValue: number;
  currentTotalValue: number;
  totalTransactions: number;
  transactions: Array<{
    id: string;
    type: string;
    symbol: string;
    shares: number;
    price: number;
    createdAt: string;
  }>;
  insiderTradingRisk: number;
}

export default function ModeratorProfileViewPage({ params }: { params: Promise<{ userId: string }> }) {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ username?: string } | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [managingUser, setManagingUser] = useState(false);
  const router = useRouter();

  const handleUserAction = async (action: 'pause' | 'unpause' | 'ban' | 'unban') => {
    if (!profileData) return;

    setManagingUser(true);
    try {
      const response = await fetch(`/api/moderator/manage-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profileData.user.id, action }),
      });

      if (response.ok) {
        // Refresh profile data
        const profileRes = await fetch(`/api/profile/${userId}`);
        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfileData(data);
        }
      } else {
        alert('Failed to update user status');
      }
    } catch (error) {
      console.error('Error managing user:', error);
      alert('Error managing user');
    } finally {
      setManagingUser(false);
    }
  };

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
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm animate-in fade-in-0 slide-in-from-bottom-2">
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
              {profileData.user.isPaused && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mt-2">
                  Trading Paused
                </span>
              )}
              {profileData.user.isBanned && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 mt-2 ml-2">
                  Account Banned
                </span>
              )}
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

        {/* Account Management */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm animate-in fade-in-0 slide-in-from-bottom-4">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Account Management</h2>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <button
              onClick={() => handleUserAction(profileData.user.isPaused ? 'unpause' : 'pause')}
              disabled={managingUser}
              className={`px-4 py-3 rounded-lg font-semibold transition-all duration-200 ${
                profileData.user.isPaused
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-yellow-600 text-white hover:bg-yellow-700'
              } disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105`}
            >
              {managingUser ? '...' : (profileData.user.isPaused ? 'Resume Trading' : 'Pause Trading')}
            </button>

            <button
              onClick={() => handleUserAction(profileData.user.isBanned ? 'unban' : 'ban')}
              disabled={managingUser}
              className={`px-4 py-3 rounded-lg font-semibold transition-all duration-200 ${
                profileData.user.isBanned
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-red-600 text-white hover:bg-red-700'
              } disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105`}
            >
              {managingUser ? '...' : (profileData.user.isBanned ? 'Unban Account' : 'Ban Account')}
            </button>

            <button
              onClick={() => setShowTransactionHistory(!showTransactionHistory)}
              className="px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200 hover:scale-105"
            >
              {showTransactionHistory ? 'Hide' : 'View'} Full History
            </button>

            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Insider Trading Risk</div>
              <div className={`text-2xl font-bold ${
                profileData.insiderTradingRisk > 70 ? 'text-red-600' :
                profileData.insiderTradingRisk > 40 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {profileData.insiderTradingRisk.toFixed(1)}%
              </div>
              <div className="text-xs text-slate-600 mt-1">
                {profileData.insiderTradingRisk > 70 ? 'High Risk' :
                 profileData.insiderTradingRisk > 40 ? 'Medium Risk' : 'Low Risk'}
              </div>
            </div>
          </div>

          {/* Insider Trading Analysis */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-2">Insider Trading Analysis</h3>
            <div className="text-sm text-slate-600">
              <p className="mb-2">
                This analysis detects suspicious trading patterns that may indicate insider trading or market manipulation.
              </p>
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <span className="font-medium">Risk Factors:</span>
                  <ul className="text-xs mt-1 space-y-1">
                    <li>• Large trades near price updates</li>
                    <li>• Frequent buying/selling patterns</li>
                    <li>• Trading against market trends</li>
                  </ul>
                </div>
                <div>
                  <span className="font-medium">Current Risk: {profileData.insiderTradingRisk.toFixed(1)}%</span>
                  <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full ${
                        profileData.insiderTradingRisk > 70 ? 'bg-red-500' :
                        profileData.insiderTradingRisk > 40 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(profileData.insiderTradingRisk, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Cash</div>
            <div className="text-2xl font-bold text-green-700">${profileData.user.balance.toFixed(2)}</div>
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
                formatter={(value: number | undefined) => value ? `$${value.toFixed(2)}` : '$0.00'}
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
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm animate-in fade-in-0 slide-in-from-bottom-6">
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
                  {profileData.currentHoldings.map((holding, index) => (
                    <tr key={holding.symbol} className="hover:bg-slate-50 transition-colors duration-200 animate-in fade-in-0 slide-in-from-left-2" style={{ animationDelay: `${index * 50}ms` }}>
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

        {/* Full Transaction History */}
        {showTransactionHistory && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm animate-in fade-in-0 slide-in-from-bottom-4">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Full Transaction History</h2>
            {profileData.transactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Company</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Shares</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Price</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {profileData.transactions.map((transaction, index) => (
                      <tr key={transaction.id} className={`hover:bg-slate-50 transition-colors duration-200 animate-in fade-in-0 slide-in-from-left-2 ${
                        transaction.type === 'BUY' ? 'bg-green-50/30' : 'bg-red-50/30'
                      }`} style={{ animationDelay: `${index * 25}ms` }}>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {new Date(transaction.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            transaction.type === 'BUY'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {transaction.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">{transaction.symbol}</td>
                        <td className="px-4 py-3 text-slate-700">{transaction.shares}</td>
                        <td className="px-4 py-3 text-slate-700">${transaction.price.toFixed(2)}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          ${(transaction.shares * transaction.price).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-500 text-center py-8">No transactions yet</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}


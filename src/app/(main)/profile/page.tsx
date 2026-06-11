"use client";

import { useState, useEffect } from "react";
import { LineChart, User } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

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

export default function ProfilePage() {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id?: string; username?: string } | null>(null);
  const [isOperator, setIsOperator] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userRes = await fetch("/api/auth/user");
        if (userRes.ok) {
          const userData = await userRes.json();
          setCurrentUser(userData.user);

          const opUsername = process.env.NEXT_PUBLIC_OP_USERNAME || "operator";
          setIsOperator(userData.user?.username === opUsername);

          if (userData.user?.id) {
            const profileRes = await fetch(`/api/profile/${userData.user.id}`);
            if (profileRes.ok) {
              const data = await profileRes.json();
              setProfileData(data);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!currentUser || !profileData) {
    return (
      <EmptyState
        icon={User}
        title="Sign in to view your profile"
        description="You need an account to see your portfolio and trading history."
        action={{ href: "/signin", label: "Sign in" }}
      />
    );
  }

  const chartData = profileData.balanceHistory.map((point) => ({
    date: new Date(point.date).toLocaleDateString(),
    balance: point.balance,
    totalValue: point.totalValue,
  }));

  const initialBalance = 1000;
  const gainLoss = profileData.currentTotalValue - initialBalance;
  const percentage = (gainLoss / initialBalance) * 100;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={profileData.user.name || profileData.user.username}
        description={`@${profileData.user.username} · Joined ${new Date(profileData.user.createdAt).toLocaleDateString()}`}
      >
        {isOperator && profileData.user.email && (
          <Badge variant="secondary">{profileData.user.email}</Badge>
        )}
      </PageHeader>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total value</p>
            <p className="text-3xl font-bold">${profileData.currentTotalValue.toFixed(2)}</p>
            <p
              className={cn(
                "text-sm font-medium",
                gainLoss >= 0 ? "text-primary" : "text-destructive"
              )}
            >
              {gainLoss >= 0 ? "+" : ""}${gainLoss.toFixed(2)} ({percentage >= 0 ? "+" : ""}
              {percentage.toFixed(2)}%)
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Cash
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">${profileData.user.balance.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Portfolio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${profileData.currentPortfolioValue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Holdings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{profileData.currentHoldings.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{profileData.totalTransactions}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="size-5" />
            All-time balance history
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <RechartsLineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                formatter={(value: number | string) => {
                  const numValue = typeof value === "number" ? value : parseFloat(value);
                  return isNaN(numValue) ? "$0.00" : `$${numValue.toFixed(2)}`;
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="balance"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                name="Cash balance"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="totalValue"
                stroke="hsl(var(--chart-2, var(--primary)))"
                strokeWidth={2}
                name="Total value"
                dot={false}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current holdings</CardTitle>
        </CardHeader>
        <CardContent>
          {profileData.currentHoldings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Shares</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profileData.currentHoldings.map((holding) => (
                  <TableRow key={holding.symbol}>
                    <TableCell>
                      <div className="font-medium">{holding.symbol}</div>
                      <div className="text-sm text-muted-foreground">{holding.name}</div>
                    </TableCell>
                    <TableCell>{holding.shares}</TableCell>
                    <TableCell>${holding.price.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      ${holding.value.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No holdings yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

function calculateInsiderTradingRisk(transactions: any[]): number {
  if (transactions.length < 3) return 0;

  let riskScore = 0;
  let totalRiskFactors = 0;

  // Factor 1: Large trades (more than 50 shares)
  const largeTrades = transactions.filter(t => t.shares > 50);
  if (largeTrades.length > 0) {
    riskScore += (largeTrades.length / transactions.length) * 30;
    totalRiskFactors++;
  }

  // Factor 2: Frequent trading (more than 10 transactions)
  if (transactions.length > 10) {
    riskScore += 25;
    totalRiskFactors++;
  }

  // Factor 3: Trading right after price updates
  // This would require comparing transaction timestamps with price update timestamps
  // For now, we'll use a simplified version
  const recentTransactions = transactions.filter(t =>
    new Date(t.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
  );
  if (recentTransactions.length > 2) {
    riskScore += 20;
    totalRiskFactors++;
  }

  // Factor 4: Buying high volume in short time periods
  const buyTransactions = transactions.filter(t => t.type === 'BUY');
  if (buyTransactions.length > 0) {
    const avgBuySize = buyTransactions.reduce((sum, t) => sum + t.shares, 0) / buyTransactions.length;
    if (avgBuySize > 30) {
      riskScore += 15;
      totalRiskFactors++;
    }
  }

  // Factor 5: Alternating buy/sell patterns (potential market manipulation)
  let patternScore = 0;
  for (let i = 1; i < Math.min(transactions.length, 10); i++) {
    if (transactions[i].type !== transactions[i-1].type) {
      patternScore += 5;
    }
  }
  if (patternScore > 15) {
    riskScore += 10;
    totalRiskFactors++;
  }

  // Normalize risk score
  return Math.min(totalRiskFactors > 0 ? (riskScore / totalRiskFactors) * 1.2 : 0, 100);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { userId } = await params;

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        holdings: {
          include: {
            company: {
              include: {
                prices: {
                  orderBy: { createdAt: "desc" },
                  take: 1,
                },
              },
            },
          },
        },
        transactions: {
          orderBy: { createdAt: "asc" },
          include: {
            company: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Calculate balance history from transactions
    // Start with initial balance of $1000
    let runningBalance = 1000;
    const balanceHistory: Array<{ date: string; balance: number; totalValue: number }> = [
      {
        date: new Date(user.createdAt).toISOString(),
        balance: 1000,
        totalValue: 1000,
      },
    ];

    // Get all companies with price history
    const companies = await prisma.company.findMany({
      include: {
        prices: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    // Build price history map for each company
    const priceHistoryByCompany = new Map<string, Array<{ date: Date; price: number }>>();
    companies.forEach((company) => {
      priceHistoryByCompany.set(
        company.id,
        company.prices.map((p) => ({
          date: p.createdAt,
          price: p.value,
        }))
      );
    });

    // Track holdings as we process transactions
    const holdingsAtTime = new Map<string, number>();

    // Process transactions chronologically
    for (const transaction of user.transactions) {
      // Update balance
      if (transaction.type === "BUY") {
        runningBalance -= transaction.price * transaction.shares;
        const current = holdingsAtTime.get(transaction.companyId) || 0;
        holdingsAtTime.set(transaction.companyId, current + transaction.shares);
      } else {
        runningBalance += transaction.price * transaction.shares;
        const current = holdingsAtTime.get(transaction.companyId) || 0;
        holdingsAtTime.set(transaction.companyId, Math.max(0, current - transaction.shares));
      }

      // Calculate portfolio value at this transaction time
      let portfolioValue = 0;
      holdingsAtTime.forEach((shares, companyId) => {
        if (shares > 0) {
          const prices = priceHistoryByCompany.get(companyId) || [];
          // Find the price at or before this transaction
          const priceAtTime = prices
            .filter((p) => p.date <= transaction.createdAt)
            .sort((a, b) => b.date.getTime() - a.date.getTime())[0]?.price || transaction.price;
          portfolioValue += shares * priceAtTime;
        }
      });

      balanceHistory.push({
        date: transaction.createdAt.toISOString(),
        balance: runningBalance,
        totalValue: runningBalance + portfolioValue,
      });
    }

    // Calculate current portfolio value
    const latestPrices = new Map(
      companies.map((c) => [c.id, c.prices[c.prices.length - 1]?.value ?? 0])
    );

    const currentHoldings = user.holdings.map((h) => {
      const price = latestPrices.get(h.companyId) ?? 0;
      return {
        symbol: h.company.symbol,
        name: h.company.name,
        shares: h.shares,
        price,
        value: h.shares * price,
      };
    });

    const currentPortfolioValue = currentHoldings.reduce((sum, h) => sum + h.value, 0);
    const currentTotalValue = user.balance + currentPortfolioValue;

    // Calculate insider trading risk
    const insiderTradingRisk = calculateInsiderTradingRisk(user.transactions);

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        balance: user.balance,
        isPaused: user.isPaused,
        isBanned: user.isBanned,
        createdAt: user.createdAt,
      },
      balanceHistory,
      currentHoldings,
      currentPortfolioValue,
      currentTotalValue,
      totalTransactions: user.transactions.length,
      transactions: user.transactions.map(t => ({
        id: t.id,
        type: t.type,
        symbol: t.company.symbol,
        shares: t.shares,
        price: t.price,
        createdAt: t.createdAt,
      })),
      insiderTradingRisk,
    });
  } catch (error) {
    console.error("Profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


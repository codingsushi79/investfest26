import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

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

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        balance: user.balance,
        createdAt: user.createdAt,
      },
      balanceHistory,
      currentHoldings,
      currentPortfolioValue,
      currentTotalValue,
      totalTransactions: user.transactions.length,
    });
  } catch (error) {
    console.error("Profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


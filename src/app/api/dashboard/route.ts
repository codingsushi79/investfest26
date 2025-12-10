import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get all companies with ALL their historical prices
    const companies = await prisma.company.findMany({
      include: {
        prices: {
          orderBy: { createdAt: "asc" }, // Oldest first for proper timeline
        },
      },
    });

    // Get user holdings
    const holdings = await prisma.holding.findMany({
      where: { userId: user.id },
      include: { company: true },
    });

    const latestPrices = new Map(
      companies.map((c) => [c.id, c.prices[c.prices.length - 1]?.value ?? 0])
    );

    const holdingsWithValues = holdings.map((h) => {
      const latest = latestPrices.get(h.companyId) ?? 0;
      return {
        symbol: h.company.symbol,
        name: h.company.name,
        shares: h.shares,
        latestPrice: latest,
        value: h.shares * latest,
      };
    });

    const invested = holdingsWithValues.reduce((sum, h) => sum + h.value, 0);
    const cash = user.balance;
    const portfolioValue = invested + cash;

    return NextResponse.json({
      user,
      companies: companies.map(c => ({
        symbol: c.symbol,
        name: c.name,
        prices: c.prices.map(p => ({ label: p.label, value: p.value })),
      })),
      holdings: holdingsWithValues,
      cash,
      invested,
      portfolioValue,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

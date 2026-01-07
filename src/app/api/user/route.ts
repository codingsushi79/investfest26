import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get user holdings with latest prices (optimized)
    const holdings = await prisma.holding.findMany({
      where: { userId: user.id },
      include: {
        company: {
          include: {
            prices: {
              orderBy: { createdAt: "desc" },
              take: 1, // Only latest price
            },
          },
        },
      },
    });

    const holdingsWithValues = holdings.map((h) => ({
      companyId: h.companyId,
      symbol: h.company.symbol,
      name: h.company.name,
      shares: h.shares,
      latestPrice: h.company.prices[0]?.value ?? 0,
    }));

    return NextResponse.json({
      id: user.id,
      username: user.username,
      balance: user.balance,
      holdings: holdingsWithValues,
    });
  } catch (error) {
    console.error("User API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

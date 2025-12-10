import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const holdings = await prisma.holding.findMany({
      where: { userId: user.id },
      include: { company: true },
    });

    return NextResponse.json({
      user,
      holdings: holdings.map(h => ({
        symbol: h.company.symbol,
        shares: h.shares,
        value: 0, // Will be calculated on frontend with current prices
      })),
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

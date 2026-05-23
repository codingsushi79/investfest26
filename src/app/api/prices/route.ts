import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTradingSharePrice } from "@/lib/pricing";

export async function GET() {
  try {
    const companies = await prisma.company.findMany({
      include: {
        prices: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const prices: Record<string, number> = {};
    companies.forEach((company) => {
      prices[company.symbol] = getTradingSharePrice(company.prices);
    });

    return NextResponse.json(prices);
  } catch (error) {
    console.error("Prices error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

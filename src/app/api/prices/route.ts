import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const companies = await prisma.company.findMany({
      include: {
        prices: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const prices: Record<string, number> = {};
    companies.forEach(company => {
      prices[company.symbol] = company.prices[0]?.value || 0;
    });

    return NextResponse.json(prices);
  } catch (error) {
    console.error("Prices error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

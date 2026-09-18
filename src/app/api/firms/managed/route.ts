import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { getFeaturesConfig } from "@/lib/config";
import { getAssetPrices } from "@/lib/firm-data";
import { prisma } from "@/lib/prisma";

/**
 * The firms the caller can trade for, with the cash and shares each one has.
 * Powers the "acting as" picker on the offer screens.
 */
export async function GET() {
  try {
    const features = getFeaturesConfig();
    if (!features.firms || !features.firmTrading) {
      return NextResponse.json({ firms: [] });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ firms: [] });
    }

    const firms = await prisma.firm.findMany({
      where: { managerId: user.id, isClosed: false },
      include: { holdings: { include: { company: true } } },
      orderBy: { createdAt: "asc" },
    });

    if (firms.length === 0) {
      return NextResponse.json({ firms: [] });
    }

    const prices = await getAssetPrices();

    return NextResponse.json({
      firms: firms.map((firm) => ({
        id: firm.id,
        name: firm.name,
        slug: firm.slug,
        balance: firm.balance,
        holdings: firm.holdings
          .filter((holding) => holding.shares > 0)
          .map((holding) => ({
            companyId: holding.companyId,
            symbol: holding.company.symbol,
            name: holding.company.name,
            shares: holding.shares,
            latestPrice: prices.stockPriceById.get(holding.companyId) ?? 0,
          })),
      })),
    });
  } catch (error) {
    console.error("Managed firms error:", error);
    return NextResponse.json({ firms: [] });
  }
}

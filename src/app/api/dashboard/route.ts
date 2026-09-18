import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { getTotalSharesByCompany } from "@/lib/data";
import { getFeaturesConfig } from "@/lib/config";
import { getCryptoBagsByUser } from "@/lib/crypto-data";
import { getFirmStakesByUser } from "@/lib/firm-data";
import { prisma } from "@/lib/prisma";
import {
  getLatestPricePoint,
  getNextTimePeriod,
  getSharesForCompanyValue,
  getTradingSharePrice,
  isInBaselinePeriod,
} from "@/lib/pricing";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get all companies with their full price history for charts
    const companies = await prisma.company.findMany({
      include: {
        prices: {
          orderBy: { createdAt: "asc" }, // Oldest first for consistent series
        },
      },
    });

    const totalSharesByCompany = await getTotalSharesByCompany();

    // Get user holdings
    const holdings = await prisma.holding.findMany({
      where: { userId: user.id },
      include: { company: true },
    });

    const latestPrices = new Map(
      companies.map((c) => [c.id, getTradingSharePrice(c.prices)])
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

    // Coins and firm stakes are holdings too; leaving them out made the
    // dashboard understate what someone actually owns.
    const features = getFeaturesConfig();
    const [cryptoBags, firmStakes] = await Promise.all([
      features.crypto ? getCryptoBagsByUser() : Promise.resolve(new Map()),
      features.firms ? getFirmStakesByUser() : Promise.resolve(new Map()),
    ]);

    const myCrypto = cryptoBags.get(user.id) ?? [];
    const myFirms = firmStakes.get(user.id) ?? [];

    const stockValue = holdingsWithValues.reduce((sum, h) => sum + h.value, 0);
    const cryptoValue = myCrypto.reduce(
      (sum: number, bag: { value: number }) => sum + bag.value,
      0
    );
    const firmValue = myFirms.reduce(
      (sum: number, stake: { value: number }) => sum + stake.value,
      0
    );

    const invested = stockValue + cryptoValue + firmValue;
    const cash = user.balance;
    const portfolioValue = invested;

    return NextResponse.json({
      user,
      companies: companies.map((c) => {
        const actualShares = totalSharesByCompany.get(c.id) ?? 0;
        const latest = getLatestPricePoint(c.prices);
        return {
          symbol: c.symbol,
          name: c.name,
          actualShares,
          valuationShares: getSharesForCompanyValue(c.prices, actualShares),
          inBaseline: isInBaselinePeriod(c.prices),
          latestLabel: latest?.label ?? "Y0 Q4",
          nextLabel: getNextTimePeriod(c.prices),
          prices: c.prices.map((p) => ({ label: p.label, value: p.value })),
        };
      }),
      holdings: holdingsWithValues,
      crypto: myCrypto,
      firmStakes: myFirms,
      stockValue,
      cryptoValue,
      firmValue,
      cash,
      invested,
      portfolioValue,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

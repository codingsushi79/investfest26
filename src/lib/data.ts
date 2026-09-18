import { cache } from "react";
import { prisma } from "./prisma";
import { getFeaturesConfig } from "./config";
import { getFirmStakesByUser, type FirmStake } from "./firm-data";
import { getCryptoBagsByUser, type CryptoBag } from "./crypto-data";
import {
  BASELINE_SHARE_PRICE,
  BASELINE_SHARES,
  getLatestCompanyValue,
  getLatestPricePoint,
  getTradingSharePrice,
  isInBaselinePeriod,
} from "./pricing";

export const COMPANY_SYMBOLS = [
  { symbol: "HH", name: "Hazard Holdings" },
  { symbol: "DMI", name: "Drake Maye Industries" },
  { symbol: "MG", name: "Mantis Group" },
  { symbol: "THFT", name: "Penny Pinchers United" },
  { symbol: "KEY", name: "Royal Key" },
  { symbol: "TN", name: "True North Investments" },
  { symbol: "TMB", name: "Trust Me Bro" },
  { symbol: "TGOC", name: "Two Guys One Company" },
];

export const ensureSeedData = cache(async () => {
  const companyCount = await prisma.company.count();

  if (companyCount === 0) {
    await prisma.$transaction(async (tx) => {
      for (const company of COMPANY_SYMBOLS) {
        const companyRecord = await tx.company.create({
          data: {
            symbol: company.symbol,
            name: company.name,
          },
        });

        // Y0 Q4 setup: $100/share × 100 baseline shares = $10,000 company value
        await tx.pricePoint.create({
          data: {
            companyId: companyRecord.id,
            label: "Y0 Q4",
            value: BASELINE_SHARE_PRICE,
            companyValue: BASELINE_SHARES * BASELINE_SHARE_PRICE,
            sharesOutstanding: BASELINE_SHARES,
          },
        });
      }
    });
  } else {
    const companies = await prisma.company.findMany({
      include: { prices: true },
    });

    for (const company of companies) {
      if (company.prices.length === 0) {
        await prisma.pricePoint.create({
          data: {
            companyId: company.id,
            label: "Y0 Q4",
            value: BASELINE_SHARE_PRICE,
            companyValue: BASELINE_SHARES * BASELINE_SHARE_PRICE,
            sharesOutstanding: BASELINE_SHARES,
          },
        });
      }
    }
  }
});

function tradingPriceFromCompanyPrices(
  prices: Array<{ label: string; value: number }>
) {
  return getTradingSharePrice(prices);
}

export async function getLatestPrices() {
  const companies = await prisma.company.findMany({
    include: { prices: { orderBy: { createdAt: "asc" } } },
  });
  return new Map(
    companies
      .filter((c) => c.prices.length > 0)
      .map((c) => [
        c.id,
        {
          price: tradingPriceFromCompanyPrices(c.prices),
          symbol: c.symbol,
        },
      ])
  );
}

export async function getDashboardData(userId?: string) {
  await ensureSeedData();

  const [companies, user] = await Promise.all([
    prisma.company.findMany({
      include: { prices: { orderBy: { createdAt: "asc" } } },
      orderBy: { symbol: "asc" },
    }),
    userId
      ? prisma.user.findUnique({
          where: { id: userId },
          include: { holdings: true },
        })
      : null,
  ]);

  const latestPrices = new Map(
    companies.map((c) => [c.id, tradingPriceFromCompanyPrices(c.prices)])
  );

  const holdings =
    user?.holdings.map((h) => {
      const company = companies.find((c) => c.id === h.companyId)!;
      const latest = latestPrices.get(h.companyId) ?? 0;
      return {
        symbol: company.symbol,
        name: company.name,
        shares: h.shares,
        latestPrice: latest,
        value: h.shares * latest,
      };
    }) ?? [];

  const invested = holdings.reduce((sum, h) => sum + h.value, 0);
  const cash = user?.balance ?? 0;
  const portfolioValue = invested + cash;

  return {
    companies,
    holdings,
    cash,
    invested,
    portfolioValue,
  };
}

/**
 * Crypto bags and firm stakes count toward a player's wealth just like
 * shares do, so standings stay honest when someone moves cash into them.
 */
async function getSideAssetValues() {
  const features = getFeaturesConfig();
  const [crypto, firms] = await Promise.all([
    features.crypto
      ? getCryptoBagsByUser()
      : Promise.resolve(new Map<string, CryptoBag[]>()),
    features.firms
      ? getFirmStakesByUser()
      : Promise.resolve(new Map<string, FirmStake[]>()),
  ]);

  const sum = <T extends { value: number }>(rows: T[] | undefined) =>
    (rows ?? []).reduce((total, row) => total + row.value, 0);

  return {
    bagsFor: (userId: string) => crypto.get(userId) ?? [],
    stakesFor: (userId: string) => firms.get(userId) ?? [],
    cryptoValueFor: (userId: string) => sum(crypto.get(userId)),
    firmValueFor: (userId: string) => sum(firms.get(userId)),
  };
}

export async function getLeaderboard() {
  await ensureSeedData();
  const companies = await prisma.company.findMany({
    include: { prices: { orderBy: { createdAt: "asc" } } },
  });
  const latestPriceById = new Map(
    companies.map((c) => [c.id, tradingPriceFromCompanyPrices(c.prices)])
  );

  const [users, sideAssets] = await Promise.all([
    prisma.user.findMany({ include: { holdings: true } }),
    getSideAssetValues(),
  ]);

  const opUsername = process.env.OP_USERNAME;
  const filteredUsers = users.filter((user) => user.username !== opUsername);

  const rows = filteredUsers.map((user) => {
    const holdings = user.holdings.map((h) => {
      const price = latestPriceById.get(h.companyId) ?? 0;
      const company = companies.find((c) => c.id === h.companyId)!;
      return {
        symbol: company.symbol,
        shares: h.shares,
        value: h.shares * price,
        price,
      };
    });
    const stockValue = holdings.reduce((sum, h) => sum + h.value, 0);
    const cryptoValue = sideAssets.cryptoValueFor(user.id);
    const firmValue = sideAssets.firmValueFor(user.id);
    const invested = stockValue + cryptoValue + firmValue;
    return {
      userId: user.id,
      name: user.name,
      username: user.username ?? "",
      email: user.email,
      balance: user.balance,
      holdings,
      crypto: sideAssets.bagsFor(user.id),
      firmStakes: sideAssets.stakesFor(user.id),
      stockValue,
      cryptoValue,
      firmValue,
      invested,
      portfolioValue: invested,
    };
  });

  return rows.sort((a, b) => b.portfolioValue - a.portfolioValue);
}

export async function getAllPortfolios() {
  await ensureSeedData();
  const companies = await prisma.company.findMany({
    include: { prices: { orderBy: { createdAt: "asc" } } },
  });
  const latestById = new Map(
    companies.map((c) => [c.id, tradingPriceFromCompanyPrices(c.prices)])
  );

  const [users, sideAssets] = await Promise.all([
    prisma.user.findMany({ include: { holdings: true } }),
    getSideAssetValues(),
  ]);

  const opUsername = process.env.OP_USERNAME;
  const filteredUsers = users.filter((user) => user.username !== opUsername);

  return filteredUsers.map((u) => {
    const holdingsWithValues = u.holdings.map((h) => {
      const company = companies.find((c) => c.id === h.companyId)!;
      const price = latestById.get(h.companyId) ?? 0;
      return {
        symbol: company.symbol,
        shares: h.shares,
        latestPrice: price,
        value: h.shares * price,
      };
    });

    const stockValue = holdingsWithValues.reduce((sum, h) => sum + h.value, 0);
    const cryptoValue = sideAssets.cryptoValueFor(u.id);
    const firmValue = sideAssets.firmValueFor(u.id);

    return {
      userId: u.id,
      name: u.name,
      username: u.username ?? "",
      email: u.email,
      balance: u.balance,
      holdings: holdingsWithValues,
      crypto: sideAssets.bagsFor(u.id),
      firmStakes: sideAssets.stakesFor(u.id),
      stockValue,
      cryptoValue,
      firmValue,
      portfolioValue: stockValue + cryptoValue + firmValue,
    };
  });
}

/**
 * Shares in issue per company: the ones people hold directly plus the ones
 * firms hold for their clients. A firm's shares were bought with real client
 * money, so leaving them out understates the count and, since share price is
 * company value divided by it, overstates the price.
 */
export async function getTotalSharesByCompany() {
  await ensureSeedData();

  const opUsername = process.env.OP_USERNAME;
  const [holdings, firmHoldings] = await Promise.all([
    prisma.holding.findMany({ include: { user: true } }),
    getFeaturesConfig().firms
      ? prisma.firmHolding.findMany()
      : Promise.resolve([]),
  ]);

  const totals = new Map<string, number>();

  // The operator isn't a player, so their own shares don't count.
  for (const holding of holdings) {
    if (holding.user.username === opUsername) continue;
    totals.set(
      holding.companyId,
      (totals.get(holding.companyId) ?? 0) + holding.shares
    );
  }

  for (const holding of firmHoldings) {
    totals.set(
      holding.companyId,
      (totals.get(holding.companyId) ?? 0) + holding.shares
    );
  }

  return totals;
}

export async function getCompanyValues() {
  await ensureSeedData();

  const companies = await prisma.company.findMany({
    include: { prices: { orderBy: { createdAt: "asc" } } },
  });

  // Same count the operator's price maths uses, firm shares included.
  const sharesByCompany = await getTotalSharesByCompany();

  const companyValues = companies.map((company) => {
    const sharesInvested = sharesByCompany.get(company.id) ?? 0;
    const inBaseline = isInBaselinePeriod(company.prices);
    const latest = getLatestPricePoint(company.prices);
    const operatorCompanyValue = getLatestCompanyValue(company.prices);
    const sharePrice = getTradingSharePrice(company.prices);
    const sharesAtLastUpdate =
      latest?.sharesOutstanding ?? (inBaseline ? BASELINE_SHARES : sharesInvested);

    // Live company value grows as more shares are invested at the current share price
    const liveCompanyValue = inBaseline
      ? operatorCompanyValue
      : sharesInvested * sharePrice;

    return {
      symbol: company.symbol,
      name: company.name,
      sharesInvested,
      sharesAtLastUpdate,
      sharePrice,
      operatorCompanyValue,
      companyValue: liveCompanyValue,
      inBaseline,
      latestPeriod: latest?.label ?? "Y0 Q4",
    };
  });

  return companyValues;
}

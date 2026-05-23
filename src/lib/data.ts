import { cache } from "react";
import { prisma } from "./prisma";
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

export async function getLeaderboard() {
  await ensureSeedData();
  const companies = await prisma.company.findMany({
    include: { prices: { orderBy: { createdAt: "asc" } } },
  });
  const latestPriceById = new Map(
    companies.map((c) => [c.id, tradingPriceFromCompanyPrices(c.prices)])
  );

  const users = await prisma.user.findMany({
    include: { holdings: true },
  });

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
    const invested = holdings.reduce((sum, h) => sum + h.value, 0);
    const portfolioValue = invested;
    return {
      userId: user.id,
      name: user.name,
      username: user.username ?? "",
      email: user.email,
      balance: user.balance,
      holdings,
      invested,
      portfolioValue,
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

  const users = await prisma.user.findMany({
    include: { holdings: true },
  });

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

    const portfolioValue = holdingsWithValues.reduce((sum, h) => sum + h.value, 0);

    return {
      userId: u.id,
      name: u.name,
      username: u.username ?? "",
      email: u.email,
      balance: u.balance,
      holdings: holdingsWithValues,
      portfolioValue,
    };
  });
}

export async function getTotalSharesByCompany() {
  await ensureSeedData();

  const opUsername = process.env.OP_USERNAME;
  const holdings = await prisma.holding.findMany({
    include: { user: true },
  });

  const filteredHoldings = holdings.filter(
    (holding) => holding.user.username !== opUsername
  );

  const totals = new Map<string, number>();
  for (const holding of filteredHoldings) {
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

  const opUsername = process.env.OP_USERNAME;
  const holdings = await prisma.holding.findMany({
    include: {
      user: true,
      company: true,
    },
  });

  const filteredHoldings = holdings.filter(
    (holding) => holding.user.username !== opUsername
  );

  const companyValues = companies.map((company) => {
    const companyHoldings = filteredHoldings.filter(
      (holding) => holding.companyId === company.id
    );
    const sharesInvested = companyHoldings.reduce(
      (sum, holding) => sum + holding.shares,
      0
    );
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

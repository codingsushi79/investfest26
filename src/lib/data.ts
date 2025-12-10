import { cache } from "react";
import { prisma } from "./prisma";

export const COMPANY_SYMBOLS = [
  { symbol: "HH", name: "Hazard Holdings" },
  { symbol: "DMI", name: "Drake Maye Industries" },
  { symbol: "MG", name: "Mantis Group" },
  { symbol: "THFT", name: "Penny Pinchers United" },
  { symbol: "KEY", name: "Royal Key" },
  { symbol: "TN", name: "True North Investments" },
  { symbol: "TMB", name: "Trust Me Bro" },
  { symbol: "TGOC", name: "Two Guys one Company" },
];

const DEFAULT_PRICE_SERIES = [
  { label: "y1 q1", value: 100 },
  { label: "y1 q2", value: 105 },
  { label: "y1 q3", value: 112 },
  { label: "y1 q4", value: 118 },
];

export const ensureSeedData = cache(async () => {
  const count = await prisma.company.count();
  if (count > 0) return;

  await prisma.$transaction(async (tx) => {
    for (const company of COMPANY_SYMBOLS) {
      const created = await tx.company.create({
        data: {
          symbol: company.symbol,
          name: company.name,
        },
      });
      await tx.pricePoint.createMany({
        data: DEFAULT_PRICE_SERIES.map((p) => ({
          ...p,
          companyId: created.id,
        })),
      });
    }
  });
});

export async function getLatestPrices() {
  const companies = await prisma.company.findMany({
    include: { prices: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  return new Map(
    companies
      .filter((c) => c.prices[0])
      .map((c) => [c.id, { price: c.prices[0].value, symbol: c.symbol }])
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
    companies.map((c) => [c.id, c.prices[c.prices.length - 1]?.value ?? 0])
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
    include: { prices: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const latestPriceById = new Map(
    companies.map((c) => [c.id, c.prices[0]?.value ?? 0])
  );

  const users = await prisma.user.findMany({
    include: { holdings: true },
  });

  const rows = users.map((user) => {
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
    const portfolioValue = invested + user.balance;
    return {
      userId: user.id,
      name: user.name ?? "Anonymous",
      username: user.username ?? "",
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
    include: { prices: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const latestById = new Map(
    companies.map((c) => [c.id, c.prices[0]?.value ?? 0])
  );

  const users = await prisma.user.findMany({
    include: { holdings: true },
  });

  return users.map((u) => ({
    userId: u.id,
    name: u.name ?? "Anonymous",
    username: u.username ?? "",
    balance: u.balance,
    holdings: u.holdings.map((h) => {
      const company = companies.find((c) => c.id === h.companyId)!;
      const price = latestById.get(h.companyId) ?? 0;
      return {
        symbol: company.symbol,
        shares: h.shares,
        latestPrice: price,
        value: h.shares * price,
      };
    }),
  }));
}


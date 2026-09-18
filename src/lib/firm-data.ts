import { prisma } from "./prisma";
import { getMemecoinConfig } from "./config";
import { getMemecoinPrice } from "./memecoin";
import { getTradingSharePrice } from "./pricing";

/** A fresh fund starts at $1.00 per unit, so a $100 deposit buys 100 units. */
export const INITIAL_UNIT_PRICE = 1;

export type FirmHoldingRow = {
  assetType: "STOCK" | "MEMECOIN";
  symbol: string;
  name: string;
  units: number;
  price: number;
  value: number;
};

type FirmWithHoldings = {
  id: string;
  balance: number;
  totalUnits: number;
  holdings: Array<{ companyId: string; shares: number }>;
  memecoinHoldings: Array<{ memecoinId: string; units: number }>;
};

export async function getAssetPrices(at: Date = new Date()) {
  const config = getMemecoinConfig();
  const [companies, coins] = await Promise.all([
    prisma.company.findMany({ include: { prices: { orderBy: { createdAt: "asc" } } } }),
    prisma.memecoin.findMany(),
  ]);

  return {
    companies,
    coins,
    stockPriceById: new Map(
      companies.map((c) => [c.id, getTradingSharePrice(c.prices)])
    ),
    coinPriceById: new Map(
      coins.map((c) => [c.id, getMemecoinPrice(c, config.tickSeconds, at)])
    ),
    companyById: new Map(companies.map((c) => [c.id, c])),
    coinById: new Map(coins.map((c) => [c.id, c])),
  };
}

export type AssetPrices = Awaited<ReturnType<typeof getAssetPrices>>;

/**
 * A firm is valued like a fund: its clients own units, and a unit is worth the
 * firm's cash plus its positions divided by the units outstanding.
 */
export function valueFirm(firm: FirmWithHoldings, prices: AssetPrices) {
  const stockValue = firm.holdings.reduce(
    (sum, h) => sum + h.shares * (prices.stockPriceById.get(h.companyId) ?? 0),
    0
  );
  const coinValue = firm.memecoinHoldings.reduce(
    (sum, h) => sum + h.units * (prices.coinPriceById.get(h.memecoinId) ?? 0),
    0
  );
  const nav = firm.balance + stockValue + coinValue;
  const navPerUnit =
    firm.totalUnits > 0 ? nav / firm.totalUnits : INITIAL_UNIT_PRICE;

  return { cash: firm.balance, stockValue, coinValue, nav, navPerUnit };
}

export function describeFirmHoldings(
  firm: FirmWithHoldings,
  prices: AssetPrices
): FirmHoldingRow[] {
  const stocks: FirmHoldingRow[] = firm.holdings
    .filter((h) => h.shares > 0)
    .map((h) => {
      const company = prices.companyById.get(h.companyId);
      const price = prices.stockPriceById.get(h.companyId) ?? 0;
      return {
        assetType: "STOCK" as const,
        symbol: company?.symbol ?? "?",
        name: company?.name ?? "Unknown",
        units: h.shares,
        price,
        value: h.shares * price,
      };
    });

  const coins: FirmHoldingRow[] = firm.memecoinHoldings
    .filter((h) => h.units > 0)
    .map((h) => {
      const coin = prices.coinById.get(h.memecoinId);
      const price = prices.coinPriceById.get(h.memecoinId) ?? 0;
      return {
        assetType: "MEMECOIN" as const,
        symbol: coin?.symbol ?? "?",
        name: coin?.name ?? "Unknown",
        units: h.units,
        price,
        value: h.units * price,
      };
    });

  return [...stocks, ...coins].sort((a, b) => b.value - a.value);
}

const firmInclude = {
  manager: { select: { id: true, username: true, name: true } },
  holdings: true,
  memecoinHoldings: true,
  members: { select: { id: true, userId: true, units: true, invested: true, withdrawn: true } },
} as const;

/** Every firm, with the caller's stake in each one when they have one. */
export async function getFirmsOverview(userId?: string) {
  const [firms, prices] = await Promise.all([
    prisma.firm.findMany({ include: firmInclude, orderBy: { createdAt: "asc" } }),
    getAssetPrices(),
  ]);

  return firms
    .map((firm) => {
      const valuation = valueFirm(firm, prices);
      const membership = userId
        ? firm.members.find((m) => m.userId === userId)
        : undefined;

      return {
        id: firm.id,
        slug: firm.slug,
        name: firm.name,
        description: firm.description,
        manager: firm.manager,
        isManager: userId === firm.managerId,
        isOpen: firm.isOpen,
        isClosed: firm.isClosed,
        feePercent: firm.feePercent,
        memberCount: firm.members.length,
        ...valuation,
        membership: membership
          ? {
              units: membership.units,
              invested: membership.invested,
              withdrawn: membership.withdrawn,
              value: membership.units * valuation.navPerUnit,
              profit:
                membership.units * valuation.navPerUnit +
                membership.withdrawn -
                membership.invested,
            }
          : null,
      };
    })
    .sort((a, b) => b.nav - a.nav);
}

export type FirmOverviewRow = Awaited<ReturnType<typeof getFirmsOverview>>[number];

/** One firm in full: positions, clients and recent activity. */
export async function getFirmDetail(slug: string, userId?: string) {
  const firm = await prisma.firm.findUnique({
    where: { slug },
    include: {
      manager: { select: { id: true, username: true, name: true } },
      holdings: true,
      memecoinHoldings: true,
      members: {
        include: { user: { select: { id: true, username: true, name: true } } },
        orderBy: { units: "desc" },
      },
      transactions: { orderBy: { createdAt: "desc" }, take: 25 },
    },
  });

  if (!firm) return null;

  const prices = await getAssetPrices();
  const valuation = valueFirm(firm, prices);
  const isManager = userId === firm.managerId;
  const membership = userId ? firm.members.find((m) => m.userId === userId) : undefined;

  return {
    id: firm.id,
    slug: firm.slug,
    name: firm.name,
    description: firm.description,
    manager: firm.manager,
    isManager,
    isOpen: firm.isOpen,
    isClosed: firm.isClosed,
    feePercent: firm.feePercent,
    totalUnits: firm.totalUnits,
    ...valuation,
    holdings: describeFirmHoldings(firm, prices),
    members: firm.members.map((member) => ({
      userId: member.userId,
      username: member.user.username,
      name: member.user.name,
      units: member.units,
      invested: member.invested,
      withdrawn: member.withdrawn,
      value: member.units * valuation.navPerUnit,
      // Clients see their own numbers; the manager sees the whole book.
      visible: isManager || member.userId === userId,
    })),
    membership: membership
      ? {
          units: membership.units,
          invested: membership.invested,
          withdrawn: membership.withdrawn,
          value: membership.units * valuation.navPerUnit,
          profit:
            membership.units * valuation.navPerUnit +
            membership.withdrawn -
            membership.invested,
        }
      : null,
    transactions: firm.transactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      assetType: tx.assetType,
      symbol: tx.symbol,
      units: tx.units,
      price: tx.price,
      amount: tx.amount,
      createdAt: tx.createdAt,
    })),
  };
}

/** Value of each user's firm stakes, keyed by user id. */
export async function getFirmValueByUser() {
  const [firms, prices] = await Promise.all([
    prisma.firm.findMany({
      include: { holdings: true, memecoinHoldings: true, members: true },
    }),
    getAssetPrices(),
  ]);

  const totals = new Map<string, number>();
  for (const firm of firms) {
    const { navPerUnit } = valueFirm(firm, prices);
    for (const member of firm.members) {
      totals.set(
        member.userId,
        (totals.get(member.userId) ?? 0) + member.units * navPerUnit
      );
    }
  }

  return totals;
}

const SLUG_STRIP = /[^a-z0-9]+/g;

export function slugifyFirmName(name: string) {
  const slug = name.trim().toLowerCase().replace(SLUG_STRIP, "-").replace(/^-|-$/g, "");
  if (slug.length < 2) {
    throw new Error("Firm name must contain at least two letters or digits");
  }
  return slug.slice(0, 48);
}

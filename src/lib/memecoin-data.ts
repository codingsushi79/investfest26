import { prisma } from "./prisma";
import { getMemecoinConfig } from "./config";
import {
  getMemecoinChange,
  getMemecoinHistory,
  getMemecoinPrice,
  getSecondsToNextTick,
} from "./memecoin";

export type MemecoinMarketRow = {
  id: string;
  symbol: string;
  name: string;
  description: string | null;
  price: number;
  change1h: number;
  change24h: number;
  volatility: number;
  isActive: boolean;
  secondsToNextTick: number;
  history: Array<{ label: string; value: number }>;
  units: number;
  value: number;
};

/** Live memecoin market, with the caller's position folded in when given. */
export async function getMemecoinMarket(userId?: string) {
  const config = getMemecoinConfig();
  const now = new Date();

  const [coins, holdings] = await Promise.all([
    prisma.memecoin.findMany({ orderBy: { createdAt: "asc" } }),
    userId
      ? prisma.memecoinHolding.findMany({ where: { userId } })
      : Promise.resolve([]),
  ]);

  const unitsByCoin = new Map(holdings.map((h) => [h.memecoinId, h.units]));
  const ticksPerHour = Math.max(1, Math.round(3600 / config.tickSeconds));

  const rows: MemecoinMarketRow[] = coins.map((coin) => {
    const price = getMemecoinPrice(coin, config.tickSeconds, now);
    const units = unitsByCoin.get(coin.id) ?? 0;

    return {
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      description: coin.description,
      price,
      change1h: getMemecoinChange(coin, config.tickSeconds, ticksPerHour, now),
      change24h: getMemecoinChange(coin, config.tickSeconds, ticksPerHour * 24, now),
      volatility: coin.volatility,
      isActive: coin.isActive,
      secondsToNextTick: getSecondsToNextTick(coin, config.tickSeconds, now),
      history: getMemecoinHistory(coin, config.tickSeconds, config.historyPoints, now).map(
        (point) => ({ label: point.label, value: point.value })
      ),
      units,
      value: units * price,
    };
  });

  return {
    coins: rows,
    tickSeconds: config.tickSeconds,
    sellFeePercentage: config.sellFeePercentage,
    holdingsValue: rows.reduce((sum, row) => sum + row.value, 0),
  };
}

/** Current price of every memecoin, keyed by coin id. */
export async function getMemecoinPricesById(at: Date = new Date()) {
  const config = getMemecoinConfig();
  const coins = await prisma.memecoin.findMany();
  return new Map(
    coins.map((coin) => [coin.id, getMemecoinPrice(coin, config.tickSeconds, at)])
  );
}

/** Total value of a user's memecoin bag, for leaderboards and portfolios. */
export async function getMemecoinValueByUser(at: Date = new Date()) {
  const config = getMemecoinConfig();
  const [coins, holdings] = await Promise.all([
    prisma.memecoin.findMany(),
    prisma.memecoinHolding.findMany(),
  ]);

  const priceById = new Map(
    coins.map((coin) => [coin.id, getMemecoinPrice(coin, config.tickSeconds, at)])
  );

  const totals = new Map<string, number>();
  for (const holding of holdings) {
    const price = priceById.get(holding.memecoinId) ?? 0;
    totals.set(
      holding.userId,
      (totals.get(holding.userId) ?? 0) + holding.units * price
    );
  }

  return totals;
}

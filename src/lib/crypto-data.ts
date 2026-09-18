import { prisma } from "./prisma";
import { getCryptoConfig } from "./config";
import {
  getCryptoChange,
  getCryptoHistory,
  getCryptoPrice,
  getSecondsToNextTick,
} from "./crypto";

export type CryptoMarketRow = {
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

/** Live crypto market, with the caller's position folded in when given. */
export async function getCryptoMarket(userId?: string) {
  const config = getCryptoConfig();
  const now = new Date();

  const [coins, holdings] = await Promise.all([
    prisma.crypto.findMany({ orderBy: { createdAt: "asc" } }),
    userId
      ? prisma.cryptoHolding.findMany({ where: { userId } })
      : Promise.resolve([]),
  ]);

  const unitsByCoin = new Map(holdings.map((h) => [h.cryptoId, h.units]));
  const ticksPerHour = Math.max(1, Math.round(3600 / config.tickSeconds));

  const rows: CryptoMarketRow[] = coins.map((coin) => {
    const price = getCryptoPrice(coin, config.tickSeconds, now);
    const units = unitsByCoin.get(coin.id) ?? 0;

    return {
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      description: coin.description,
      price,
      change1h: getCryptoChange(coin, config.tickSeconds, ticksPerHour, now),
      change24h: getCryptoChange(coin, config.tickSeconds, ticksPerHour * 24, now),
      volatility: coin.volatility,
      isActive: coin.isActive,
      secondsToNextTick: getSecondsToNextTick(coin, config.tickSeconds, now),
      history: getCryptoHistory(coin, config.tickSeconds, config.historyPoints, now).map(
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

/** Current price of every crypto, keyed by coin id. */
export async function getCryptoPricesById(at: Date = new Date()) {
  const config = getCryptoConfig();
  const coins = await prisma.crypto.findMany();
  return new Map(
    coins.map((coin) => [coin.id, getCryptoPrice(coin, config.tickSeconds, at)])
  );
}

export type CryptoBag = {
  cryptoId: string;
  symbol: string;
  units: number;
  price: number;
  value: number;
};

/** Each user's crypto bags, keyed by user id. */
export async function getCryptoBagsByUser(at: Date = new Date()) {
  const config = getCryptoConfig();
  const [coins, holdings] = await Promise.all([
    prisma.crypto.findMany(),
    prisma.cryptoHolding.findMany(),
  ]);

  const coinById = new Map(coins.map((coin) => [coin.id, coin]));
  const priceById = new Map(
    coins.map((coin) => [coin.id, getCryptoPrice(coin, config.tickSeconds, at)])
  );

  const bags = new Map<string, CryptoBag[]>();
  for (const holding of holdings) {
    if (holding.units <= 0) continue;
    const price = priceById.get(holding.cryptoId) ?? 0;
    const list = bags.get(holding.userId) ?? [];
    list.push({
      cryptoId: holding.cryptoId,
      symbol: coinById.get(holding.cryptoId)?.symbol ?? "?",
      units: holding.units,
      price,
      value: holding.units * price,
    });
    bags.set(holding.userId, list);
  }

  for (const list of bags.values()) {
    list.sort((a, b) => b.value - a.value);
  }

  return bags;
}

/** Total value of a user's crypto bag, for leaderboards and portfolios. */
export async function getCryptoValueByUser(at: Date = new Date()) {
  const bags = await getCryptoBagsByUser(at);
  return new Map(
    [...bags].map(([userId, list]) => [
      userId,
      list.reduce((sum, bag) => sum + bag.value, 0),
    ])
  );
}

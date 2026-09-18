/**
 * Memecoin prices move on their own. Nobody — not even the operator — can set
 * one: the price is a pure function of the coin's seed and how many ticks have
 * elapsed since its genesis, so every server and every request agrees on it
 * without a background job writing price rows.
 */

export type MemecoinLike = {
  id: string;
  seed: number;
  basePrice: number;
  volatility: number;
  drift: number;
  minPrice: number;
  maxPrice?: number | null;
  genesisAt: Date | string;
};

/** Guard against a pathological loop if a coin's genesis is far in the past. */
const MAX_TICKS = 200_000;

/** Deterministic uniform in (0, 1) from a seed and a tick index. */
function hashUniform(seed: number, tick: number, salt: number) {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ tick, 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  h = Math.imul(h ^ salt, 0x27d4eb2f) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  // Keep it strictly inside (0, 1) so Math.log never sees 0.
  return (h + 0.5) / 4294967296;
}

/** Standard normal sample for one tick, via Box–Muller. */
function normalAt(seed: number, tick: number) {
  const u1 = hashUniform(seed, tick, 1);
  const u2 = hashUniform(seed, tick, 2);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Cumulative log return after `tick` steps. Cached per coin so a long-running
 * event only walks the ticks it has not already walked.
 */
const cumulativeCache = new Map<string, { tick: number; sum: number }>();

function cumulativeLogReturn(coin: MemecoinLike, tick: number) {
  if (tick <= 0) return 0;

  const cached = cumulativeCache.get(coin.id);
  let from = 0;
  let sum = 0;

  if (cached && cached.tick <= tick) {
    from = cached.tick;
    sum = cached.sum;
  }

  const steps = tick - from;
  if (steps > MAX_TICKS) {
    // Too far behind to walk honestly; restart the walk from here.
    from = tick - MAX_TICKS;
    sum = 0;
  }

  for (let i = from + 1; i <= tick; i++) {
    sum += coin.drift + coin.volatility * normalAt(coin.seed, i);
  }

  cumulativeCache.set(coin.id, { tick, sum });
  return sum;
}

function clampPrice(coin: MemecoinLike, price: number) {
  const min = coin.minPrice > 0 ? coin.minPrice : 0.01;
  const capped = coin.maxPrice != null ? Math.min(price, coin.maxPrice) : price;
  return Math.max(min, capped);
}

/** Tick index the coin is on at `at` (defaults to now). */
export function getMemecoinTick(
  coin: MemecoinLike,
  tickSeconds: number,
  at: Date = new Date()
) {
  const genesis = new Date(coin.genesisAt).getTime();
  const elapsedMs = at.getTime() - genesis;
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
  return Math.floor(elapsedMs / (Math.max(tickSeconds, 1) * 1000));
}

/** Price of the coin at a given tick index. */
export function getMemecoinPriceAtTick(coin: MemecoinLike, tick: number) {
  if (tick <= 0) return clampPrice(coin, coin.basePrice);
  const price = coin.basePrice * Math.exp(cumulativeLogReturn(coin, tick));
  return clampPrice(coin, price);
}

/** Current price of the coin. */
export function getMemecoinPrice(
  coin: MemecoinLike,
  tickSeconds: number,
  at: Date = new Date()
) {
  return getMemecoinPriceAtTick(coin, getMemecoinTick(coin, tickSeconds, at));
}

export type MemecoinPricePoint = { tick: number; label: string; value: number };

/**
 * The last `points` ticks of price history, oldest first, for charting.
 * Derived from the same walk as the live price, so the chart never disagrees
 * with what a trade actually costs.
 */
export function getMemecoinHistory(
  coin: MemecoinLike,
  tickSeconds: number,
  points: number,
  at: Date = new Date()
): MemecoinPricePoint[] {
  const currentTick = getMemecoinTick(coin, tickSeconds, at);
  const start = Math.max(0, currentTick - points + 1);
  const genesis = new Date(coin.genesisAt).getTime();
  const history: MemecoinPricePoint[] = [];

  for (let tick = start; tick <= currentTick; tick++) {
    const timestamp = new Date(genesis + tick * tickSeconds * 1000);
    history.push({
      tick,
      label: timestamp.toISOString(),
      value: getMemecoinPriceAtTick(coin, tick),
    });
  }

  return history;
}

/** Percentage move over the last `lookback` ticks. */
export function getMemecoinChange(
  coin: MemecoinLike,
  tickSeconds: number,
  lookback: number,
  at: Date = new Date()
) {
  const currentTick = getMemecoinTick(coin, tickSeconds, at);
  const previousTick = Math.max(0, currentTick - lookback);
  const current = getMemecoinPriceAtTick(coin, currentTick);
  const previous = getMemecoinPriceAtTick(coin, previousTick);
  if (previous <= 0) return 0;
  return ((current - previous) / previous) * 100;
}

/** Seconds until the coin's next price move. */
export function getSecondsToNextTick(
  coin: MemecoinLike,
  tickSeconds: number,
  at: Date = new Date()
) {
  const genesis = new Date(coin.genesisAt).getTime();
  const interval = Math.max(tickSeconds, 1) * 1000;
  const elapsed = at.getTime() - genesis;
  if (elapsed <= 0) return Math.ceil((genesis - at.getTime()) / 1000);
  return Math.ceil((interval - (elapsed % interval)) / 1000);
}

const SYMBOL_PATTERN = /^[A-Z0-9]{2,10}$/;

export function normalizeMemecoinSymbol(raw: string) {
  const symbol = raw.trim().toUpperCase().replace(/^\$/, "");
  if (!SYMBOL_PATTERN.test(symbol)) {
    throw new Error("Symbol must be 2–10 letters or digits");
  }
  return symbol;
}

/** Random seed for a new coin. */
export function createMemecoinSeed() {
  return Math.floor(Math.random() * 2_147_483_647) + 1;
}

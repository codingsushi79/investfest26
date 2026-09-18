/**
 * Crypto prices move on their own. Nobody — not even the operator — can set
 * one: the price is a pure function of the coin's seed and how many ticks have
 * elapsed since its genesis, so every server and every request agrees on it
 * without a background job writing price rows.
 */

export type CryptoLike = {
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

/** splitmix32: one call fully avalanches its input. */
function mix(x: number) {
  x = (x + 0x9e3779b9) | 0;
  let t = x ^ (x >>> 16);
  t = Math.imul(t, 0x21f0aaad);
  t = t ^ (t >>> 15);
  t = Math.imul(t, 0x735a2d97);
  return (t ^ (t >>> 15)) >>> 0;
}

/**
 * Deterministic uniform in (0, 1) from a seed and a tick index.
 *
 * The salt is folded in through its own full mixing round rather than xor'd at
 * the end: Box-Muller needs its two uniforms to be independent, and salts that
 * only differ in the last step stay correlated enough to clip the upper tail --
 * which quietly biases every coin's price downward.
 */
function hashUniform(seed: number, tick: number, salt: number) {
  let h = mix(seed);
  h = mix(h + tick);
  h = mix(h + salt);
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

function cumulativeLogReturn(coin: CryptoLike, tick: number) {
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

  // The -sigma^2/2 term is what makes `drift` the coin's *actual* expected
  // return. Without it, a coin set to "flat" still climbs on average, because
  // the upside of a random walk compounds further than the downside does --
  // which is free money for anyone who just holds.
  const perTickDrift = coin.drift - (coin.volatility * coin.volatility) / 2;

  for (let i = from + 1; i <= tick; i++) {
    sum += perTickDrift + coin.volatility * normalAt(coin.seed, i);
  }

  cumulativeCache.set(coin.id, { tick, sum });
  return sum;
}

function clampPrice(coin: CryptoLike, price: number) {
  const min = coin.minPrice > 0 ? coin.minPrice : 0.01;
  const capped = coin.maxPrice != null ? Math.min(price, coin.maxPrice) : price;
  return Math.max(min, capped);
}

/** Tick index the coin is on at `at` (defaults to now). */
export function getCryptoTick(
  coin: CryptoLike,
  tickSeconds: number,
  at: Date = new Date()
) {
  const genesis = new Date(coin.genesisAt).getTime();
  const elapsedMs = at.getTime() - genesis;
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
  return Math.floor(elapsedMs / (Math.max(tickSeconds, 1) * 1000));
}

/** Price of the coin at a given tick index. */
export function getCryptoPriceAtTick(coin: CryptoLike, tick: number) {
  if (tick <= 0) return clampPrice(coin, coin.basePrice);
  const price = coin.basePrice * Math.exp(cumulativeLogReturn(coin, tick));
  return clampPrice(coin, price);
}

/** Current price of the coin. */
export function getCryptoPrice(
  coin: CryptoLike,
  tickSeconds: number,
  at: Date = new Date()
) {
  return getCryptoPriceAtTick(coin, getCryptoTick(coin, tickSeconds, at));
}

export type CryptoPricePoint = { tick: number; label: string; value: number };

/**
 * The last `points` ticks of price history, oldest first, for charting.
 * Derived from the same walk as the live price, so the chart never disagrees
 * with what a trade actually costs.
 */
export function getCryptoHistory(
  coin: CryptoLike,
  tickSeconds: number,
  points: number,
  at: Date = new Date()
): CryptoPricePoint[] {
  const currentTick = getCryptoTick(coin, tickSeconds, at);
  const start = Math.max(0, currentTick - points + 1);
  const genesis = new Date(coin.genesisAt).getTime();
  const history: CryptoPricePoint[] = [];

  for (let tick = start; tick <= currentTick; tick++) {
    const timestamp = new Date(genesis + tick * tickSeconds * 1000);
    history.push({
      tick,
      label: timestamp.toISOString(),
      value: getCryptoPriceAtTick(coin, tick),
    });
  }

  return history;
}

/** Percentage move over the last `lookback` ticks. */
export function getCryptoChange(
  coin: CryptoLike,
  tickSeconds: number,
  lookback: number,
  at: Date = new Date()
) {
  const currentTick = getCryptoTick(coin, tickSeconds, at);
  const previousTick = Math.max(0, currentTick - lookback);
  const current = getCryptoPriceAtTick(coin, currentTick);
  const previous = getCryptoPriceAtTick(coin, previousTick);
  if (previous <= 0) return 0;
  return ((current - previous) / previous) * 100;
}

/** Seconds until the coin's next price move. */
export function getSecondsToNextTick(
  coin: CryptoLike,
  tickSeconds: number,
  at: Date = new Date()
) {
  const genesis = new Date(coin.genesisAt).getTime();
  const interval = Math.max(tickSeconds, 1) * 1000;
  const elapsed = at.getTime() - genesis;
  if (elapsed <= 0) return Math.ceil((genesis - at.getTime()) / 1000);
  return Math.ceil((interval - (elapsed % interval)) / 1000);
}

/**
 * Per-tick drift is a log return: unreadable to a human, and catastrophic if
 * someone types a "reasonable looking" number like 1 (which is e^60 per hour
 * at 60s ticks). Operators pick a percent-per-hour trend instead, and these
 * convert between the two.
 */
export function driftFromPercentPerHour(percentPerHour: number, tickSeconds: number) {
  const ticksPerHour = 3600 / Math.max(tickSeconds, 1);
  return Math.log(1 + percentPerHour / 100) / ticksPerHour;
}

export function percentPerHourFromDrift(drift: number, tickSeconds: number) {
  const ticksPerHour = 3600 / Math.max(tickSeconds, 1);
  return (Math.exp(drift * ticksPerHour) - 1) * 100;
}

const SYMBOL_PATTERN = /^[A-Z0-9]{2,10}$/;

export function normalizeCryptoSymbol(raw: string) {
  const symbol = raw.trim().toUpperCase().replace(/^\$/, "");
  if (!SYMBOL_PATTERN.test(symbol)) {
    throw new Error("Symbol must be 2–10 letters or digits");
  }
  return symbol;
}

/** Random seed for a new coin. */
export function createCryptoSeed() {
  return Math.floor(Math.random() * 2_147_483_647) + 1;
}

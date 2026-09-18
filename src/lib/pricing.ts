export const BASELINE_SHARES = 100;
export const BASELINE_SHARE_PRICE = 100;
export const BASELINE_PERIOD = "Y0 Q4";

export function parsePeriod(label: string) {
  const match = label.match(/Y(\d+)\s+Q(\d+)/);
  if (!match) return { year: 0, quarter: 0 };
  return { year: parseInt(match[1], 10), quarter: parseInt(match[2], 10) };
}

export function comparePeriod(a: string, b: string) {
  const pa = parsePeriod(a);
  const pb = parsePeriod(b);
  if (pa.year !== pb.year) return pa.year - pb.year;
  return pa.quarter - pb.quarter;
}

export function getLatestPricePoint<T extends { label: string; value: number; companyValue?: number | null; sharesOutstanding?: number | null }>(
  prices: T[]
): T | undefined {
  if (prices.length === 0) return undefined;
  return [...prices].sort((a, b) => comparePeriod(a.label, b.label)).at(-1);
}

export function getNextTimePeriod(
  companyPrices: Array<{ label: string; value: number }>
) {
  const latest = getLatestPricePoint(companyPrices);
  if (!latest) return "Y1 Q1";

  const match = latest.label.match(/Y(\d+)\s+Q(\d+)/);
  if (!match) return "Y1 Q1";

  let year = parseInt(match[1], 10);
  let quarter = parseInt(match[2], 10);

  if (quarter < 4) {
    quarter += 1;
  } else {
    quarter = 1;
    year += 1;
  }

  if (year > 5) {
    year = 5;
    quarter = 4;
  }

  return `Y${year} Q${quarter}`;
}

export function isInBaselinePeriod(prices: Array<{ label: string }>) {
  const latest = getLatestPricePoint(
    prices as Array<{ label: string; value: number }>
  );
  return !latest || latest.label === BASELINE_PERIOD;
}

/** Share price from the latest period update. Frozen at $100 during Y0 Q4. */
export function getTradingSharePrice(
  prices: Array<{ label: string; value: number }>
) {
  const latest = getLatestPricePoint(prices);
  if (!latest || latest.label === BASELINE_PERIOD) {
    return BASELINE_SHARE_PRICE;
  }
  return latest.value;
}

/** Operator-set company value from the latest price point. */
export function getLatestCompanyValue(
  prices: Array<{
    label: string;
    value: number;
    companyValue?: number | null;
    sharesOutstanding?: number | null;
  }>
) {
  const latest = getLatestPricePoint(prices);
  if (!latest) return BASELINE_SHARES * BASELINE_SHARE_PRICE;

  if (latest.companyValue != null) {
    return latest.companyValue;
  }

  const shares =
    latest.sharesOutstanding ??
    (latest.label === BASELINE_PERIOD ? BASELINE_SHARES : 0);
  return latest.value * (shares || 1);
}

/**
 * Shares the operator's company value is divided by. Falls back to the
 * baseline count when nobody holds anything yet, so a price is always
 * settable rather than dividing by zero.
 */
export function getSharesForCompanyValue(
  prices: Array<{ label: string; sharesOutstanding?: number | null }>,
  actualOutstandingShares: number
) {
  if (isInBaselinePeriod(prices)) {
    return BASELINE_SHARES;
  }
  return actualOutstandingShares > 0 ? actualOutstandingShares : BASELINE_SHARES;
}

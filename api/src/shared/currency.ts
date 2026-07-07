import { Prisma } from '@prisma/client';

export type RateMap = Record<string, Prisma.Decimal | string | number>;

/**
 * Convert a local-currency amount to USD using a rate map, staying in
 * Decimal the whole way (never a JS float). Used for per-row display
 * normalization only — the analytics aggregation path normalizes in SQL.
 * Throws on an unknown currency rather than silently producing NaN.
 */
export function normalizeToUsd(
  amount: Prisma.Decimal,
  currency: string,
  rates: RateMap,
): Prisma.Decimal {
  const rate = rates[currency];
  if (rate === undefined) {
    throw new Error(`Unknown currency: ${currency}`);
  }
  return amount.mul(new Prisma.Decimal(rate));
}

/** Canonical 2-decimal money string for serialization over the API. */
export function formatMoneyString(value: Prisma.Decimal | string): string {
  return new Prisma.Decimal(value).toFixed(2);
}

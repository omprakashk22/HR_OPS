/**
 * Floor an amount into a fixed-width salary band for histogram display.
 * `bucketSalary(23500, 10000)` → `{ floor: 20000, label: '20k–30k' }`.
 */
export function bucketSalary(
  amount: number,
  bucketSize: number,
): { floor: number; label: string } {
  const floor = Math.floor(amount / bucketSize) * bucketSize;
  const label = `${floor / 1000}k–${(floor + bucketSize) / 1000}k`;
  return { floor, label };
}

/**
 * Percentage by which `comparison` sits below `base`, rounded to one
 * decimal place. Returns 0 when `base` is 0 (no division by zero).
 */
export function computeGapPercent(base: number, comparison: number): number {
  if (base === 0) return 0;
  return Math.round(((base - comparison) / base) * 100 * 10) / 10;
}

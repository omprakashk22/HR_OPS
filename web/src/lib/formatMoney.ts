/**
 * Format a money value (string from the API, or number) into a localized
 * currency string. Returns an em dash for null/empty/invalid input. Values
 * arrive as strings from the API and are only parsed here, at the UI edge.
 */
export function formatMoney(
  value: string | number | null | undefined,
  currency = 'USD',
): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/** Compact currency for large KPI figures, e.g. "$1.2M". */
export function formatMoneyCompact(value: string | number | null | undefined, currency = 'USD'): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(num);
}

import { describe, it, expect } from 'vitest';
import { formatMoney, formatMoneyCompact } from '../src/lib/formatMoney';

describe('formatMoney', () => {
  it('formats a USD string with grouping and 2 decimals', () => {
    expect(formatMoney('1234.5')).toBe('$1,234.50');
  });

  it('formats other currencies with their symbol', () => {
    expect(formatMoney('1000', 'INR')).toBe('₹1,000.00');
  });

  it('returns an em dash for empty, null, or invalid input', () => {
    expect(formatMoney('')).toBe('—');
    expect(formatMoney(null)).toBe('—');
    expect(formatMoney(undefined)).toBe('—');
    expect(formatMoney('not-a-number')).toBe('—');
  });
});

describe('formatMoneyCompact', () => {
  it('compacts large figures', () => {
    expect(formatMoneyCompact('1200000')).toBe('$1.2M');
  });

  it('returns an em dash for invalid input', () => {
    expect(formatMoneyCompact('')).toBe('—');
  });
});

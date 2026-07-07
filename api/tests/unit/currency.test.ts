import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { normalizeToUsd, formatMoneyString } from '../../src/shared/currency';

const rates = { USD: '1', INR: '0.012' };

describe('normalizeToUsd', () => {
  it('converts a local amount to USD exactly (no float drift)', () => {
    const usd = normalizeToUsd(new Prisma.Decimal('1000000'), 'INR', rates);
    expect(usd.toString()).toBe('12000');
  });

  it('is identity for USD', () => {
    expect(normalizeToUsd(new Prisma.Decimal('500.25'), 'USD', rates).toString()).toBe('500.25');
  });

  it('throws on an unknown currency', () => {
    expect(() => normalizeToUsd(new Prisma.Decimal('1'), 'XXX', rates)).toThrow();
  });
});

describe('formatMoneyString', () => {
  it('renders a canonical 2-decimal string', () => {
    expect(formatMoneyString('1234.5')).toBe('1234.50');
    expect(formatMoneyString(new Prisma.Decimal('0'))).toBe('0.00');
  });
});

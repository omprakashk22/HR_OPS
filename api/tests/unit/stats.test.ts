import { describe, it, expect } from 'vitest';
import { bucketSalary, computeGapPercent } from '../../src/shared/stats';

describe('bucketSalary', () => {
  it('floors an amount into its salary band', () => {
    expect(bucketSalary(23500, 10000)).toEqual({ floor: 20000, label: '20k–30k' });
  });

  it('handles exact band boundaries', () => {
    expect(bucketSalary(30000, 10000)).toEqual({ floor: 30000, label: '30k–40k' });
  });
});

describe('computeGapPercent', () => {
  it('computes the percentage gap of comparison below base', () => {
    expect(computeGapPercent(100, 94)).toBe(6);
  });

  it('rounds to one decimal place', () => {
    expect(computeGapPercent(100000, 95500)).toBe(4.5);
  });

  it('returns 0 when base is 0 (no division by zero)', () => {
    expect(computeGapPercent(0, 0)).toBe(0);
  });
});

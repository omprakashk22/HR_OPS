import { describe, it, expect } from 'vitest';
import {
  evaluateCondition,
  applicableLevels,
  nextSequence,
  firstSequence,
  canActOnLevel,
  LevelDef,
} from '../../src/approvals/engine';

const L = (sequence: number, condition: LevelDef['condition'] = null, extra: Partial<LevelDef> = {}): LevelDef => ({
  sequence,
  approverType: 'ROLE',
  approverRole: 'MANAGER',
  approverUserId: null,
  condition,
  ...extra,
});

describe('evaluateCondition', () => {
  const ctx = { amountUsd: '1500.00', category: 'Travel' }; // money is a STRING, as loadContext returns it

  it('null condition always applies', () => {
    expect(evaluateCondition(null, ctx)).toBe(true);
  });

  it('numeric gt coerces the Decimal-string operand', () => {
    expect(evaluateCondition({ field: 'amountUsd', op: 'gt', value: 1000 }, ctx)).toBe(true);
    expect(evaluateCondition({ field: 'amountUsd', op: 'gt', value: 2000 }, ctx)).toBe(false);
  });

  it('gte / lt / lte behave numerically on strings', () => {
    expect(evaluateCondition({ field: 'amountUsd', op: 'gte', value: 1500 }, ctx)).toBe(true);
    expect(evaluateCondition({ field: 'amountUsd', op: 'lte', value: 1500 }, ctx)).toBe(true);
    expect(evaluateCondition({ field: 'amountUsd', op: 'lt', value: 1500 }, ctx)).toBe(false);
  });

  it('eq / ne compare strings when non-numeric', () => {
    expect(evaluateCondition({ field: 'category', op: 'eq', value: 'Travel' }, ctx)).toBe(true);
    expect(evaluateCondition({ field: 'category', op: 'ne', value: 'Meals' }, ctx)).toBe(true);
  });

  it('missing field → false; non-numeric value for an ordering op → false', () => {
    expect(evaluateCondition({ field: 'nope', op: 'gt', value: 1 }, ctx)).toBe(false);
    expect(evaluateCondition({ field: 'category', op: 'gt', value: 1 }, ctx)).toBe(false); // "Travel" → NaN
  });
});

describe('applicableLevels / firstSequence / nextSequence', () => {
  const levels = [L(2, { field: 'amountUsd', op: 'gt', value: 1000 }), L(1, null)];

  it('filters out non-matching conditions and sorts by sequence', () => {
    expect(applicableLevels(levels, { amountUsd: '500.00' }).map((l) => l.sequence)).toEqual([1]);
    expect(applicableLevels(levels, { amountUsd: '1500.00' }).map((l) => l.sequence)).toEqual([1, 2]);
  });

  it('firstSequence returns the first applicable level (or null)', () => {
    expect(firstSequence(levels, { amountUsd: '500.00' })).toBe(1);
    expect(firstSequence([L(1, { field: 'amountUsd', op: 'gt', value: 9999 })], { amountUsd: '10.00' })).toBeNull();
  });

  it('nextSequence skips a non-applicable conditional level, includes it when it applies', () => {
    expect(nextSequence(levels, { amountUsd: '500.00' }, 1)).toBeNull();
    expect(nextSequence(levels, { amountUsd: '1500.00' }, 1)).toBe(2);
  });
});

describe('canActOnLevel', () => {
  it('ROLE level: any user with the role', () => {
    expect(canActOnLevel(L(1), { userId: 'u1', role: 'MANAGER' })).toBe(true);
    expect(canActOnLevel(L(1), { userId: 'u1', role: 'FINANCE' })).toBe(false);
  });

  it('USER level: only the named user', () => {
    const lvl = L(1, null, { approverType: 'USER', approverRole: null, approverUserId: 'u9' });
    expect(canActOnLevel(lvl, { userId: 'u9', role: 'EMPLOYEE' })).toBe(true);
    expect(canActOnLevel(lvl, { userId: 'u1', role: 'ADMIN' })).toBe(false);
  });
});

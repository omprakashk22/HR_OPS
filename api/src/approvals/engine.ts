// Pure approval-engine logic — no DB, no Prisma runtime. Unit-tested in
// isolation. All money in `context` arrives as Decimal-serialized strings
// (per the money invariant), so numeric conditions coerce explicitly.

export type ConditionOp = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';

export interface Condition {
  field: string;
  op: ConditionOp;
  value: string | number;
}

export interface LevelDef {
  sequence: number;
  approverType: 'ROLE' | 'USER';
  approverRole: string | null;
  approverUserId: string | null;
  condition: Condition | null;
}

const ORDERING: ConditionOp[] = ['gt', 'gte', 'lt', 'lte'];

/** Evaluate a level's condition against a context snapshot. Null → always true. */
export function evaluateCondition(condition: Condition | null, context: Record<string, unknown>): boolean {
  if (!condition) return true;
  if (!(condition.field in context)) return false;

  const raw = context[condition.field];

  if (ORDERING.includes(condition.op)) {
    const a = Number(raw);
    const b = Number(condition.value);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
    switch (condition.op) {
      case 'gt':
        return a > b;
      case 'gte':
        return a >= b;
      case 'lt':
        return a < b;
      case 'lte':
        return a <= b;
    }
  }

  // eq / ne: numeric compare when both coerce to finite numbers, else string.
  const an = Number(raw);
  const bn = Number(condition.value);
  if (Number.isFinite(an) && Number.isFinite(bn)) {
    return condition.op === 'eq' ? an === bn : an !== bn;
  }
  const as = String(raw);
  const bs = String(condition.value);
  return condition.op === 'eq' ? as === bs : as !== bs;
}

/** Levels whose condition matches the context, ordered by sequence. */
export function applicableLevels(levels: LevelDef[], context: Record<string, unknown>): LevelDef[] {
  return levels
    .filter((l) => evaluateCondition(l.condition, context))
    .sort((a, b) => a.sequence - b.sequence);
}

/** First applicable level's sequence, or null when none apply (auto-approve). */
export function firstSequence(levels: LevelDef[], context: Record<string, unknown>): number | null {
  const first = applicableLevels(levels, context)[0];
  return first ? first.sequence : null;
}

/** Next applicable level's sequence strictly after `afterSequence`, or null. */
export function nextSequence(
  levels: LevelDef[],
  context: Record<string, unknown>,
  afterSequence: number,
): number | null {
  const next = applicableLevels(levels, context).find((l) => l.sequence > afterSequence);
  return next ? next.sequence : null;
}

/** Whether an actor may act on a level (any-one-of for ROLE; exact for USER). */
export function canActOnLevel(level: LevelDef, actor: { userId: string; role: string }): boolean {
  return level.approverType === 'ROLE'
    ? level.approverRole === actor.role
    : level.approverUserId === actor.userId;
}

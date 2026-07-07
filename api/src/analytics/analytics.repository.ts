import { prisma } from '../db/prisma';
import { HttpError } from '../shared/httpError';

// Defined once, reused by every analytics query below. Picks exactly one row
// per active employee — their latest salary — joins the currency rate, and
// projects annual comp in USD. This is the single analytical building block.
const LATEST_SALARY_USD_CTE = `
WITH latest_salary_usd AS (
  SELECT DISTINCT ON (sh."employeeId")
    sh."employeeId",
    e.country,
    e.department,
    e.level,
    e.gender,
    (sh."baseSalary" + sh.bonus) * cr."rateToUsd" AS annual_usd
  FROM "SalaryHistory" sh
  JOIN "Employee" e ON e.id = sh."employeeId"
  JOIN "CurrencyRate" cr ON cr.code = sh.currency
  WHERE e.status = 'ACTIVE'
  ORDER BY sh."employeeId", sh."effectiveDate" DESC, sh."createdAt" DESC
)`;

// Whitelists: the only place these API params ever become SQL identifiers.
// Anything not in the map is rejected, so the interpolation below is safe.
const DISTRIBUTION_COLUMNS: Record<string, string> = {
  country: 'country',
  department: 'department',
  level: 'level',
};
const EQUITY_COLUMNS: Record<string, string> = {
  gender: 'gender',
  country: 'country',
  department: 'department',
  level: 'level',
};
const WITHIN_COLUMNS: Record<string, string> = {
  level: 'level',
  department: 'department',
  country: 'country',
};

function safeColumn(map: Record<string, string>, key: string, label: string): string {
  const col = map[key];
  if (!col) {
    throw new HttpError(400, `Invalid ${label}: ${key}`);
  }
  return col;
}

// All money is rounded and returned as a 2-dp text string (exact, no float
// coercion); counts are cast to int4 so they arrive as JS numbers.
const MEDIAN = 'round(coalesce(percentile_cont(0.5) WITHIN GROUP (ORDER BY annual_usd), 0)::numeric, 2)::text';
const P25 = 'round(coalesce(percentile_cont(0.25) WITHIN GROUP (ORDER BY annual_usd), 0)::numeric, 2)::text';
const P75 = 'round(coalesce(percentile_cont(0.75) WITHIN GROUP (ORDER BY annual_usd), 0)::numeric, 2)::text';

export interface SummaryRow {
  headcount: number;
  total_payroll_usd: string;
  median: string;
  p25: string;
  p75: string;
  min: string;
  max: string;
}

export async function summary(): Promise<SummaryRow> {
  const rows = await prisma.$queryRawUnsafe<SummaryRow[]>(`${LATEST_SALARY_USD_CTE}
    SELECT
      count(*)::int AS headcount,
      round(coalesce(sum(annual_usd), 0), 2)::text AS total_payroll_usd,
      ${MEDIAN} AS median,
      ${P25} AS p25,
      ${P75} AS p75,
      round(coalesce(min(annual_usd), 0), 2)::text AS min,
      round(coalesce(max(annual_usd), 0), 2)::text AS max
    FROM latest_salary_usd`);
  return rows[0];
}

export interface DistributionRow {
  group: string;
  headcount: number;
  median: string;
  p25: string;
  p75: string;
  total: string;
}

export function distribution(groupBy: string): Promise<DistributionRow[]> {
  const col = safeColumn(DISTRIBUTION_COLUMNS, groupBy, 'groupBy');
  return prisma.$queryRawUnsafe<DistributionRow[]>(`${LATEST_SALARY_USD_CTE}
    SELECT
      ${col} AS "group",
      count(*)::int AS headcount,
      ${MEDIAN} AS median,
      ${P25} AS p25,
      ${P75} AS p75,
      round(coalesce(sum(annual_usd), 0), 2)::text AS total
    FROM latest_salary_usd
    GROUP BY ${col}
    ORDER BY sum(annual_usd) DESC`);
}

export interface HistogramRow {
  floor: number;
  count: number;
}

export function histogram(bucketSize: number): Promise<HistogramRow[]> {
  return prisma.$queryRawUnsafe<HistogramRow[]>(`${LATEST_SALARY_USD_CTE}
    SELECT
      (floor(annual_usd / $1::numeric) * $1::numeric)::int AS floor,
      count(*)::int AS count
    FROM latest_salary_usd
    GROUP BY 1
    ORDER BY 1`, bucketSize);
}

export interface EquityRow {
  value: string;
  headcount: number;
  median: string;
}
export interface EquityBreakdownRow extends EquityRow {
  within: string;
}

export function equityOverall(dimension: string): Promise<EquityRow[]> {
  const col = safeColumn(EQUITY_COLUMNS, dimension, 'dimension');
  return prisma.$queryRawUnsafe<EquityRow[]>(`${LATEST_SALARY_USD_CTE}
    SELECT ${col} AS value, count(*)::int AS headcount, ${MEDIAN} AS median
    FROM latest_salary_usd
    GROUP BY ${col}
    ORDER BY ${col}`);
}

export function equityBreakdown(dimension: string, within: string): Promise<EquityBreakdownRow[]> {
  const dcol = safeColumn(EQUITY_COLUMNS, dimension, 'dimension');
  const wcol = safeColumn(WITHIN_COLUMNS, within, 'within');
  return prisma.$queryRawUnsafe<EquityBreakdownRow[]>(`${LATEST_SALARY_USD_CTE}
    SELECT ${wcol} AS within, ${dcol} AS value, count(*)::int AS headcount, ${MEDIAN} AS median
    FROM latest_salary_usd
    GROUP BY ${wcol}, ${dcol}
    ORDER BY ${wcol}, ${dcol}`);
}

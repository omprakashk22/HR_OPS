import * as repo from './analytics.repository';
import { EquityRow } from './analytics.repository';
import { computeGapPercent, bucketSalary } from '../shared/stats';

const DEFAULT_BUCKET_SIZE = 10000;

export async function getSummary() {
  const s = await repo.summary();
  return {
    headcount: s.headcount,
    totalPayrollUsd: s.total_payroll_usd,
    median: s.median,
    p25: s.p25,
    p75: s.p75,
    min: s.min,
    max: s.max,
  };
}

export async function getDistribution(groupBy: string) {
  const groups = await repo.distribution(groupBy);
  return { groupBy, groups };
}

export async function getHistogram(bucketSize: number) {
  const size = Number.isFinite(bucketSize) && bucketSize > 0 ? bucketSize : DEFAULT_BUCKET_SIZE;
  const rows = await repo.histogram(size);
  return {
    bucketSize: size,
    buckets: rows.map((r) => ({ floor: r.floor, label: bucketSalary(r.floor, size).label, count: r.count })),
  };
}

/** Headline gap: MALE vs FEMALE for a gender dimension, else max-vs-min group. */
function headlineGapPercent(dimension: string, overall: EquityRow[]): number {
  if (dimension === 'gender') {
    const male = overall.find((o) => o.value === 'MALE');
    const female = overall.find((o) => o.value === 'FEMALE');
    if (!male || !female) return 0;
    return computeGapPercent(Number(male.median), Number(female.median));
  }
  const medians = overall.map((o) => Number(o.median)).filter((n) => n > 0);
  if (medians.length < 2) return 0;
  return computeGapPercent(Math.max(...medians), Math.min(...medians));
}

export async function getEquity(dimension: string, within: string) {
  const [overall, breakdown] = await Promise.all([
    repo.equityOverall(dimension),
    repo.equityBreakdown(dimension, within),
  ]);
  return { dimension, within, headlineGapPercent: headlineGapPercent(dimension, overall), overall, breakdown };
}

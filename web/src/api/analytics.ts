import { apiFetch } from './client';

export interface Summary {
  headcount: number;
  totalPayrollUsd: string;
  median: string;
  p25: string;
  p75: string;
  min: string;
  max: string;
}

export interface DistributionGroup {
  group: string;
  headcount: number;
  median: string;
  p25: string;
  p75: string;
  total: string;
}
export interface DistributionResponse {
  groupBy: string;
  groups: DistributionGroup[];
}

export interface HistogramBucket {
  floor: number;
  label: string;
  count: number;
}
export interface HistogramResponse {
  bucketSize: number;
  buckets: HistogramBucket[];
}

export interface EquityRow {
  value: string;
  headcount: number;
  median: string;
}
export interface EquityBreakdownRow extends EquityRow {
  within: string;
}
export interface EquityResponse {
  dimension: string;
  within: string;
  headlineGapPercent: number;
  overall: EquityRow[];
  breakdown: EquityBreakdownRow[];
}

export function getSummary(): Promise<Summary> {
  return apiFetch('/analytics/summary');
}
export function getDistribution(groupBy: string): Promise<DistributionResponse> {
  return apiFetch(`/analytics/distribution?groupBy=${groupBy}`);
}
export function getHistogram(bucketSize = 20000): Promise<HistogramResponse> {
  return apiFetch(`/analytics/histogram?bucketSize=${bucketSize}`);
}
export function getEquity(dimension = 'gender', within = 'level'): Promise<EquityResponse> {
  return apiFetch(`/analytics/equity?dimension=${dimension}&within=${within}`);
}

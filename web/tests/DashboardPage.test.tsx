import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import DashboardPage from '../src/pages/DashboardPage';
import { renderWithProviders, fakeResponse } from './test-utils';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const summary = {
  headcount: 10000,
  totalPayrollUsd: '932327662.69',
  median: '78772.14',
  p25: '52897.18',
  p75: '118875.51',
  min: '15689.72',
  max: '324353.20',
};
const distribution = {
  groupBy: 'country',
  groups: [
    { group: 'US', headcount: 3003, median: '105116.07', p25: '80000.00', p75: '140000.00', total: '371233227.61' },
    { group: 'IN', headcount: 2522, median: '37280.41', p25: '25000.00', p75: '55000.00', total: '109590145.17' },
  ],
};
const histogram = {
  bucketSize: 20000,
  buckets: [
    { floor: 40000, label: '40k–60k', count: 2000 },
    { floor: 60000, label: '60k–80k', count: 3000 },
  ],
};
const equity = {
  dimension: 'gender',
  within: 'level',
  headlineGapPercent: 5.8,
  overall: [
    { value: 'FEMALE', headcount: 4800, median: '74000.00' },
    { value: 'MALE', headcount: 4800, median: '78500.00' },
  ],
  breakdown: [],
};

describe('DashboardPage', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    localStorage.clear();
    mockFetch.mockImplementation((url: string) => {
      const u = String(url);
      if (u.includes('/analytics/summary')) return Promise.resolve(fakeResponse(200, summary));
      if (u.includes('/analytics/distribution')) return Promise.resolve(fakeResponse(200, distribution));
      if (u.includes('/analytics/histogram')) return Promise.resolve(fakeResponse(200, histogram));
      if (u.includes('/analytics/equity')) return Promise.resolve(fakeResponse(200, equity));
      return Promise.resolve(fakeResponse(404, { error: 'not found' }));
    });
  });

  it('renders KPI tiles from the summary endpoint', async () => {
    renderWithProviders(<DashboardPage />);
    expect(await screen.findByText('10,000')).toBeInTheDocument(); // headcount
    expect(screen.getByText('$78,772.14')).toBeInTheDocument(); // median
  });

  it('renders the headline gender pay gap', async () => {
    renderWithProviders(<DashboardPage />);
    expect(await screen.findByText('5.8%')).toBeInTheDocument();
  });
});

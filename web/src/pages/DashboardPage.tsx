import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSummary, getDistribution, getHistogram, getEquity } from '../api/analytics';
import { KpiTile } from '../components/KpiTile';
import { DistributionChart } from '../components/DistributionChart';
import { HistogramChart } from '../components/HistogramChart';
import { EquityGapCard } from '../components/EquityGapCard';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select } from '../components/ui/select';
import { formatMoney, formatMoneyCompact } from '../lib/formatMoney';

export default function DashboardPage() {
  const [groupBy, setGroupBy] = useState('country');

  const summary = useQuery({ queryKey: ['summary'], queryFn: getSummary });
  const distribution = useQuery({
    queryKey: ['distribution', groupBy],
    queryFn: () => getDistribution(groupBy),
  });
  const histogram = useQuery({ queryKey: ['histogram'], queryFn: () => getHistogram(20000) });
  const equity = useQuery({ queryKey: ['equity'], queryFn: () => getEquity('gender', 'level') });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      {summary.isError ? (
        <p className="text-red-600">Failed to load analytics.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiTile label="Headcount" value={summary.data ? summary.data.headcount.toLocaleString() : '—'} />
          <KpiTile
            label="Total payroll (USD)"
            value={summary.data ? formatMoneyCompact(summary.data.totalPayrollUsd) : '—'}
            sub={summary.data ? formatMoney(summary.data.totalPayrollUsd) : undefined}
          />
          <KpiTile
            label="Median salary (USD)"
            value={summary.data ? formatMoney(summary.data.median) : '—'}
            sub={summary.data ? `p25 ${formatMoney(summary.data.p25)} · p75 ${formatMoney(summary.data.p75)}` : undefined}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Median salary by dimension</CardTitle>
            <Select
              aria-label="Group distribution by"
              className="h-8 w-40"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
            >
              <option value="country">Country</option>
              <option value="department">Department</option>
              <option value="level">Level</option>
            </Select>
          </CardHeader>
          <CardContent>
            {distribution.data ? (
              <DistributionChart groups={distribution.data.groups} />
            ) : (
              <p className="text-slate-400">Loading…</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Salary distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {histogram.data ? (
              <HistogramChart buckets={histogram.data.buckets} />
            ) : (
              <p className="text-slate-400">Loading…</p>
            )}
          </CardContent>
        </Card>
      </div>

      {equity.data && <EquityGapCard equity={equity.data} />}
    </div>
  );
}

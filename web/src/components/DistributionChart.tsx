import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { DistributionGroup } from '../api/analytics';

export function DistributionChart({ groups }: { groups: DistributionGroup[] }) {
  const data = groups.map((g) => ({
    name: g.group,
    median: Number(g.median),
    headcount: g.headcount,
  }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" fontSize={12} />
        <YAxis fontSize={12} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
        <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
        <Bar dataKey="median" fill="#334155" name="Median USD" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

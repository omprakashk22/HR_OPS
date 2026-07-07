import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { HistogramBucket } from '../api/analytics';

export function HistogramChart({ buckets }: { buckets: HistogramBucket[] }) {
  const data = buckets.map((b) => ({ name: b.label, count: b.count }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" fontSize={11} interval={0} angle={-30} textAnchor="end" height={50} />
        <YAxis fontSize={12} />
        <Tooltip />
        <Bar dataKey="count" fill="#0ea5e9" name="Employees" radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

import { EquityResponse } from '../api/analytics';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { formatMoney } from '../lib/formatMoney';

export function EquityGapCard({ equity }: { equity: EquityResponse }) {
  const male = equity.overall.find((o) => o.value === 'MALE');
  const female = equity.overall.find((o) => o.value === 'FEMALE');
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gender pay gap (median, USD)</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold text-slate-900">{equity.headlineGapPercent}%</p>
        <p className="text-sm text-slate-500">median gap, male vs. female</p>
        <div className="mt-4 space-y-1 text-sm">
          {male && (
            <div className="flex justify-between">
              <span className="text-slate-500">Male median</span>
              <span>{formatMoney(male.median)}</span>
            </div>
          )}
          {female && (
            <div className="flex justify-between">
              <span className="text-slate-500">Female median</span>
              <span>{formatMoney(female.median)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

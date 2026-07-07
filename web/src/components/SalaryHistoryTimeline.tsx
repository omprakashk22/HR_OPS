import { SalaryDto } from '../api/employees';
import { formatMoney } from '../lib/formatMoney';

/** Renders salary history newest-first (the API returns it oldest-first). */
export function SalaryHistoryTimeline({ history }: { history: SalaryDto[] }) {
  if (history.length === 0) {
    return <p className="text-sm text-slate-400">No salary history.</p>;
  }
  const entries = [...history].reverse();
  return (
    <ol className="relative space-y-4 border-l border-slate-200 pl-4">
      {entries.map((s) => (
        <li key={s.id} className="relative">
          <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-slate-300" />
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-800">{s.reason}</span>
            <span className="text-sm text-slate-500">
              {new Date(s.effectiveDate).toLocaleDateString()}
            </span>
          </div>
          <div className="text-sm text-slate-600">
            {formatMoney(s.baseSalary, s.currency)} base
            {Number(s.bonus) > 0 && <> + {formatMoney(s.bonus, s.currency)} bonus</>}
            <span className="text-slate-400"> · {formatMoney(s.annualUsd)} USD</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

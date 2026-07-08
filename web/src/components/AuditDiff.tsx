import { AuditEntry } from '../api/audit';
import { cn } from '../lib/utils';

function fmt(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** Field-by-field old→new comparison; changed cells are red (old) / green (new). */
export function AuditDiff({ entry }: { entry: AuditEntry }) {
  const before = (entry.before ?? {}) as Record<string, unknown>;
  const after = (entry.after ?? {}) as Record<string, unknown>;
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort();

  return (
    <div className="max-h-[60vh] overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="text-left text-slate-500">
          <tr>
            <th className="px-2 py-1">Field</th>
            <th className="px-2 py-1">Old</th>
            <th className="px-2 py-1">New</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => {
            const oldV = before[key];
            const newV = after[key];
            const changed = fmt(oldV) !== fmt(newV);
            return (
              <tr key={key} className="border-t border-slate-100 align-top">
                <td className="px-2 py-1 font-medium text-slate-700">{key}</td>
                <td
                  className={cn('px-2 py-1 font-mono text-xs break-all', changed && oldV !== undefined && 'bg-red-100 text-red-800')}
                >
                  {fmt(oldV)}
                </td>
                <td
                  className={cn('px-2 py-1 font-mono text-xs break-all', changed && newV !== undefined && 'bg-green-100 text-green-800')}
                >
                  {fmt(newV)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

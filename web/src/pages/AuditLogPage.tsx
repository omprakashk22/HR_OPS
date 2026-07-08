import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listAudit } from '../api/audit';
import { Card, CardContent } from '../components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Select } from '../components/ui/select';

const MODELS = [
  '',
  'Employee',
  'SalaryHistory',
  'Reimbursement',
  'ApprovalWorkflow',
  'ApprovalLevel',
  'ApprovalRequest',
  'ApprovalAction',
  'User',
];

const actionVariant: Record<string, 'default' | 'success' | 'muted'> = {
  CREATE: 'success',
  UPDATE: 'default',
  DELETE: 'muted',
};

export default function AuditLogPage() {
  const [model, setModel] = useState('');
  const { data } = useQuery({ queryKey: ['audit', model], queryFn: () => listAudit({ model: model || undefined }) });
  const rows = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Audit log</h1>
        <Select aria-label="Filter by table" className="w-56" value={model} onChange={(e) => setModel(e.target.value)}>
          <option value="">All tables</option>
          {MODELS.filter(Boolean).map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>When</TH>
                <TH>Table</TH>
                <TH>Record</TH>
                <TH>Action</TH>
                <TH>Actor</TH>
              </TR>
            </THead>
            <TBody>
              {rows.length === 0 ? (
                <TR>
                  <TD className="py-6 text-center text-slate-400" colSpan={5}>
                    No audit entries.
                  </TD>
                </TR>
              ) : (
                rows.map((a) => (
                  <TR key={a.id}>
                    <TD className="whitespace-nowrap">{new Date(a.createdAt).toLocaleString()}</TD>
                    <TD>{a.model}</TD>
                    <TD className="font-mono text-xs">{a.recordId.slice(0, 8)}…</TD>
                    <TD>
                      <Badge variant={actionVariant[a.action] ?? 'default'}>{a.action}</Badge>
                    </TD>
                    <TD className="font-mono text-xs">{a.actorUserId ? `${a.actorUserId.slice(0, 8)}…` : 'system'}</TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

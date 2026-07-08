import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listReimbursements } from '../api/reimbursements';
import { ReimbursementForm } from '../components/ReimbursementForm';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { formatMoney } from '../lib/formatMoney';

const statusVariant: Record<string, 'default' | 'success' | 'muted'> = {
  PAYABLE: 'success',
  PENDING: 'default',
  REJECTED: 'muted',
  DRAFT: 'muted',
};

export default function ReimbursementsPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['reimbursements', 'mine'], queryFn: () => listReimbursements('mine') });
  const rows = data?.data ?? [];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>New reimbursement</CardTitle>
        </CardHeader>
        <CardContent>
          <ReimbursementForm
            onCreated={() => queryClient.invalidateQueries({ queryKey: ['reimbursements'] })}
          />
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>My reimbursements</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>Amount</TH>
                <TH>Category</TH>
                <TH>Note</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {rows.length === 0 ? (
                <TR>
                  <TD className="py-6 text-center text-slate-400" colSpan={4}>
                    No reimbursements yet.
                  </TD>
                </TR>
              ) : (
                rows.map((r) => (
                  <TR key={r.id}>
                    <TD>{formatMoney(r.amount, r.currency)}</TD>
                    <TD>{r.category}</TD>
                    <TD>{r.note}</TD>
                    <TD>
                      <Badge variant={statusVariant[r.status] ?? 'default'}>{r.status}</Badge>
                    </TD>
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

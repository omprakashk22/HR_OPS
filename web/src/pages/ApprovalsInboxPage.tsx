import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listRequests } from '../api/approvals';
import { RequestDetail } from '../components/RequestDetail';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { cn } from '../lib/utils';

type Box = 'inbox' | 'mine';

export default function ApprovalsInboxPage() {
  const queryClient = useQueryClient();
  const [box, setBox] = useState<Box>('inbox');
  const [selected, setSelected] = useState<string | null>(null);

  const { data } = useQuery({ queryKey: ['requests', box], queryFn: () => listRequests(box) });
  const rows = data?.data ?? [];

  const onChanged = () => {
    queryClient.invalidateQueries({ queryKey: ['requests'] });
    if (selected) queryClient.invalidateQueries({ queryKey: ['request', selected] });
  };

  const tab = (value: Box, label: string) => (
    <button
      onClick={() => {
        setBox(value);
        setSelected(null);
      }}
      className={cn(
        'border-b-2 px-3 py-2 text-sm',
        box === value ? 'border-slate-900 font-medium text-slate-900' : 'border-transparent text-slate-500',
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Approvals</h1>
      <div className="flex gap-2 border-b border-slate-200">
        {tab('inbox', 'Awaiting me')}
        {tab('mine', 'Submitted by me')}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          {rows.length === 0 ? (
            <p className="text-slate-400">Nothing here.</p>
          ) : (
            rows.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r.id)}
                className={cn(
                  'flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm',
                  selected === r.id ? 'border-slate-400 bg-slate-50' : 'border-slate-200 hover:bg-slate-50',
                )}
              >
                <span>
                  {r.entityType}
                  {r.context?.amountUsd ? ` · $${String(r.context.amountUsd)}` : ''}
                </span>
                <Badge variant={r.status === 'PENDING' ? 'default' : 'muted'}>{r.status}</Badge>
              </button>
            ))
          )}
        </div>

        <Card>
          <CardContent>
            {selected ? (
              <RequestDetail requestId={selected} onChanged={onChanged} />
            ) : (
              <p className="text-slate-400">Select a request to review.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

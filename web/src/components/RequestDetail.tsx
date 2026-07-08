import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getRequest, decide, resubmit } from '../api/approvals';
import { ApiError } from '../api/client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';

const statusVariant: Record<string, 'default' | 'success' | 'muted'> = {
  APPROVED: 'success',
  PAYABLE: 'success',
  PENDING: 'default',
  REJECTED: 'muted',
  SENT_BACK: 'muted',
};

export function RequestDetail({ requestId, onChanged }: { requestId: string; onChanged: () => void }) {
  const { data: req, isLoading } = useQuery({ queryKey: ['request', requestId], queryFn: () => getRequest(requestId) });
  const [comment, setComment] = useState('');

  const decideMut = useMutation({
    mutationFn: (d: 'APPROVED' | 'REJECTED') => decide(requestId, d, comment || undefined),
    onSuccess: () => {
      setComment('');
      onChanged();
    },
  });
  const resubmitMut = useMutation({ mutationFn: () => resubmit(requestId), onSuccess: onChanged });

  if (isLoading || !req) return <p className="text-slate-500">Loading…</p>;

  const mutation = decideMut.isError ? decideMut : resubmitMut;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">{req.entityType}</h3>
        <Badge variant={statusVariant[req.status] ?? 'default'}>{req.status}</Badge>
      </div>

      <div>
        <p className="mb-1 text-xs font-medium uppercase text-slate-400">Details</p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {Object.entries(req.context).map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <dt className="text-slate-500">{k}</dt>
              <dd>{String(v)}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div>
        <p className="mb-1 text-xs font-medium uppercase text-slate-400">Levels</p>
        <ol className="space-y-1 text-sm">
          {(req.workflow?.levels ?? []).map((l) => (
            <li key={l.sequence} className="flex justify-between">
              <span>
                {l.sequence}. {l.name} ({l.approverType === 'ROLE' ? l.approverRole : 'specific user'})
              </span>
              {req.status === 'PENDING' && l.sequence === req.currentSequence && (
                <Badge>current</Badge>
              )}
            </li>
          ))}
        </ol>
      </div>

      {req.actions && req.actions.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase text-slate-400">History</p>
          <ul className="space-y-1 text-sm text-slate-600">
            {req.actions.map((a) => (
              <li key={a.id}>
                L{a.levelSequence}: <strong>{a.decision}</strong>
                {a.comment ? ` — ${a.comment}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {req.status === 'PENDING' && (
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <Label htmlFor="comment">Comment (optional)</Label>
          <Input id="comment" value={comment} onChange={(e) => setComment(e.target.value)} />
          <div className="flex gap-2">
            <Button onClick={() => decideMut.mutate('APPROVED')} disabled={decideMut.isPending}>
              Approve
            </Button>
            <Button variant="danger" onClick={() => decideMut.mutate('REJECTED')} disabled={decideMut.isPending}>
              Reject
            </Button>
          </div>
        </div>
      )}

      {req.status === 'SENT_BACK' && (
        <div className="border-t border-slate-100 pt-3">
          <Button onClick={() => resubmitMut.mutate()} disabled={resubmitMut.isPending}>
            Resubmit
          </Button>
        </div>
      )}

      {mutation.isError && (
        <p role="alert" className="text-sm text-red-600">
          {mutation.error instanceof ApiError ? mutation.error.message : 'Action failed'}
        </p>
      )}
    </div>
  );
}

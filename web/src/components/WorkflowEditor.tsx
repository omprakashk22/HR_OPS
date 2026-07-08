import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Workflow, Level, Condition, createWorkflow, updateWorkflow, replaceLevels } from '../api/approvals';
import { ApiError } from '../api/client';
import { ROLES, ENTITY_TYPES, CONDITION_OPS } from '../lib/constants';
import { UserPicker } from './UserPicker';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';

function emptyLevel(n: number): Level {
  return { name: `Level ${n}`, approverType: 'ROLE', approverRole: 'MANAGER', approverUserId: null, condition: null };
}

function cleanLevel(l: Level): Level {
  return {
    name: l.name,
    approverType: l.approverType,
    approverRole: l.approverType === 'ROLE' ? l.approverRole ?? 'MANAGER' : null,
    approverUserId: l.approverType === 'USER' ? l.approverUserId ?? '' : null,
    condition: l.condition ?? null,
  };
}

export function WorkflowEditor({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: Workflow;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [entityType, setEntityType] = useState(initial?.entityType ?? 'Reimbursement');
  const [onReject, setOnReject] = useState<'TERMINATE' | 'SEND_BACK'>(initial?.onReject ?? 'TERMINATE');
  const [isActive, setIsActive] = useState(initial?.isActive ?? false);
  const [levels, setLevels] = useState<Level[]>(initial?.levels ?? []);

  const setLevel = (i: number, patch: Partial<Level>) =>
    setLevels((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const move = (i: number, dir: -1 | 1) =>
    setLevels((ls) => {
      const j = i + dir;
      if (j < 0 || j >= ls.length) return ls;
      const copy = [...ls];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  const save = useMutation({
    mutationFn: async () => {
      const cleaned = levels.map(cleanLevel);
      if (initial) {
        await updateWorkflow(initial.id, { name, onReject, isActive });
        await replaceLevels(initial.id, cleaned);
      } else {
        await createWorkflow({ name, entityType, onReject, isActive, levels: cleaned });
      }
    },
    onSuccess: onSaved,
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="wf-name">Name</Label>
          <Input id="wf-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="wf-entity">Entity type</Label>
          <Select id="wf-entity" value={entityType} onChange={(e) => setEntityType(e.target.value)} disabled={!!initial}>
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="wf-reject">On reject</Label>
          <Select id="wf-reject" value={onReject} onChange={(e) => setOnReject(e.target.value as 'TERMINATE' | 'SEND_BACK')}>
            <option value="TERMINATE">Terminate</option>
            <option value="SEND_BACK">Send back</option>
          </Select>
        </div>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">Levels</p>
          <Button size="sm" variant="outline" onClick={() => setLevels((ls) => [...ls, emptyLevel(ls.length + 1)])}>
            Add level
          </Button>
        </div>
        <div className="space-y-3">
          {levels.map((l, i) => (
            <div key={i} className="rounded-md border border-slate-200 p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs text-slate-400">#{i + 1}</span>
                <Input aria-label={`Level ${i + 1} name`} value={l.name} onChange={(e) => setLevel(i, { name: e.target.value })} />
                <Button size="sm" variant="ghost" onClick={() => move(i, -1)} aria-label="Move up">↑</Button>
                <Button size="sm" variant="ghost" onClick={() => move(i, 1)} aria-label="Move down">↓</Button>
                <Button size="sm" variant="ghost" onClick={() => setLevels((ls) => ls.filter((_, idx) => idx !== i))} aria-label="Remove">✕</Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Select aria-label={`Level ${i + 1} approver type`} value={l.approverType} onChange={(e) => setLevel(i, { approverType: e.target.value as 'ROLE' | 'USER' })}>
                  <option value="ROLE">By role</option>
                  <option value="USER">By user</option>
                </Select>
                {l.approverType === 'ROLE' ? (
                  <Select aria-label={`Level ${i + 1} role`} value={l.approverRole ?? 'MANAGER'} onChange={(e) => setLevel(i, { approverRole: e.target.value })}>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <UserPicker
                    value={l.approverUserId}
                    onChange={(id) => setLevel(i, { approverUserId: id })}
                    ariaPrefix={`Level ${i + 1}`}
                  />
                )}
              </div>
              <label className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={!!l.condition}
                  onChange={(e) => setLevel(i, { condition: e.target.checked ? { field: 'amountUsd', op: 'gt', value: 1000 } : null })}
                />
                Conditional
              </label>
              {l.condition && (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <Input aria-label={`Level ${i + 1} field`} value={l.condition.field} onChange={(e) => setLevel(i, { condition: { ...l.condition!, field: e.target.value } })} />
                  <Select aria-label={`Level ${i + 1} op`} value={l.condition.op} onChange={(e) => setLevel(i, { condition: { ...l.condition!, op: e.target.value as Condition['op'] } })}>
                    {CONDITION_OPS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                  <Input aria-label={`Level ${i + 1} value`} value={String(l.condition.value)} onChange={(e) => setLevel(i, { condition: { ...l.condition!, value: e.target.value } })} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {save.isError && (
        <p role="alert" className="text-sm text-red-600">
          {save.error instanceof ApiError ? save.error.message : 'Failed to save workflow'}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save workflow'}
        </Button>
      </div>
    </div>
  );
}

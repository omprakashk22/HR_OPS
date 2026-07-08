import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listWorkflows, Workflow } from '../api/approvals';
import { WorkflowEditor } from '../components/WorkflowEditor';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

export default function WorkflowConfigPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['workflows'], queryFn: listWorkflows });
  const [editing, setEditing] = useState<Workflow | 'new' | null>(null);

  const onSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['workflows'] });
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Approval workflows</h1>
        {!editing && <Button onClick={() => setEditing('new')}>New workflow</Button>}
      </div>

      {editing ? (
        <Card>
          <CardContent>
            <WorkflowEditor
              initial={editing === 'new' ? undefined : editing}
              onSaved={onSaved}
              onCancel={() => setEditing(null)}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(data?.data ?? []).length === 0 ? (
            <p className="text-slate-400">No workflows yet.</p>
          ) : (
            data!.data.map((wf) => (
              <button
                key={wf.id}
                onClick={() => setEditing(wf)}
                className="flex w-full items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <span>
                  <span className="font-medium">{wf.name}</span>
                  <span className="text-slate-500"> · {wf.entityType} · {wf.levels.length} level(s)</span>
                </span>
                <Badge variant={wf.isActive ? 'success' : 'muted'}>{wf.isActive ? 'active' : 'inactive'}</Badge>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

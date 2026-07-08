import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { listWorkflows, deleteWorkflow, Workflow } from '../api/approvals';
import { ApiError } from '../api/client';
import { WorkflowEditor } from '../components/WorkflowEditor';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

export default function WorkflowConfigPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['workflows'], queryFn: listWorkflows });
  const [editing, setEditing] = useState<Workflow | 'new' | null>(null);
  const [error, setError] = useState('');

  const onSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['workflows'] });
    setEditing(null);
  };

  const del = useMutation({
    mutationFn: (id: string) => deleteWorkflow(id),
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Failed to delete workflow'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Approval workflows</h1>
        {!editing && <Button onClick={() => setEditing('new')}>New workflow</Button>}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

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
              <div
                key={wf.id}
                className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                <button onClick={() => setEditing(wf)} className="flex-1 text-left hover:underline">
                  <span className="font-medium">{wf.name}</span>
                  <span className="text-slate-500"> · {wf.entityType} · {wf.levels.length} level(s)</span>
                </button>
                <div className="flex items-center gap-3">
                  <Badge variant={wf.isActive ? 'success' : 'muted'}>{wf.isActive ? 'active' : 'inactive'}</Badge>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      if (window.confirm(`Delete workflow "${wf.name}"?`)) del.mutate(wf.id);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

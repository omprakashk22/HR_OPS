import { apiFetch } from './client';

export interface Condition {
  field: string;
  op: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
  value: string | number;
}

export interface Level {
  id?: string;
  sequence?: number;
  name: string;
  approverType: 'ROLE' | 'USER';
  approverRole?: string | null;
  approverUserId?: string | null;
  condition?: Condition | null;
}

export interface Workflow {
  id: string;
  name: string;
  entityType: string;
  isActive: boolean;
  onReject: 'TERMINATE' | 'SEND_BACK';
  levels: Level[];
}

export interface ApprovalActionRow {
  id: string;
  levelSequence: number;
  actorUserId: string;
  decision: string;
  comment?: string | null;
  createdAt: string;
}

export interface ApprovalRequest {
  id: string;
  entityType: string;
  entityId: string;
  context: Record<string, unknown>;
  status: string;
  currentSequence: number;
  submittedBy: string;
  createdAt: string;
  actions?: ApprovalActionRow[];
  workflow?: Workflow;
}

export interface WorkflowInput {
  name: string;
  entityType: string;
  onReject: 'TERMINATE' | 'SEND_BACK';
  isActive: boolean;
  levels: Level[];
}

export interface UserOption {
  id: string;
  email: string;
  name: string;
  role: string;
}

export function listUsers(search?: string): Promise<{ data: UserOption[] }> {
  const q = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiFetch(`/approvals/users${q}`);
}

export function listWorkflows(): Promise<{ data: Workflow[] }> {
  return apiFetch('/approvals/workflows');
}
export function getWorkflow(id: string): Promise<Workflow> {
  return apiFetch(`/approvals/workflows/${id}`);
}
export function createWorkflow(body: WorkflowInput): Promise<Workflow> {
  return apiFetch('/approvals/workflows', { method: 'POST', body: JSON.stringify(body) });
}
export function updateWorkflow(id: string, patch: Partial<Pick<WorkflowInput, 'name' | 'onReject' | 'isActive'>>): Promise<Workflow> {
  return apiFetch(`/approvals/workflows/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
}
export function replaceLevels(id: string, levels: Level[]): Promise<Workflow> {
  return apiFetch(`/approvals/workflows/${id}/levels`, { method: 'PUT', body: JSON.stringify({ levels }) });
}

export function listRequests(box: 'inbox' | 'mine'): Promise<{ data: ApprovalRequest[] }> {
  return apiFetch(`/approvals/requests?box=${box}`);
}
export function getRequest(id: string): Promise<ApprovalRequest> {
  return apiFetch(`/approvals/requests/${id}`);
}
export function decide(id: string, decision: 'APPROVED' | 'REJECTED', comment?: string): Promise<ApprovalRequest> {
  return apiFetch(`/approvals/requests/${id}/decision`, {
    method: 'POST',
    body: JSON.stringify({ decision, comment }),
  });
}
export function resubmit(id: string): Promise<ApprovalRequest> {
  return apiFetch(`/approvals/requests/${id}/resubmit`, { method: 'POST' });
}

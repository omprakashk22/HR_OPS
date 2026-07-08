import { apiFetch } from './client';

export interface AuditEntry {
  id: string;
  model: string;
  recordId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  actorUserId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditResponse {
  data: AuditEntry[];
  page: number;
  pageSize: number;
  total: number;
}

export function listAudit(params: { model?: string; recordId?: string; page?: number } = {}): Promise<AuditResponse> {
  const q = new URLSearchParams();
  if (params.model) q.set('model', params.model);
  if (params.recordId) q.set('recordId', params.recordId);
  if (params.page) q.set('page', String(params.page));
  const qs = q.toString();
  return apiFetch(`/audit${qs ? `?${qs}` : ''}`);
}

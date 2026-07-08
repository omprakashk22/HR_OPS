import { apiFetch } from './client';

export interface Reimbursement {
  id: string;
  employeeId: string;
  amount: string;
  currency: string;
  category: string;
  note: string;
  status: string;
  submittedBy: string;
  createdAt: string;
}

export interface CreateReimbursementPayload {
  employeeId?: string;
  amount: string;
  currency: string;
  category: string;
  note: string;
}

export function listReimbursements(box: 'mine' | 'all'): Promise<{ data: Reimbursement[] }> {
  return apiFetch(`/reimbursements?box=${box}`);
}

export function createReimbursement(payload: CreateReimbursementPayload): Promise<Reimbursement> {
  return apiFetch('/reimbursements', { method: 'POST', body: JSON.stringify(payload) });
}

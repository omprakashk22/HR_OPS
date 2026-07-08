import { Reimbursement } from '@prisma/client';
import * as repo from './reimbursement.repository';
import * as approvalService from '../approvals/approval.service';
import { HttpError } from '../shared/httpError';
import { formatMoneyString } from '../shared/currency';
import { CreateReimbursementInput } from './reimbursement.schemas';

export interface ReimbursementActor {
  userId: string;
  role: string;
}

export interface ReimbursementDto {
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

function toDto(r: Reimbursement): ReimbursementDto {
  return {
    id: r.id,
    employeeId: r.employeeId,
    amount: formatMoneyString(r.amount),
    currency: r.currency,
    category: r.category,
    note: r.note,
    status: r.status,
    submittedBy: r.submittedBy,
    createdAt: r.createdAt.toISOString(),
  };
}

const PRIVILEGED = new Set(['ADMIN', 'HR_MANAGER']);

async function resolveSubjectEmployee(actor: ReimbursementActor, requestedEmployeeId?: string): Promise<string> {
  if (PRIVILEGED.has(actor.role)) {
    if (!requestedEmployeeId) throw new HttpError(400, 'employeeId is required');
    if (!(await repo.employeeExists(requestedEmployeeId))) throw new HttpError(404, 'Employee not found');
    return requestedEmployeeId;
  }
  const employeeId = await repo.getUserEmployeeId(actor.userId);
  if (!employeeId) throw new HttpError(400, 'Your account is not linked to an employee');
  return employeeId;
}

export async function createReimbursement(
  actor: ReimbursementActor,
  input: CreateReimbursementInput,
): Promise<ReimbursementDto> {
  const employeeId = await resolveSubjectEmployee(actor, input.employeeId);
  const created = await repo.createReimbursement({
    employeeId,
    amount: input.amount,
    currency: input.currency,
    category: input.category,
    note: input.note,
    submittedBy: actor.userId,
  });

  const request = await approvalService.submitForApproval('Reimbursement', created.id, actor.userId);
  if (request === null) {
    // No active workflow → immediately payable.
    await repo.setStatus(created.id, 'PAYABLE');
  } else if (request.status === 'PENDING') {
    await repo.setStatus(created.id, 'PENDING');
  }
  // If the request auto-approved, its onApproved hook already set PAYABLE.

  const fresh = await repo.getReimbursementById(created.id);
  return toDto(fresh!);
}

export async function listReimbursements(actor: ReimbursementActor, box: 'mine' | 'all'): Promise<ReimbursementDto[]> {
  const where = box === 'all' && PRIVILEGED.has(actor.role) ? {} : { submittedBy: actor.userId };
  const rows = await repo.listReimbursements(where);
  return rows.map(toDto);
}

export async function getReimbursement(id: string): Promise<ReimbursementDto> {
  const r = await repo.getReimbursementById(id);
  if (!r) throw new HttpError(404, 'Reimbursement not found');
  return toDto(r);
}

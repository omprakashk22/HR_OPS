import { Prisma, RejectMode, RequestStatus, Decision } from '@prisma/client';
import { prisma } from '../db/prisma';
import { LevelInput } from './approval.schemas';

const workflowInclude = { levels: { orderBy: { sequence: 'asc' as const } } };

/** Resolve a USER-level approver reference (email or user id) to a User. */
export function findUserByIdOrEmail(value: string) {
  return prisma.user.findFirst({ where: { OR: [{ id: value }, { email: value }] } });
}

export function findActiveWorkflow(entityType: string) {
  return prisma.approvalWorkflow.findFirst({
    where: { entityType, isActive: true },
    include: workflowInclude,
  });
}

export function getWorkflowById(id: string) {
  return prisma.approvalWorkflow.findUnique({ where: { id }, include: workflowInclude });
}

export function listWorkflows() {
  return prisma.approvalWorkflow.findMany({ include: workflowInclude, orderBy: { createdAt: 'desc' } });
}

/** True if another active workflow (not `exceptId`) already covers entityType. */
export async function hasOtherActiveWorkflow(entityType: string, exceptId?: string): Promise<boolean> {
  const count = await prisma.approvalWorkflow.count({
    where: { entityType, isActive: true, ...(exceptId ? { id: { not: exceptId } } : {}) },
  });
  return count > 0;
}

function levelCreateData(levels: LevelInput[]): Prisma.ApprovalLevelCreateManyWorkflowInput[] {
  return levels.map((l, i) => ({
    sequence: i + 1, // assigned by array order
    name: l.name,
    approverType: l.approverType,
    approverRole: l.approverType === 'ROLE' ? l.approverRole ?? null : null,
    approverUserId: l.approverType === 'USER' ? l.approverUserId ?? null : null,
    condition: l.condition ?? Prisma.JsonNull,
  }));
}

export function createWorkflow(data: {
  name: string;
  entityType: string;
  onReject: RejectMode;
  isActive: boolean;
  levels: LevelInput[];
}) {
  return prisma.approvalWorkflow.create({
    data: {
      name: data.name,
      entityType: data.entityType,
      onReject: data.onReject,
      isActive: data.isActive,
      levels: { create: levelCreateData(data.levels) },
    },
    include: workflowInclude,
  });
}

export function updateWorkflowMeta(
  id: string,
  data: Partial<{ name: string; onReject: RejectMode; isActive: boolean }>,
) {
  return prisma.approvalWorkflow.update({ where: { id }, data, include: workflowInclude });
}

export function replaceLevels(workflowId: string, levels: LevelInput[]) {
  return prisma.$transaction(async (tx) => {
    await tx.approvalLevel.deleteMany({ where: { workflowId } });
    await tx.approvalLevel.createMany({
      data: levelCreateData(levels).map((l) => ({ ...l, workflowId })),
    });
    return tx.approvalWorkflow.findUnique({ where: { id: workflowId }, include: workflowInclude });
  });
}

export function deleteWorkflow(id: string) {
  return prisma.approvalWorkflow.delete({ where: { id } });
}

// ---- requests ----

const requestInclude = { actions: { orderBy: { createdAt: 'asc' as const } } };

export function createRequest(data: {
  workflowId: string;
  entityType: string;
  entityId: string;
  context: Prisma.InputJsonValue;
  status: RequestStatus;
  currentSequence: number;
  submittedBy: string;
}) {
  return prisma.approvalRequest.create({ data });
}

export function getRequestById(id: string) {
  return prisma.approvalRequest.findUnique({ where: { id }, include: requestInclude });
}

export function updateRequest(
  id: string,
  data: Partial<{ status: RequestStatus; currentSequence: number; context: Prisma.InputJsonValue }>,
) {
  return prisma.approvalRequest.update({ where: { id }, data, include: requestInclude });
}

export function addAction(data: {
  requestId: string;
  levelSequence: number;
  actorUserId: string;
  decision: Decision;
  comment?: string;
}) {
  return prisma.approvalAction.create({ data });
}

export function listRequestsBySubmitter(submittedBy: string, status?: RequestStatus) {
  return prisma.approvalRequest.findMany({
    where: { submittedBy, ...(status ? { status } : {}) },
    include: requestInclude,
    orderBy: { createdAt: 'desc' },
  });
}

export function listPendingWithWorkflow() {
  return prisma.approvalRequest.findMany({
    where: { status: 'PENDING' },
    include: {
      actions: { orderBy: { createdAt: 'asc' } },
      workflow: { include: { levels: { orderBy: { sequence: 'asc' } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

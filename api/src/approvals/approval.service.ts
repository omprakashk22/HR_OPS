import { ApprovalLevel, ApprovalRequest, Prisma, RejectMode } from '@prisma/client';
import * as repo from './approval.repository';
import { getApprovalTarget } from './registry';
import { HttpError } from '../shared/httpError';
import {
  LevelDef,
  Condition,
  firstSequence,
  nextSequence,
  canActOnLevel,
} from './engine';
import { CreateWorkflowInput, UpdateWorkflowInput, LevelInput, DecisionInput } from './approval.schemas';

export interface Actor {
  userId: string;
  role: string;
}

function toLevelDef(level: ApprovalLevel): LevelDef {
  return {
    sequence: level.sequence,
    approverType: level.approverType,
    approverRole: level.approverRole,
    approverUserId: level.approverUserId,
    condition: (level.condition as Condition | null) ?? null,
  };
}

function asContext(request: ApprovalRequest): Record<string, unknown> {
  return (request.context as Record<string, unknown>) ?? {};
}

// ---- workflow config ----

export function listWorkflows() {
  return repo.listWorkflows();
}

export async function getWorkflow(id: string) {
  const wf = await repo.getWorkflowById(id);
  if (!wf) throw new HttpError(404, 'Workflow not found');
  return wf;
}

async function guardUniqueEntityType(entityType: string, exceptId?: string) {
  if (await repo.hasWorkflowForEntityType(entityType, exceptId)) {
    throw new HttpError(409, `A workflow already exists for ${entityType}`);
  }
}

export function listUsers(search?: string) {
  return repo.listUsers(search);
}

/** Resolve each USER-level approver (email or id) to a real User.id. */
async function resolveLevelApprovers(levels: LevelInput[]): Promise<LevelInput[]> {
  return Promise.all(
    levels.map(async (l) => {
      if (l.approverType !== 'USER') return l;
      const ref = l.approverUserId ?? '';
      const user = await repo.findUserByIdOrEmail(ref);
      if (!user) throw new HttpError(400, `Unknown approver user: ${ref}`);
      return { ...l, approverUserId: user.id };
    }),
  );
}

export async function createWorkflow(input: CreateWorkflowInput) {
  await guardUniqueEntityType(input.entityType);
  return repo.createWorkflow({
    name: input.name,
    entityType: input.entityType,
    onReject: input.onReject as RejectMode,
    isActive: input.isActive,
    levels: await resolveLevelApprovers(input.levels),
  });
}

export async function updateWorkflow(id: string, patch: UpdateWorkflowInput) {
  await getWorkflow(id);
  // entityType is immutable, and there is at most one workflow per type, so
  // no cross-workflow guard is needed here — isActive just enables/disables it.
  return repo.updateWorkflowMeta(id, patch as Partial<{ name: string; onReject: RejectMode; isActive: boolean }>);
}

export async function replaceLevels(id: string, levels: LevelInput[]) {
  await getWorkflow(id);
  return repo.replaceLevels(id, await resolveLevelApprovers(levels));
}

export async function deleteWorkflow(id: string) {
  await getWorkflow(id);
  // Only unattached workflows (no approval requests) may be deleted, so the
  // audit trail of past decisions is never orphaned.
  if ((await repo.countRequestsForWorkflow(id)) > 0) {
    throw new HttpError(409, 'Cannot delete a workflow that has approval requests');
  }
  await repo.deleteWorkflow(id);
}

// ---- request lifecycle ----

async function fireHook(kind: 'onApproved' | 'onRejected', request: ApprovalRequest) {
  const target = getApprovalTarget(request.entityType);
  if (target) await target[kind](request.entityId, request);
}

/**
 * Called by a consumer after it creates a record. Returns null when no active
 * workflow exists (the consumer should then treat the record as auto-approved).
 */
export async function submitForApproval(
  entityType: string,
  entityId: string,
  submittedBy: string,
): Promise<ApprovalRequest | null> {
  const workflow = await repo.findActiveWorkflow(entityType);
  if (!workflow) return null;

  const target = getApprovalTarget(entityType);
  if (!target) throw new HttpError(500, `No approval target registered for ${entityType}`);

  const context = await target.loadContext(entityId);
  const contextJson = context as Prisma.InputJsonValue;
  const levels = workflow.levels.map(toLevelDef);
  const first = firstSequence(levels, context);

  if (first === null) {
    const request = await repo.createRequest({
      workflowId: workflow.id,
      entityType,
      entityId,
      context: contextJson,
      status: 'APPROVED',
      currentSequence: 0,
      submittedBy,
    });
    await fireHook('onApproved', request);
    return request;
  }

  return repo.createRequest({
    workflowId: workflow.id,
    entityType,
    entityId,
    context: contextJson,
    status: 'PENDING',
    currentSequence: first,
    submittedBy,
  });
}

export async function decide(requestId: string, actor: Actor, input: DecisionInput): Promise<ApprovalRequest> {
  const request = await repo.getRequestById(requestId);
  if (!request) throw new HttpError(404, 'Approval request not found');
  if (request.status !== 'PENDING') throw new HttpError(409, 'Request is not pending');

  const workflow = await repo.getWorkflowById(request.workflowId);
  if (!workflow) throw new HttpError(500, 'Workflow missing for request');
  const currentLevel = workflow.levels.find((l) => l.sequence === request.currentSequence);
  if (!currentLevel) throw new HttpError(500, 'Current level not found');
  if (!canActOnLevel(toLevelDef(currentLevel), actor)) {
    throw new HttpError(403, 'You are not an approver for the current level');
  }

  await repo.addAction({
    requestId,
    levelSequence: request.currentSequence,
    actorUserId: actor.userId,
    decision: input.decision,
    comment: input.comment,
  });

  if (input.decision === 'REJECTED') {
    if (workflow.onReject === 'TERMINATE') {
      const updated = await repo.updateRequest(requestId, { status: 'REJECTED', currentSequence: 0 });
      await fireHook('onRejected', updated);
      return updated;
    }
    return repo.updateRequest(requestId, { status: 'SENT_BACK', currentSequence: 0 });
  }

  const levels = workflow.levels.map(toLevelDef);
  const next = nextSequence(levels, asContext(request), request.currentSequence);
  if (next === null) {
    const updated = await repo.updateRequest(requestId, { status: 'APPROVED', currentSequence: 0 });
    await fireHook('onApproved', updated);
    return updated;
  }
  return repo.updateRequest(requestId, { currentSequence: next });
}

export async function resubmit(requestId: string, submittedBy: string): Promise<ApprovalRequest> {
  const request = await repo.getRequestById(requestId);
  if (!request) throw new HttpError(404, 'Approval request not found');
  if (request.status !== 'SENT_BACK') throw new HttpError(409, 'Only sent-back requests can be resubmitted');
  if (request.submittedBy !== submittedBy) throw new HttpError(403, 'Only the submitter can resubmit');

  const workflow = await repo.getWorkflowById(request.workflowId);
  if (!workflow) throw new HttpError(500, 'Workflow missing for request');
  const target = getApprovalTarget(request.entityType);
  if (!target) throw new HttpError(500, `No approval target registered for ${request.entityType}`);

  const context = await target.loadContext(request.entityId); // fresh — target may have been edited
  const contextJson = context as Prisma.InputJsonValue;
  const levels = workflow.levels.map(toLevelDef);
  const first = firstSequence(levels, context);

  if (first === null) {
    const updated = await repo.updateRequest(requestId, { status: 'APPROVED', currentSequence: 0, context: contextJson });
    await fireHook('onApproved', updated);
    return updated;
  }
  return repo.updateRequest(requestId, { status: 'PENDING', currentSequence: first, context: contextJson });
}

export async function getRequest(id: string) {
  const request = await repo.getRequestById(id);
  if (!request) throw new HttpError(404, 'Approval request not found');
  const workflow = await repo.getWorkflowById(request.workflowId);
  return { ...request, workflow };
}

export async function listRequests(actor: Actor, box: 'inbox' | 'mine') {
  if (box === 'mine') {
    return repo.listRequestsBySubmitter(actor.userId);
  }
  // inbox: pending requests whose current level this actor can act on
  const pending = await repo.listPendingWithWorkflow();
  return pending.filter((r) => {
    const level = r.workflow.levels.find((l) => l.sequence === r.currentSequence);
    return level ? canActOnLevel(toLevelDef(level), actor) : false;
  });
}

import { ApprovalRequest } from '@prisma/client';

/**
 * A consumer attaches the engine to its entity by registering an adapter.
 * The engine reads the target row via `loadContext` (so it never imports the
 * consumer's models) and mutates the target via the hooks on final decision.
 */
export interface ApprovalTarget {
  loadContext(entityId: string): Promise<Record<string, unknown>>;
  onApproved(entityId: string, request: ApprovalRequest): Promise<void>;
  onRejected(entityId: string, request: ApprovalRequest): Promise<void>;
}

const registry = new Map<string, ApprovalTarget>();

export function registerApprovalTarget(entityType: string, target: ApprovalTarget): void {
  registry.set(entityType, target);
}

export function getApprovalTarget(entityType: string): ApprovalTarget | undefined {
  return registry.get(entityType);
}

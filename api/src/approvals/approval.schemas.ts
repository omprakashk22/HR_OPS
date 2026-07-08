import { z } from 'zod';

const ROLE_VALUES = ['EMPLOYEE', 'MANAGER', 'FINANCE', 'HR_MANAGER', 'ADMIN'] as const;

export const conditionSchema = z
  .object({
    field: z.string().min(1),
    op: z.enum(['gt', 'gte', 'lt', 'lte', 'eq', 'ne']),
    value: z.union([z.string(), z.number()]),
  })
  .nullable();

// Sequence is assigned by array order in the service, so it's not an input.
export const levelInputSchema = z
  .object({
    name: z.string().min(1),
    approverType: z.enum(['ROLE', 'USER']),
    approverRole: z.enum(ROLE_VALUES).nullish(),
    // Accept an email OR a user id here; the service resolves it to a real
    // User.id (the engine compares against User.id at decision time).
    approverUserId: z.string().min(1).nullish(),
    condition: conditionSchema.optional(),
  })
  .refine((l) => (l.approverType === 'ROLE' ? !!l.approverRole : !!l.approverUserId), {
    message: 'approverRole is required for ROLE levels; approverUserId for USER levels',
  });

export const createWorkflowSchema = z.object({
  name: z.string().min(1),
  entityType: z.string().min(1),
  onReject: z.enum(['TERMINATE', 'SEND_BACK']).default('TERMINATE'),
  isActive: z.boolean().default(false),
  levels: z.array(levelInputSchema).default([]),
});

export const updateWorkflowSchema = z
  .object({
    name: z.string().min(1).optional(),
    onReject: z.enum(['TERMINATE', 'SEND_BACK']).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const replaceLevelsSchema = z.object({ levels: z.array(levelInputSchema) });

export const decisionSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  comment: z.string().max(2000).optional(),
});

export type LevelInput = z.infer<typeof levelInputSchema>;
export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;
export type DecisionInput = z.infer<typeof decisionSchema>;

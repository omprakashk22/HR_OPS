import { z } from 'zod';

export const REIMBURSEMENT_CATEGORIES = ['Travel', 'Meals', 'Equipment', 'Other'] as const;

const money = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'must be a decimal string with up to 2 places')
  .refine((v) => Number(v) > 0, 'must be greater than 0');

export const createReimbursementSchema = z.object({
  employeeId: z.string().uuid().optional(), // HR/ADMIN may target any employee
  amount: money,
  currency: z.string().regex(/^[A-Z]{3}$/, 'must be an ISO 4217 code'),
  category: z.enum(REIMBURSEMENT_CATEGORIES),
  note: z.string().min(1),
});

export type CreateReimbursementInput = z.infer<typeof createReimbursementSchema>;

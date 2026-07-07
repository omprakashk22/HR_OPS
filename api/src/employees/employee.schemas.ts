import { z } from 'zod';

export const GENDER_VALUES = ['FEMALE', 'MALE', 'OTHER', 'UNDISCLOSED'] as const;
export const LEVEL_VALUES = [
  'L1_JUNIOR',
  'L2_MID',
  'L3_SENIOR',
  'L4_STAFF',
  'L5_PRINCIPAL',
  'L6_MANAGER',
] as const;

// Money is validated as a decimal string (never coerced to a JS number) —
// non-negative, up to two decimal places.
const moneyString = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'must be a decimal string with up to 2 places');
const positiveMoney = moneyString.refine((v) => Number(v) > 0, 'must be greater than 0');

const currencyCode = z.string().regex(/^[A-Z]{3}$/, 'must be an ISO 4217 code');
const countryCode = z.string().regex(/^[A-Z]{2}$/, 'must be an ISO 3166-1 alpha-2 code');

const profileFields = {
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  gender: z.enum(GENDER_VALUES),
  country: countryCode,
  department: z.string().min(1),
  jobTitle: z.string().min(1),
  level: z.enum(LEVEL_VALUES),
  localCurrency: currencyCode,
  hireDate: z.coerce.date(),
};

export const createEmployeeSchema = z.object({
  ...profileFields,
  baseSalary: positiveMoney,
  bonus: moneyString.default('0'),
  currency: currencyCode,
  effectiveDate: z.coerce.date(),
});

export const updateEmployeeSchema = z
  .object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    gender: z.enum(GENDER_VALUES),
    country: countryCode,
    department: z.string().min(1),
    jobTitle: z.string().min(1),
    level: z.enum(LEVEL_VALUES),
    localCurrency: currencyCode,
    hireDate: z.coerce.date(),
  })
  .partial()
  .strict(); // reject unknown keys — e.g. an attempt to change salary here

export const salaryChangeSchema = z.object({
  baseSalary: positiveMoney,
  bonus: moneyString.default('0'),
  currency: currencyCode,
  effectiveDate: z.coerce.date(),
  reason: z.string().min(1),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type SalaryChangeInput = z.infer<typeof salaryChangeSchema>;

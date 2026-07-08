// Mirrors the seed/domain enums (see api/prisma/seedData.ts).

export const LEVELS = [
  { value: 'L1_JUNIOR', label: 'L1 · Junior' },
  { value: 'L2_MID', label: 'L2 · Mid' },
  { value: 'L3_SENIOR', label: 'L3 · Senior' },
  { value: 'L4_STAFF', label: 'L4 · Staff' },
  { value: 'L5_PRINCIPAL', label: 'L5 · Principal' },
  { value: 'L6_MANAGER', label: 'L6 · Manager' },
];

export const GENDERS = [
  { value: 'FEMALE', label: 'Female' },
  { value: 'MALE', label: 'Male' },
  { value: 'OTHER', label: 'Other' },
  { value: 'UNDISCLOSED', label: 'Undisclosed' },
];

export const COUNTRIES = ['US', 'IN', 'GB', 'DE', 'CA', 'AU', 'SG', 'BR'];

export const DEPARTMENTS = [
  'Engineering',
  'Product',
  'Sales',
  'Finance',
  'Marketing',
  'Operations',
  'Support',
  'HR',
];

export const CURRENCIES = ['USD', 'INR', 'GBP', 'EUR', 'CAD', 'AUD', 'SGD', 'BRL'];

export const ROLES = ['EMPLOYEE', 'MANAGER', 'FINANCE', 'HR_MANAGER', 'ADMIN'];

export const CONDITION_OPS = [
  { value: 'gt', label: '>' },
  { value: 'gte', label: '≥' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '≤' },
  { value: 'eq', label: '=' },
  { value: 'ne', label: '≠' },
];

export const REIMBURSEMENT_CATEGORIES = ['Travel', 'Meals', 'Equipment', 'Other'];

// Entity types a workflow can be attached to (drives the config dropdown).
export const ENTITY_TYPES = ['Reimbursement', 'SalaryChange'];

// Roles allowed to configure workflows.
export const CONFIG_ROLES = ['ADMIN', 'HR_MANAGER'];

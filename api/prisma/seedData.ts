// Shaped seed distribution (design spec §8). All values are deliberate so
// the analytics screens are visibly meaningful — non-flat spreads across
// countries, levels, and departments, and a small realistic gender skew.

export interface CurrencyDef {
  code: string; // ISO 4217
  rateToUsd: string; // 1 unit of `code` = rateToUsd USD (fixed, seeded)
}

export const CURRENCIES: CurrencyDef[] = [
  { code: 'USD', rateToUsd: '1' },
  { code: 'INR', rateToUsd: '0.012' },
  { code: 'GBP', rateToUsd: '1.27' },
  { code: 'EUR', rateToUsd: '1.08' },
  { code: 'CAD', rateToUsd: '0.73' },
  { code: 'AUD', rateToUsd: '0.66' },
  { code: 'SGD', rateToUsd: '0.74' },
  { code: 'BRL', rateToUsd: '0.20' },
];

export interface CountryDef {
  code: string; // ISO 3166-1 alpha-2
  currency: string;
  weight: number; // relative headcount share
  costMultiplier: number; // labor-cost factor in USD terms
}

export const COUNTRIES: CountryDef[] = [
  { code: 'US', currency: 'USD', weight: 30, costMultiplier: 1.0 },
  { code: 'IN', currency: 'INR', weight: 25, costMultiplier: 0.35 },
  { code: 'GB', currency: 'GBP', weight: 12, costMultiplier: 0.9 },
  { code: 'DE', currency: 'EUR', weight: 10, costMultiplier: 0.85 },
  { code: 'CA', currency: 'CAD', weight: 8, costMultiplier: 0.8 },
  { code: 'AU', currency: 'AUD', weight: 6, costMultiplier: 0.8 },
  { code: 'SG', currency: 'SGD', weight: 5, costMultiplier: 0.78 },
  { code: 'BR', currency: 'BRL', weight: 4, costMultiplier: 0.5 },
];

export interface LevelDef {
  level: 'L1_JUNIOR' | 'L2_MID' | 'L3_SENIOR' | 'L4_STAFF' | 'L5_PRINCIPAL' | 'L6_MANAGER';
  baseUsd: number; // midpoint of the USD band for this level
  weight: number;
  title: string;
}

export const LEVELS: LevelDef[] = [
  { level: 'L1_JUNIOR', baseUsd: 60000, weight: 22, title: 'Associate' },
  { level: 'L2_MID', baseUsd: 85000, weight: 28, title: 'Specialist' },
  { level: 'L3_SENIOR', baseUsd: 115000, weight: 22, title: 'Senior Specialist' },
  { level: 'L4_STAFF', baseUsd: 150000, weight: 12, title: 'Staff' },
  { level: 'L5_PRINCIPAL', baseUsd: 200000, weight: 6, title: 'Principal' },
  { level: 'L6_MANAGER', baseUsd: 175000, weight: 10, title: 'Manager' },
];

export interface DepartmentDef {
  name: string;
  weight: number;
  multiplier: number; // comp factor by function
}

export const DEPARTMENTS: DepartmentDef[] = [
  { name: 'Engineering', weight: 30, multiplier: 1.15 },
  { name: 'Product', weight: 8, multiplier: 1.1 },
  { name: 'Sales', weight: 18, multiplier: 1.05 },
  { name: 'Finance', weight: 8, multiplier: 1.0 },
  { name: 'Marketing', weight: 10, multiplier: 0.95 },
  { name: 'Operations', weight: 12, multiplier: 0.92 },
  { name: 'Support', weight: 9, multiplier: 0.82 },
  { name: 'HR', weight: 5, multiplier: 0.9 },
];

export interface GenderDef {
  value: 'FEMALE' | 'MALE' | 'OTHER' | 'UNDISCLOSED';
  weight: number;
}

export const GENDERS: GenderDef[] = [
  { value: 'FEMALE', weight: 48 },
  { value: 'MALE', weight: 48 },
  { value: 'OTHER', weight: 2 },
  { value: 'UNDISCLOSED', weight: 2 },
];

// Small, realistic same-level base-pay skew applied to FEMALE employees, so
// the equity screen shows a non-zero, non-alarmist gap (not an exaggerated
// demo number).
export const FEMALE_PENALTY_RANGE = { min: 0.04, max: 0.06 };

export const SALARY_REASONS = ['Annual raise', 'Promotion', 'Market adjustment'];

export const TOTAL_EMPLOYEES = 10000;

export const HR_USER = {
  email: 'hr@acme.test',
  name: 'ACME HR Manager',
  password: 'password123', // dev-only seeded credential
};

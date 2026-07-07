import { describe, it, expect } from 'vitest';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  salaryChangeSchema,
} from '../../src/employees/employee.schemas';

const validCreate = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  gender: 'FEMALE',
  country: 'GB',
  department: 'Engineering',
  jobTitle: 'Staff, Engineering',
  level: 'L4_STAFF',
  localCurrency: 'GBP',
  hireDate: '2020-03-01',
  baseSalary: '120000',
  currency: 'GBP',
  effectiveDate: '2020-03-01',
};

describe('createEmployeeSchema', () => {
  it('accepts a valid payload and defaults bonus to "0"', () => {
    const parsed = createEmployeeSchema.parse(validCreate);
    expect(parsed.bonus).toBe('0');
    expect(parsed.hireDate).toBeInstanceOf(Date);
  });

  it('rejects a payload missing a required field (country)', () => {
    const { country, ...rest } = validCreate;
    expect(createEmployeeSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects an invalid level enum', () => {
    expect(createEmployeeSchema.safeParse({ ...validCreate, level: 'L9_WIZARD' }).success).toBe(false);
  });
});

describe('salaryChangeSchema', () => {
  it('accepts a valid salary change', () => {
    const parsed = salaryChangeSchema.parse({
      baseSalary: '130000.50',
      bonus: '5000',
      currency: 'GBP',
      effectiveDate: '2022-01-01',
      reason: 'Annual raise',
    });
    expect(parsed.baseSalary).toBe('130000.50');
  });

  it('rejects a negative base salary', () => {
    expect(
      salaryChangeSchema.safeParse({
        baseSalary: '-100',
        currency: 'GBP',
        effectiveDate: '2022-01-01',
        reason: 'x',
      }).success,
    ).toBe(false);
  });

  it('rejects money with more than two decimal places', () => {
    expect(
      salaryChangeSchema.safeParse({
        baseSalary: '100.999',
        currency: 'GBP',
        effectiveDate: '2022-01-01',
        reason: 'x',
      }).success,
    ).toBe(false);
  });

  it('rejects an empty reason', () => {
    expect(
      salaryChangeSchema.safeParse({
        baseSalary: '100',
        currency: 'GBP',
        effectiveDate: '2022-01-01',
        reason: '',
      }).success,
    ).toBe(false);
  });
});

describe('updateEmployeeSchema', () => {
  it('accepts a partial profile update', () => {
    expect(updateEmployeeSchema.safeParse({ department: 'Sales' }).success).toBe(true);
  });

  it('rejects an attempt to sneak a salary field in via update', () => {
    expect(updateEmployeeSchema.safeParse({ department: 'Sales', baseSalary: '999999' }).success).toBe(false);
  });
});

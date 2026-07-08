import request from 'supertest';
import { Role } from '@prisma/client';
import { prisma } from '../../../src/db/prisma';
import { app } from '../../../src/app';
import { hashPassword } from '../../../src/auth/password';

export const TEST_HR = { email: 'hr@test.local', name: 'Test HR', password: 'test-password' };

export async function seedHrUser(password: string = TEST_HR.password) {
  const passwordHash = await hashPassword(password);
  return prisma.user.create({
    data: { email: TEST_HR.email, name: TEST_HR.name, passwordHash, role: 'HR_MANAGER' },
  });
}

/** Create a user with a given role (password = 'pw'); returns the user row. */
export async function seedUser(role: Role, email = `${role.toLowerCase()}@test.local`, employeeId?: string) {
  const passwordHash = await hashPassword('pw');
  return prisma.user.create({ data: { email, name: role, passwordHash, role, employeeId } });
}

/** Log in a user by email/password and return a bearer token. */
export async function loginAs(email: string, password: string): Promise<string> {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password });
  return res.body.token as string;
}

/** Log in the seeded HR user and return a bearer token for authed requests. */
export async function loginAsHr(): Promise<string> {
  return loginAs(TEST_HR.email, TEST_HR.password);
}

/** A small, known set of currency rates for USD-normalization assertions. */
export async function seedCurrencies() {
  await prisma.currencyRate.createMany({
    data: [
      { code: 'USD', rateToUsd: '1' },
      { code: 'GBP', rateToUsd: '1.27' },
      { code: 'INR', rateToUsd: '0.012' },
    ],
  });
}

/** A valid create-employee payload; override any field for a specific case. */
export function employeePayload(overrides: Record<string, unknown> = {}) {
  return {
    firstName: 'Ada',
    lastName: 'Lovelace',
    gender: 'FEMALE',
    country: 'GB',
    department: 'Engineering',
    jobTitle: 'Staff, Engineering',
    level: 'L4_STAFF',
    localCurrency: 'GBP',
    hireDate: '2020-03-01',
    baseSalary: '100000',
    bonus: '0',
    currency: 'GBP',
    effectiveDate: '2020-03-01',
    ...overrides,
  };
}

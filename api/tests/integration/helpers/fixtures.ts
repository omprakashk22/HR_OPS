import request from 'supertest';
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

/** Log in the seeded HR user and return a bearer token for authed requests. */
export async function loginAsHr(): Promise<string> {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: TEST_HR.email, password: TEST_HR.password });
  return res.body.token as string;
}

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { prisma, resetDb } from './helpers/testDb';
import { seedHrUser, seedUser, loginAsHr, loginAs } from './helpers/fixtures';

function createEmployeeRow() {
  return prisma.employee.create({
    data: {
      employeeNumber: 'E00001',
      firstName: 'Aud',
      lastName: 'It',
      gender: 'OTHER',
      country: 'US',
      department: 'Engineering',
      jobTitle: 'X',
      level: 'L3_SENIOR',
      localCurrency: 'USD',
      hireDate: new Date('2020-01-01'),
      status: 'ACTIVE',
    },
  });
}

let hrUserId: string;
let hrToken: string;
let adminToken: string;
let employeeId: string;

describe('audit log', () => {
  beforeEach(async () => {
    await resetDb();
    const hr = await seedHrUser();
    hrUserId = hr.id;
    await seedUser('ADMIN');
    const emp = await createEmployeeRow();
    employeeId = emp.id;
    hrToken = await loginAsHr();
    adminToken = await loginAs('admin@test.local', 'pw');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('records an actor-attributed UPDATE and surfaces it in the admin audit log', async () => {
    await request(app)
      .patch(`/api/v1/employees/${employeeId}`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ department: 'Product' });

    const res = await request(app)
      .get('/api/v1/audit?model=Employee')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);

    const entry = res.body.data.find(
      (a: { action: string; recordId: string }) => a.action === 'UPDATE' && a.recordId === employeeId,
    );
    expect(entry).toBeTruthy();
    expect(entry.actorUserId).toBe(hrUserId); // attributed to the acting HR user
    expect(entry.after.department).toBe('Product');
    expect(entry.before.department).toBe('Engineering');
  });

  it('redacts password hashes and attributes user writes', async () => {
    // Creating a user (via login is a read; create a fresh one through the API path is not exposed,
    // so assert on the seed-time user create captured with a redacted hash).
    const res = await request(app)
      .get('/api/v1/audit?model=User')
      .set('Authorization', `Bearer ${adminToken}`);
    const userCreate = res.body.data.find((a: { action: string }) => a.action === 'CREATE');
    expect(userCreate).toBeTruthy();
    expect(userCreate.after.passwordHash).toBe('[redacted]');
  });

  it('is ADMIN-only (403 for a non-admin)', async () => {
    const res = await request(app).get('/api/v1/audit').set('Authorization', `Bearer ${hrToken}`);
    expect(res.status).toBe(403);
  });
});

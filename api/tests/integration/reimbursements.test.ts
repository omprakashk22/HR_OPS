import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { prisma, resetDb } from './helpers/testDb';
import { seedHrUser, seedUser, seedCurrencies, loginAs, loginAsHr } from './helpers/fixtures';
import * as approvalService from '../../src/approvals/approval.service';

function createReimbursementWorkflow() {
  return approvalService.createWorkflow({
    name: 'Reimbursement approval',
    entityType: 'Reimbursement',
    onReject: 'TERMINATE',
    isActive: true,
    levels: [
      { name: 'Manager', approverType: 'ROLE', approverRole: 'MANAGER', condition: null },
      { name: 'Finance', approverType: 'ROLE', approverRole: 'FINANCE', condition: { field: 'amountUsd', op: 'gt', value: 1000 } },
    ],
  });
}

function createEmployeeRow(employeeNumber: string, currency = 'GBP') {
  return prisma.employee.create({
    data: {
      employeeNumber,
      firstName: 'Sub',
      lastName: 'Ject',
      gender: 'OTHER',
      country: 'GB',
      department: 'Engineering',
      jobTitle: 'X',
      level: 'L3_SENIOR',
      localCurrency: currency,
      hireDate: new Date('2020-01-01'),
      status: 'ACTIVE',
    },
  });
}

async function requestIdFor(reimbursementId: string): Promise<string> {
  const req = await prisma.approvalRequest.findFirst({
    where: { entityType: 'Reimbursement', entityId: reimbursementId },
  });
  return req!.id;
}

let hrToken: string;
let managerToken: string;
let financeToken: string;
let employeeId: string;

describe('reimbursements (approval-engine consumer)', () => {
  beforeEach(async () => {
    await resetDb();
    await seedHrUser();
    await seedUser('MANAGER');
    await seedUser('FINANCE');
    const employee = await createEmployeeRow('E00001');
    employeeId = employee.id;
    await seedUser('EMPLOYEE', 'emp@test.local', employee.id); // linked
    await seedUser('EMPLOYEE', 'nolink@test.local'); // no employee link
    await seedCurrencies();
    hrToken = await loginAsHr();
    managerToken = await loginAs('manager@test.local', 'pw');
    financeToken = await loginAs('finance@test.local', 'pw');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('HR files a claim > $1000 → routes through Manager then Finance to PAYABLE', async () => {
    await createReimbursementWorkflow();
    // 100000 GBP * 1.27 = 127000 USD (> 1000)
    const create = await request(app)
      .post('/api/v1/reimbursements')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ employeeId, amount: '100000', currency: 'GBP', category: 'Travel', note: 'Flights' });
    expect(create.status).toBe(201);
    expect(create.body.status).toBe('PENDING');

    const reqId = await requestIdFor(create.body.id);
    const a1 = await request(app).post(`/api/v1/approvals/requests/${reqId}/decision`).set('Authorization', `Bearer ${managerToken}`).send({ decision: 'APPROVED' });
    expect(a1.body.currentSequence).toBe(2); // advanced to Finance

    await request(app).post(`/api/v1/approvals/requests/${reqId}/decision`).set('Authorization', `Bearer ${financeToken}`).send({ decision: 'APPROVED' });

    const after = await request(app).get(`/api/v1/reimbursements/${create.body.id}`).set('Authorization', `Bearer ${hrToken}`);
    expect(after.body.status).toBe('PAYABLE');
  });

  it('a claim <= $1000 needs only the Manager level', async () => {
    await createReimbursementWorkflow();
    const create = await request(app)
      .post('/api/v1/reimbursements')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ employeeId, amount: '500', currency: 'USD', category: 'Meals', note: 'Lunch' });
    expect(create.body.status).toBe('PENDING');

    const reqId = await requestIdFor(create.body.id);
    await request(app).post(`/api/v1/approvals/requests/${reqId}/decision`).set('Authorization', `Bearer ${managerToken}`).send({ decision: 'APPROVED' });

    const after = await request(app).get(`/api/v1/reimbursements/${create.body.id}`).set('Authorization', `Bearer ${hrToken}`);
    expect(after.body.status).toBe('PAYABLE'); // Finance level skipped
  });

  it('rejection marks the reimbursement REJECTED', async () => {
    await createReimbursementWorkflow();
    const create = await request(app)
      .post('/api/v1/reimbursements')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ employeeId, amount: '500', currency: 'USD', category: 'Other', note: 'x' });
    const reqId = await requestIdFor(create.body.id);
    await request(app).post(`/api/v1/approvals/requests/${reqId}/decision`).set('Authorization', `Bearer ${managerToken}`).send({ decision: 'REJECTED' });

    const after = await request(app).get(`/api/v1/reimbursements/${create.body.id}`).set('Authorization', `Bearer ${hrToken}`);
    expect(after.body.status).toBe('REJECTED');
  });

  it('a linked employee-user files their own claim (no employeeId needed)', async () => {
    await createReimbursementWorkflow();
    const empToken = await loginAs('emp@test.local', 'pw');
    const create = await request(app)
      .post('/api/v1/reimbursements')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ amount: '200', currency: 'USD', category: 'Meals', note: 'own claim' });
    expect(create.status).toBe(201);
    expect(create.body.employeeId).toBe(employeeId);
    expect(create.body.status).toBe('PENDING');
  });

  it('an employee-user with no linked employee gets a clean 400 (not 500)', async () => {
    await createReimbursementWorkflow();
    const noLinkToken = await loginAs('nolink@test.local', 'pw');
    const res = await request(app)
      .post('/api/v1/reimbursements')
      .set('Authorization', `Bearer ${noLinkToken}`)
      .send({ amount: '200', currency: 'USD', category: 'Meals', note: 'x' });
    expect(res.status).toBe(400);
  });

  it('with no active workflow, a claim is created PAYABLE immediately', async () => {
    // no workflow created for this test
    const create = await request(app)
      .post('/api/v1/reimbursements')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ employeeId, amount: '5000', currency: 'USD', category: 'Equipment', note: 'laptop' });
    expect(create.status).toBe(201);
    expect(create.body.status).toBe('PAYABLE');
  });
});

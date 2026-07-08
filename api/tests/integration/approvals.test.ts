import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { prisma, resetDb } from './helpers/testDb';
import { seedHrUser, seedUser, loginAs, loginAsHr, TEST_HR } from './helpers/fixtures';
import { registerApprovalTarget } from '../../src/approvals/registry';
import * as approvalService from '../../src/approvals/approval.service';

// A stub consumer so the engine can be exercised without a real domain.
let stubContext: Record<string, unknown> = {};
const hookCalls: string[] = [];
registerApprovalTarget('Widget', {
  loadContext: async () => stubContext,
  onApproved: async (id) => {
    hookCalls.push(`approved:${id}`);
  },
  onRejected: async (id) => {
    hookCalls.push(`rejected:${id}`);
  },
});

function createWidgetWorkflow(onReject: 'TERMINATE' | 'SEND_BACK') {
  return approvalService.createWorkflow({
    name: 'Widget WF',
    entityType: 'Widget',
    onReject,
    isActive: true,
    levels: [
      { name: 'Manager', approverType: 'ROLE', approverRole: 'MANAGER', condition: null },
      { name: 'Finance', approverType: 'ROLE', approverRole: 'FINANCE', condition: { field: 'amountUsd', op: 'gt', value: 1000 } },
    ],
  });
}

let managerToken: string;
let financeToken: string;
let submitterId: string;

describe('approval engine + API', () => {
  beforeEach(async () => {
    await resetDb();
    await seedHrUser();
    await seedUser('ADMIN');
    await seedUser('MANAGER');
    await seedUser('FINANCE');
    const submitter = await seedUser('EMPLOYEE');
    submitterId = submitter.id;
    managerToken = await loginAs('manager@test.local', 'pw');
    financeToken = await loginAs('finance@test.local', 'pw');
    hookCalls.length = 0;
    stubContext = {};
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('workflow config', () => {
    it('allows only one workflow per entity type (second → 409, even if inactive)', async () => {
      const adminToken = await loginAs('admin@test.local', 'pw');
      const body = {
        name: 'WF', entityType: 'Widget', onReject: 'TERMINATE', isActive: false,
        levels: [{ name: 'Manager', approverType: 'ROLE', approverRole: 'MANAGER' }],
      };
      const first = await request(app).post('/api/v1/approvals/workflows').set('Authorization', `Bearer ${adminToken}`).send(body);
      expect(first.status).toBe(201);

      const second = await request(app).post('/api/v1/approvals/workflows').set('Authorization', `Bearer ${adminToken}`).send({ ...body, name: 'WF2' });
      expect(second.status).toBe(409);
    });

    it('deletes an unattached workflow but refuses one that has requests', async () => {
      const adminToken = await loginAs('admin@test.local', 'pw');
      // Unattached (different entity type, no requests) → deletable.
      const unattached = await request(app)
        .post('/api/v1/approvals/workflows')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Salary', entityType: 'SalaryChange', onReject: 'TERMINATE', isActive: false, levels: [{ name: 'M', approverType: 'ROLE', approverRole: 'MANAGER' }] });
      const del = await request(app).delete(`/api/v1/approvals/workflows/${unattached.body.id}`).set('Authorization', `Bearer ${adminToken}`);
      expect(del.status).toBe(204);

      // Attached (has a request) → 409.
      await createWidgetWorkflow('TERMINATE');
      const wf = (await request(app).get('/api/v1/approvals/workflows').set('Authorization', `Bearer ${adminToken}`)).body.data.find((w: { entityType: string }) => w.entityType === 'Widget');
      stubContext = { amountUsd: '1500.00' };
      await approvalService.submitForApproval('Widget', 'wdel', submitterId);
      const blocked = await request(app).delete(`/api/v1/approvals/workflows/${wf.id}`).set('Authorization', `Bearer ${adminToken}`);
      expect(blocked.status).toBe(409);
    });

    it('lists users for the approver picker', async () => {
      const adminToken = await loginAs('admin@test.local', 'pw');
      const res = await request(app).get('/api/v1/approvals/users?search=finance').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.some((u: { email: string }) => u.email === 'finance@test.local')).toBe(true);
    });

    it('forbids workflow config for a non-admin/non-HR role (403)', async () => {
      const res = await request(app)
        .get('/api/v1/approvals/workflows')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.status).toBe(403);
    });

    it('resolves a USER-level approver given by email to the user id', async () => {
      const adminToken = await loginAs('admin@test.local', 'pw');
      const res = await request(app)
        .post('/api/v1/approvals/workflows')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'ByEmail', entityType: 'Widget', onReject: 'TERMINATE', isActive: false,
          levels: [{ name: 'Finance person', approverType: 'USER', approverUserId: 'finance@test.local' }],
        });
      expect(res.status).toBe(201);
      const finance = await prisma.user.findUnique({ where: { email: 'finance@test.local' } });
      expect(res.body.levels[0].approverUserId).toBe(finance!.id); // email → id
    });

    it('rejects an unknown approver email with 400', async () => {
      const adminToken = await loginAs('admin@test.local', 'pw');
      const res = await request(app)
        .post('/api/v1/approvals/workflows')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'BadUser', entityType: 'Widget', onReject: 'TERMINATE', isActive: false,
          levels: [{ name: 'Ghost', approverType: 'USER', approverUserId: 'ghost@nowhere.test' }],
        });
      expect(res.status).toBe(400);
    });
  });

  describe('request lifecycle', () => {
    it('advances through both levels and fires onApproved', async () => {
      await createWidgetWorkflow('TERMINATE');
      stubContext = { amountUsd: '1500.00' };
      const req = await approvalService.submitForApproval('Widget', 'w1', submitterId);
      expect(req?.status).toBe('PENDING');
      expect(req?.currentSequence).toBe(1);

      const a1 = await request(app).post(`/api/v1/approvals/requests/${req!.id}/decision`).set('Authorization', `Bearer ${managerToken}`).send({ decision: 'APPROVED' });
      expect(a1.status).toBe(200);
      expect(a1.body.currentSequence).toBe(2); // advanced to Finance

      const a2 = await request(app).post(`/api/v1/approvals/requests/${req!.id}/decision`).set('Authorization', `Bearer ${financeToken}`).send({ decision: 'APPROVED' });
      expect(a2.body.status).toBe('APPROVED');
      expect(hookCalls).toContain('approved:w1');
    });

    it('skips the conditional Finance level when amountUsd <= 1000', async () => {
      await createWidgetWorkflow('TERMINATE');
      stubContext = { amountUsd: '500.00' };
      const req = await approvalService.submitForApproval('Widget', 'w2', submitterId);

      const a1 = await request(app).post(`/api/v1/approvals/requests/${req!.id}/decision`).set('Authorization', `Bearer ${managerToken}`).send({ decision: 'APPROVED' });
      expect(a1.body.status).toBe('APPROVED'); // Finance skipped
      expect(hookCalls).toContain('approved:w2');
    });

    it('rejection with TERMINATE marks REJECTED and fires onRejected', async () => {
      await createWidgetWorkflow('TERMINATE');
      stubContext = { amountUsd: '1500.00' };
      const req = await approvalService.submitForApproval('Widget', 'w3', submitterId);
      const res = await request(app).post(`/api/v1/approvals/requests/${req!.id}/decision`).set('Authorization', `Bearer ${managerToken}`).send({ decision: 'REJECTED', comment: 'nope' });
      expect(res.body.status).toBe('REJECTED');
      expect(hookCalls).toContain('rejected:w3');
    });

    it('rejection with SEND_BACK allows the submitter to resubmit', async () => {
      await createWidgetWorkflow('SEND_BACK');
      stubContext = { amountUsd: '1500.00' };
      const req = await approvalService.submitForApproval('Widget', 'w4', submitterId);
      const rej = await request(app).post(`/api/v1/approvals/requests/${req!.id}/decision`).set('Authorization', `Bearer ${managerToken}`).send({ decision: 'REJECTED' });
      expect(rej.body.status).toBe('SENT_BACK');

      const resubmitted = await approvalService.resubmit(req!.id, submitterId);
      expect(resubmitted.status).toBe('PENDING');
      expect(resubmitted.currentSequence).toBe(1);
    });

    it('rejects a decision from a user not on the current level (403)', async () => {
      await createWidgetWorkflow('TERMINATE');
      stubContext = { amountUsd: '1500.00' };
      const req = await approvalService.submitForApproval('Widget', 'w5', submitterId);
      // Finance tries to act on the Manager level.
      const res = await request(app).post(`/api/v1/approvals/requests/${req!.id}/decision`).set('Authorization', `Bearer ${financeToken}`).send({ decision: 'APPROVED' });
      expect(res.status).toBe(403);
    });

    it('inbox shows requests actionable by the current user', async () => {
      await createWidgetWorkflow('TERMINATE');
      stubContext = { amountUsd: '1500.00' };
      await approvalService.submitForApproval('Widget', 'w6', submitterId);

      const managerInbox = await request(app).get('/api/v1/approvals/requests?box=inbox').set('Authorization', `Bearer ${managerToken}`);
      expect(managerInbox.body.data).toHaveLength(1);

      const financeInbox = await request(app).get('/api/v1/approvals/requests?box=inbox').set('Authorization', `Bearer ${financeToken}`);
      expect(financeInbox.body.data).toHaveLength(0); // not yet at Finance level
    });

    it('auto-approves when no level applies', async () => {
      // Workflow whose only level is conditional and does not match.
      await approvalService.createWorkflow({
        name: 'Widget AutoApprove', entityType: 'Widget', onReject: 'TERMINATE', isActive: true,
        levels: [{ name: 'Finance', approverType: 'ROLE', approverRole: 'FINANCE', condition: { field: 'amountUsd', op: 'gt', value: 9999 } }],
      });
      stubContext = { amountUsd: '100.00' };
      const req = await approvalService.submitForApproval('Widget', 'w7', submitterId);
      expect(req?.status).toBe('APPROVED');
      expect(hookCalls).toContain('approved:w7');
    });
  });

  it('HR can also configure workflows', async () => {
    const hrToken = await loginAs(TEST_HR.email, TEST_HR.password);
    const res = await request(app).get('/api/v1/approvals/workflows').set('Authorization', `Bearer ${hrToken}`);
    expect(res.status).toBe(200);
  });
});

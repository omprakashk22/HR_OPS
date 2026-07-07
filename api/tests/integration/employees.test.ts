import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { prisma, resetDb } from './helpers/testDb';
import { seedHrUser, seedCurrencies, loginAsHr, employeePayload } from './helpers/fixtures';

let token: string;
const auth = () => `Bearer ${token}`;

async function createEmployee(overrides = {}) {
  return request(app).post('/api/v1/employees').set('Authorization', auth()).send(employeePayload(overrides));
}

describe('employee endpoints', () => {
  beforeEach(async () => {
    await resetDb();
    await seedHrUser();
    await seedCurrencies();
    token = await loginAsHr();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /employees', () => {
    it('creates an employee with an auto-numbered initial "Initial hire" salary row', async () => {
      const res = await createEmployee();
      expect(res.status).toBe(201);
      expect(res.body.employeeNumber).toBe('E00001');
      expect(res.body.salaryHistory).toHaveLength(1);
      expect(res.body.salaryHistory[0].reason).toBe('Initial hire');
      // 100000 GBP * 1.27 = 127000 USD
      expect(res.body.salaryHistory[0].annualUsd).toBe('127000.00');
    });

    it('rejects an invalid payload with 400', async () => {
      const res = await request(app)
        .post('/api/v1/employees')
        .set('Authorization', auth())
        .send(employeePayload({ level: 'NOPE' }));
      expect(res.status).toBe(400);
    });
  });

  describe('GET /employees', () => {
    it('returns a paginated list with current USD salary and honors filters', async () => {
      await createEmployee({ firstName: 'Ada', country: 'GB' });
      await createEmployee({ firstName: 'Grace', country: 'US', localCurrency: 'USD', currency: 'USD' });

      const all = await request(app).get('/api/v1/employees').set('Authorization', auth());
      expect(all.status).toBe(200);
      expect(all.body.total).toBe(2);
      expect(all.body.data[0].currentSalary.annualUsd).toBeTruthy();

      const gb = await request(app).get('/api/v1/employees?country=GB').set('Authorization', auth());
      expect(gb.body.total).toBe(1);
      expect(gb.body.data[0].firstName).toBe('Ada');

      const search = await request(app).get('/api/v1/employees?search=grace').set('Authorization', auth());
      expect(search.body.total).toBe(1);
      expect(search.body.data[0].firstName).toBe('Grace');
    });
  });

  describe('GET /employees/:id', () => {
    it('returns the employee with salary history oldest-first', async () => {
      const created = await createEmployee();
      const res = await request(app)
        .get(`/api/v1/employees/${created.body.id}`)
        .set('Authorization', auth());
      expect(res.status).toBe(200);
      expect(res.body.salaryHistory).toHaveLength(1);
    });

    it('returns 404 for an unknown id', async () => {
      const res = await request(app)
        .get('/api/v1/employees/00000000-0000-0000-0000-000000000000')
        .set('Authorization', auth());
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /employees/:id', () => {
    it('updates a profile field', async () => {
      const created = await createEmployee();
      const res = await request(app)
        .patch(`/api/v1/employees/${created.body.id}`)
        .set('Authorization', auth())
        .send({ department: 'Product' });
      expect(res.status).toBe(200);
      expect(res.body.department).toBe('Product');
    });
  });

  describe('DELETE /employees/:id', () => {
    it('soft-deletes: sets status TERMINATED, removes from default list, row still exists', async () => {
      const created = await createEmployee();
      const del = await request(app)
        .delete(`/api/v1/employees/${created.body.id}`)
        .set('Authorization', auth());
      expect(del.status).toBe(204);

      const list = await request(app).get('/api/v1/employees').set('Authorization', auth());
      expect(list.body.total).toBe(0);

      const still = await request(app)
        .get(`/api/v1/employees/${created.body.id}`)
        .set('Authorization', auth());
      expect(still.status).toBe(200);
      expect(still.body.status).toBe('TERMINATED');
    });
  });

  describe('POST /employees/:id/salary', () => {
    it('appends a salary change and it becomes the latest', async () => {
      const created = await createEmployee();
      const res = await request(app)
        .post(`/api/v1/employees/${created.body.id}/salary`)
        .set('Authorization', auth())
        .send({ baseSalary: '110000', bonus: '10000', currency: 'GBP', effectiveDate: '2023-01-01', reason: 'Annual raise' });
      expect(res.status).toBe(201);
      expect(res.body.salaryHistory).toHaveLength(2);
      const latest = res.body.salaryHistory[res.body.salaryHistory.length - 1];
      expect(latest.reason).toBe('Annual raise');
      // (110000 + 10000) * 1.27 = 152400
      expect(latest.annualUsd).toBe('152400.00');
    });
  });

  describe('auth guard', () => {
    it('rejects mutations without a token', async () => {
      const res = await request(app).post('/api/v1/employees').send(employeePayload());
      expect(res.status).toBe(401);
    });
  });
});

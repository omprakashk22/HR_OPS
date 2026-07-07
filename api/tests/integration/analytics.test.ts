import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { prisma, resetDb } from './helpers/testDb';
import { seedHrUser, seedCurrencies, loginAsHr } from './helpers/fixtures';

let token: string;
const auth = () => `Bearer ${token}`;

/**
 * Hand-computed fixture (single latest salary row per employee, bonus 0):
 *   annual_usd = baseSalary * rateToUsd   (USD rate 1, INR rate 0.012)
 *
 *   #  country gender level  currency  base        annual_usd
 *   1  US      MALE   L4     USD       120000      120000
 *   2  US      FEMALE L4     USD       100000      100000
 *   3  US      MALE   L4     USD        80000       80000
 *   4  IN      FEMALE L3     INR      5000000       60000
 *   5  IN      MALE   L3     INR      2500000       30000
 *   6  IN      FEMALE L3     INR      1500000       18000
 *   7  US      MALE   L4     USD       999999   (TERMINATED — must be excluded)
 *
 * Active set sorted: [18000, 30000, 60000, 80000, 100000, 120000]
 */
const FIXTURE = [
  { country: 'US', gender: 'MALE', level: 'L4_STAFF', currency: 'USD', base: '120000', status: 'ACTIVE' },
  { country: 'US', gender: 'FEMALE', level: 'L4_STAFF', currency: 'USD', base: '100000', status: 'ACTIVE' },
  { country: 'US', gender: 'MALE', level: 'L4_STAFF', currency: 'USD', base: '80000', status: 'ACTIVE' },
  { country: 'IN', gender: 'FEMALE', level: 'L3_SENIOR', currency: 'INR', base: '5000000', status: 'ACTIVE' },
  { country: 'IN', gender: 'MALE', level: 'L3_SENIOR', currency: 'INR', base: '2500000', status: 'ACTIVE' },
  { country: 'IN', gender: 'FEMALE', level: 'L3_SENIOR', currency: 'INR', base: '1500000', status: 'ACTIVE' },
  { country: 'US', gender: 'MALE', level: 'L4_STAFF', currency: 'USD', base: '999999', status: 'TERMINATED' },
] as const;

describe('analytics endpoints', () => {
  beforeEach(async () => {
    await resetDb();
    const user = await seedHrUser();
    await seedCurrencies();
    let n = 1;
    for (const f of FIXTURE) {
      await prisma.employee.create({
        data: {
          employeeNumber: `E${String(n).padStart(5, '0')}`,
          firstName: `First${n}`,
          lastName: `Last${n}`,
          gender: f.gender,
          country: f.country,
          department: 'Engineering',
          jobTitle: 'X',
          level: f.level,
          localCurrency: f.currency,
          hireDate: new Date('2020-01-01'),
          status: f.status,
          salaryHistory: {
            create: {
              baseSalary: f.base,
              bonus: '0',
              currency: f.currency,
              effectiveDate: new Date('2020-01-01'),
              reason: 'Initial hire',
              changedBy: user.id,
            },
          },
        },
      });
      n += 1;
    }
    token = await loginAsHr();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('summary: headcount, total, and percentiles over the ACTIVE set only', async () => {
    const res = await request(app).get('/api/v1/analytics/summary').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.headcount).toBe(6); // terminated excluded
    expect(res.body.totalPayrollUsd).toBe('408000.00');
    expect(res.body.median).toBe('70000.00'); // between 60000 and 80000
    expect(res.body.p25).toBe('37500.00');
    expect(res.body.p75).toBe('95000.00');
    expect(res.body.min).toBe('18000.00');
    expect(res.body.max).toBe('120000.00');
  });

  it('distribution by country: grouped medians and totals, ordered by total desc', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/distribution?groupBy=country')
      .set('Authorization', auth());
    expect(res.status).toBe(200);
    const [us, into] = res.body.groups;
    expect(us).toMatchObject({ group: 'US', headcount: 3, median: '100000.00', total: '300000.00' });
    expect(into).toMatchObject({ group: 'IN', headcount: 3, median: '30000.00', total: '108000.00' });
  });

  it('distribution rejects a non-whitelisted groupBy with 400', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/distribution?groupBy=firstName')
      .set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  it('histogram: buckets salaries into fixed bands', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/histogram?bucketSize=30000')
      .set('Authorization', auth());
    expect(res.status).toBe(200);
    const band = res.body.buckets.find((b: { floor: number }) => b.floor === 60000);
    expect(band.count).toBe(2); // 60000 and 80000 fall in the 60k band
    expect(band.label).toBe('60k–90k');
  });

  it('equity: gender medians and a headline gap %, plus a within-level breakdown', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/equity?dimension=gender&within=level')
      .set('Authorization', auth());
    expect(res.status).toBe(200);
    // MALE medians [30000,80000,120000]=80000; FEMALE [18000,60000,100000]=60000
    const male = res.body.overall.find((o: { value: string }) => o.value === 'MALE');
    const female = res.body.overall.find((o: { value: string }) => o.value === 'FEMALE');
    expect(male.median).toBe('80000.00');
    expect(female.median).toBe('60000.00');
    // gap = (80000 - 60000) / 80000 * 100 = 25
    expect(res.body.headlineGapPercent).toBe(25);
    // within L4: MALE [80000,120000]=100000
    const l4male = res.body.breakdown.find(
      (b: { within: string; value: string }) => b.within === 'L4_STAFF' && b.value === 'MALE',
    );
    expect(l4male.median).toBe('100000.00');
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/v1/analytics/summary');
    expect(res.status).toBe(401);
  });
});

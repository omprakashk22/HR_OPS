import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { prisma, resetDb } from './helpers/testDb';
import { seedHrUser, TEST_HR } from './helpers/fixtures';

describe('auth endpoints', () => {
  beforeEach(async () => {
    await resetDb();
    await seedHrUser();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('logs in with valid credentials and never leaks the password hash', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_HR.email, password: TEST_HR.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe(TEST_HR.email);
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects a wrong password with 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_HR.email, password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  it('rejects a malformed payload with 400', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('returns the current user for GET /me with a valid token', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_HR.email, password: TEST_HR.password });
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(TEST_HR.email);
  });

  it('rejects GET /me without a token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects GET /me with a garbage token', async () => {
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer garbage');
    expect(res.status).toBe(401);
  });
});

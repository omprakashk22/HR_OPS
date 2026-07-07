import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/auth/password';
import { signToken, verifyToken } from '../../src/auth/jwt';
import { loginSchema } from '../../src/auth/auth.schemas';

describe('password hashing', () => {
  it('verifies a correct password and rejects a wrong one', async () => {
    const hash = await hashPassword('s3cret-pw');
    expect(hash).not.toBe('s3cret-pw');
    expect(await verifyPassword('s3cret-pw', hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });
});

describe('jwt', () => {
  it('round-trips sub and role', () => {
    const token = signToken({ sub: 'user-1', role: 'HR_MANAGER' });
    const payload = verifyToken(token);
    expect(payload.sub).toBe('user-1');
    expect(payload.role).toBe('HR_MANAGER');
  });

  it('throws on a garbage/tampered token', () => {
    expect(() => verifyToken('not-a-jwt')).toThrow();
  });
});

describe('loginSchema', () => {
  it('accepts a valid login', () => {
    expect(loginSchema.safeParse({ email: 'hr@acme.test', password: 'x' }).success).toBe(true);
  });
  it('rejects a malformed email and an empty password', () => {
    expect(loginSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'hr@acme.test', password: '' }).success).toBe(false);
  });
});

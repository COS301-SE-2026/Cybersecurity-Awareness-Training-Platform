import { describe, expect, it } from 'vitest';
import { parseEnv } from '../../src/config/env.js';

const baseEnv = {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/insightful_phish_test',
};

describe('parseEnv', () => {
  it('allows demo auth token in development', () => {
    const env = parseEnv({ ...baseEnv, NODE_ENV: 'development' });
    expect(env.AUTH_TOKEN_SECRET).toBe('this-is-a-demo-auth-secret-token-change-before-production');
  });

  it('rejects demo auth token in production', () => {
    expect(() =>
      parseEnv({
        ...baseEnv,
        NODE_ENV: 'production',
        AUTH_TOKEN_SECRET: 'this-is-a-demo-auth-secret-token-change-before-production',
      }),
    ).toThrowError('AUTH_TOKEN_SECRET must be changed before deploying to production');
  });

  it('accepts a non-demo auth token in production', () => {
    const env = parseEnv({
      ...baseEnv,
      NODE_ENV: 'production',
      AUTH_TOKEN_SECRET: 'this-is-a-non-demo-auth-secret-token',
    });
    expect(env.AUTH_TOKEN_SECRET).toBe('this-is-a-non-demo-auth-secret-token');
  });
});

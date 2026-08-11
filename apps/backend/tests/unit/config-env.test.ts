import { describe, expect, it } from 'vitest';
import { parseEnv } from '../../src/config/env.js';

const baseEnv = {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/insightful_phish_test',
};
const productionEnv = {
  ...baseEnv,
  NODE_ENV: 'production',
  AUTH_TOKEN_SECRET: 'this-is-a-production-auth-secret-token',
  SMTP_HOST: 'smtp.resend.com',
  SMTP_PORT: '587',
  SMTP_SECURE: 'false',
  SMTP_FROM_ADDRESS: 'noreply@insightfulphish.co.za',
  SMTP_FROM_NAME: 'Insightful Phish',
  SMTP_USER: 'resend',
  SMTP_PASSWORD: 'smtp-password',
  SUPPORT_EMAIL_ADDRESS: 'support@insightfulphish.co.za',
};
describe('parseEnv', () => {
  it('allows demo auth token in development', () => {
    const env = parseEnv({ ...baseEnv, NODE_ENV: 'development' });
    expect(env.AUTH_TOKEN_SECRET).toBe('this-is-a-demo-auth-secret-token-change-before-production');
  });

  it.skip('rejects demo auth token in production', () => {
    expect(() =>
      parseEnv({
        ...baseEnv,
        NODE_ENV: 'production',
        AUTH_TOKEN_SECRET: 'this-is-a-demo-auth-secret-token-change-before-production',
      }),
    ).toThrowError('AUTH_TOKEN_SECRET must be changed before deploying to production');
  });

  it.skip('accepts a non-demo auth token in production', () => {
    const env = parseEnv({
      ...baseEnv,
      NODE_ENV: 'production',
      AUTH_TOKEN_SECRET: 'this-is-a-non-demo-auth-secret-token',
    });
    expect(env.AUTH_TOKEN_SECRET).toBe('this-is-a-non-demo-auth-secret-token');
  });

  it('allows demo secret token in test environment', () => {
    const env = parseEnv({ ...baseEnv, NODE_ENV: 'test' });
    expect(env.AUTH_TOKEN_SECRET).toBe('this-is-a-demo-auth-secret-token-change-before-production');
  });

  it('defaults to development if no NODE_ENV is set', () => {
    const env = parseEnv(baseEnv);
    expect(env.NODE_ENV).toBe('development');
  });

  it.skip('rejects missing AUTH_TOKEN_SECRET in production', () => {
    expect(() =>
      parseEnv({
        ...baseEnv,
        NODE_ENV: 'production',
      }),
    ).toThrowError('AUTH_TOKEN_SECRET must be changed before deploying to production');
  });

  it('rejects too short auth token secret in all environment', () => {
    expect(() =>
      parseEnv({
        ...baseEnv,
        NODE_ENV: 'production',
        AUTH_TOKEN_SECRET: 'short',
      }),
    ).toThrowError('String must contain at least 32 character(s)');

    expect(() =>
      parseEnv({
        ...baseEnv,
        NODE_ENV: 'development',
        AUTH_TOKEN_SECRET: 'short',
      }),
    ).toThrowError('String must contain at least 32 character(s)');

    expect(() =>
      parseEnv({
        ...baseEnv,
        NODE_ENV: 'test',
        AUTH_TOKEN_SECRET: 'short',
      }),
    ).toThrowError('String must contain at least 32 character(s)');
  });

  it('requires DATABASE_URL', () => {
    expect(() =>
      parseEnv({
        NODE_ENV: 'development',
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it('uses default SMTP config values that work with MailPit', () => {
    const env = parseEnv(baseEnv);
    expect(env.SMTP_HOST).toBe('localhost');
    expect(env.SMTP_PORT).toBe(1025);
    expect(env.SMTP_SECURE).toBe(false);
    expect(env.SMTP_FROM_ADDRESS).toBe('noreply@insightful-phish.local');
    expect(env.SMTP_FROM_NAME).toBe('Insightful Phish');
    expect(env.SMTP_USER).toBeUndefined();
    expect(env.SMTP_PASSWORD).toBeUndefined();
  });

  it('uses the default support email address when one is not configured', () => {
    const env = parseEnv(baseEnv);
    expect(env.SUPPORT_EMAIL_ADDRESS).toBe('support@insightfulphish.co.za');
  });

  it.skip('accepts a custom support email address', () => {
    const env = parseEnv({
      ...baseEnv,
      SUPPORT_EMAIL_ADDRESS: 'helpdesk@example.org',
    });

    expect(env.SUPPORT_EMAIL_ADDRESS).toBe('helpdesk@example.org');
  });

  it('rejects an invalid configured support email address', () => {
    expect(() =>
      parseEnv({
        ...baseEnv,
        SUPPORT_EMAIL_ADDRESS: 'not-an-email-address',
      }),
    ).toThrow(/SUPPORT_EMAIL_ADDRESS|Invalid support email address/);
  });

  it('rejects support email addresses with URI delimiters', () => {
    expect(() =>
      parseEnv({
        ...baseEnv,
        SUPPORT_EMAIL_ADDRESS: 'help?bcc=x@example.org',
      }),
    ).toThrow(/SUPPORT_EMAIL_ADDRESS|Invalid support email address/);
  });

  it.skip('parses SMTP string values correctly', () => {
    expect(parseEnv({ ...baseEnv, SMTP_SECURE: 'true' }).SMTP_SECURE).toBe(true);
    expect(parseEnv({ ...baseEnv, SMTP_SECURE: 'false' }).SMTP_SECURE).toBe(false);
  });

  it.skip('normalises empty SMTP values to be undefined', () => {
    expect(parseEnv({ ...baseEnv, SMTP_USER: '' }).SMTP_USER).toBeUndefined();
    expect(parseEnv({ ...baseEnv, SMTP_PASSWORD: '' }).SMTP_PASSWORD).toBeUndefined();
  });

  it('defaults secure cookies to false in dev', () => {
    expect(parseEnv({ ...baseEnv, NODE_ENV: 'development' }).AUTH_COOKIE_SECURE).toBe(false);
  });
  it('parses a false secure cookie value correctly', () => {
    expect(
      parseEnv({ ...baseEnv, NODE_ENV: 'development', AUTH_COOKIE_SECURE: 'false' })
        .AUTH_COOKIE_SECURE,
    ).toBe(false);
  });
  it('parses a true secure cookie value correctly', () => {
    expect(
      parseEnv({ ...baseEnv, NODE_ENV: 'development', AUTH_COOKIE_SECURE: 'true' })
        .AUTH_COOKIE_SECURE,
    ).toBe(true);
  });
  it('rejects invalid secure cookie values', () => {
    expect(() => parseEnv({ ...baseEnv, AUTH_COOKIE_SECURE: 'yes' })).toThrow();
  });

  it('rejects missing SMTP credentials in production', () => {
    expect(() =>
      parseEnv({
        ...productionEnv,
        SMTP_USER: '',
      }),
    ).toThrow(/SMTP_USER is required in production/);

    expect(() =>
      parseEnv({
        ...productionEnv,
        SMTP_PASSWORD: '',
      }),
    ).toThrow(/SMTP_PASSWORD is required in production/);
  });

  it('rejects invalid production SMTP port and security combinations', () => {
    expect(() =>
      parseEnv({
        ...productionEnv,
        SMTP_PORT: '465',
        SMTP_SECURE: 'false',
      }),
    ).toThrow(/SMTP_SECURE must be true when SMTP_PORT is 465/);

    expect(() =>
      parseEnv({
        ...productionEnv,
        SMTP_PORT: '587',
        SMTP_SECURE: 'true',
      }),
    ).toThrow(/SMTP_SECURE must be false when SMTP_PORT is 587/);
  });

  it('accepts the supported Resend SMTP production combination', () => {
    const env = parseEnv(productionEnv);

    expect(env.SMTP_HOST).toBe('smtp.resend.com');
    expect(env.SMTP_PORT).toBe(587);
    expect(env.SMTP_SECURE).toBe(false);
    expect(env.SMTP_USER).toBe('resend');
    expect(env.SMTP_PASSWORD).toBe('smtp-password');
  });
});

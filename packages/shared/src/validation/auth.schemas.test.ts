import { describe, expect, it } from 'vitest';
import { authLoginRequestSchema, authRegisterRequestSchema } from './auth.schemas.js';

describe('auth validation schemas', () => {
  it('normalizes valid register input', () => {
    const result = authRegisterRequestSchema.parse({
      email: '  TRAINEE@EXAMPLE.COM  ',
      password: 'StrongerPass1!',
      firstName: ' Jane ',
      lastName: ' Doe ',
    });

    expect(result).toEqual({
      email: 'trainee@example.com',
      password: 'StrongerPass1!',
      firstName: 'Jane',
      lastName: 'Doe',
    });
  });

  it('rejects invalid register input', () => {
    const result = authRegisterRequestSchema.safeParse({
      email: 'not-an-email',
      password: 'short',
      firstName: '',
      lastName: ' ',
    });

    expect(result.success).toBe(false);
  });

  it('rejects register payloads with unexpected fields', () => {
    const result = authRegisterRequestSchema.safeParse({
      email: 'trainee@example.com',
      password: 'StrongerPass1!',
      firstName: 'Jane',
      lastName: 'Doe',
      role: 'IP_ADMIN',
    });

    expect(result.success).toBe(false);
  });

  it('rejects register passwords shorter than 12 characters', () => {
    const result = authRegisterRequestSchema.safeParse({
      email: 'trainee@example.com',
      password: 'Short1!',
      firstName: 'Jane',
      lastName: 'Doe',
    });

    expect(result.success).toBe(false);
  });

  it('rejects register passwords without a lowercase letter', () => {
    const result = authRegisterRequestSchema.safeParse({
      email: 'trainee@example.com',
      password: 'STRONGERPASS1!',
      firstName: 'Jane',
      lastName: 'Doe',
    });

    expect(result.success).toBe(false);
  });

  it('rejects register passwords without an uppercase letter', () => {
    const result = authRegisterRequestSchema.safeParse({
      email: 'trainee@example.com',
      password: 'strongerpass1!',
      firstName: 'Jane',
      lastName: 'Doe',
    });

    expect(result.success).toBe(false);
  });

  it('rejects register passwords without a number', () => {
    const result = authRegisterRequestSchema.safeParse({
      email: 'trainee@example.com',
      password: 'StrongerPass!',
      firstName: 'Jane',
      lastName: 'Doe',
    });

    expect(result.success).toBe(false);
  });

  it('rejects register passwords without a special character', () => {
    const result = authRegisterRequestSchema.safeParse({
      email: 'trainee@example.com',
      password: 'StrongerPass1',
      firstName: 'Jane',
      lastName: 'Doe',
    });

    expect(result.success).toBe(false);
  });

  it('does not count whitespace as a register password special character', () => {
    const result = authRegisterRequestSchema.safeParse({
      email: 'trainee@example.com',
      password: 'Stronger Pass1',
      firstName: 'Jane',
      lastName: 'Doe',
    });

    expect(result.success).toBe(false);
  });

  it('rejects whitespace-only register names after trimming', () => {
    const result = authRegisterRequestSchema.safeParse({
      email: 'trainee@example.com',
      password: 'StrongerPass1!',
      firstName: '   ',
      lastName: '\t',
    });

    expect(result.success).toBe(false);
  });

  it('normalizes valid login input', () => {
    const result = authLoginRequestSchema.parse({
      email: '  TRAINEE@EXAMPLE.COM  ',
      password: 'password',
    });

    expect(result).toEqual({
      email: 'trainee@example.com',
      password: 'password',
    });
  });

  it('keeps login password validation weaker than registration', () => {
    const result = authLoginRequestSchema.safeParse({
      email: 'trainee@example.com',
      password: 'legacy',
    });

    expect(result.success).toBe(true);
  });

  it('rejects login payloads with unexpected fields', () => {
    const result = authLoginRequestSchema.safeParse({
      email: 'trainee@example.com',
      password: 'password',
      rememberMe: true,
    });

    expect(result.success).toBe(false);
  });
});

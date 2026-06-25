import { describe, expect, it } from 'vitest';
import {
  authLoginRequestSchema,
  authRegisterRequestSchema,
  setupCompleteRequestSchema,
} from './auth.schemas.js';

describe('auth validation schemas', () => {
  const registerIssueMessagesFor = (
    result: ReturnType<typeof authRegisterRequestSchema.safeParse>,
  ) => {
    if (result.success) {
      return [];
    }

    return result.error.issues.map((issue) => issue.message);
  };

  const setupIssueMessagesFor = (
    result: ReturnType<typeof setupCompleteRequestSchema.safeParse>,
  ) => {
    if (result.success) {
      return [];
    }

    return result.error.issues.map((issue) => issue.message);
  };

  const validRegisterInput = (
    overrides: Partial<{
      email: string;
      password: string;
      confirmPassword: string;
      firstName: string;
      lastName: string;
      role: string;
    }> = {},
  ) => ({
    email: 'trainee@example.com',
    password: 'StrongerPass1!',
    confirmPassword: 'StrongerPass1!',
    firstName: 'Jane',
    lastName: 'Doe',
    ...overrides,
  });

  const validLoginInput = (
    overrides: Partial<{
      email: string;
      password: string;
      rememberMe: boolean;
    }> = {},
  ) => ({
    email: 'trainee@example.com',
    password: 'password',
    ...overrides,
  });

  it('normalizes valid register input', () => {
    const result = authRegisterRequestSchema.parse(
      validRegisterInput({
        email: '  TRAINEE@EXAMPLE.COM  ',
        firstName: ' Jane ',
        lastName: ' Doe ',
      }),
    );

    expect(result).toEqual({
      email: 'trainee@example.com',
      password: 'StrongerPass1!',
      confirmPassword: 'StrongerPass1!',
      firstName: 'Jane',
      lastName: 'Doe',
    });
  });

  it('rejects register input without password confirmation', () => {
    const result = authRegisterRequestSchema.safeParse({
      email: '  TRAINEE@EXAMPLE.COM  ',
      password: 'StrongerPass1!',
      firstName: ' Jane ',
      lastName: ' Doe ',
    });

    expect(result.success).toBe(false);
    expect(registerIssueMessagesFor(result)).toContain('Please confirm your password.');
  });

  it('rejects invalid register input', () => {
    const result = authRegisterRequestSchema.safeParse({
      email: 'not-an-email',
      password: 'short',
      confirmPassword: 'different-password',
      firstName: '',
      lastName: ' ',
    });

    expect(result.success).toBe(false);
    expect(registerIssueMessagesFor(result)).toEqual(
      expect.arrayContaining([
        'Please enter a valid email address.',
        'Please enter a first name.',
        'Please enter a last name.',
      ]),
    );
  });

  it('rejects register payloads with unexpected fields', () => {
    const result = authRegisterRequestSchema.safeParse(validRegisterInput({ role: 'IP_ADMIN' }));

    expect(result.success).toBe(false);
  });

  it('rejects register input when password confirmation does not match', () => {
    const result = authRegisterRequestSchema.safeParse(
      validRegisterInput({ confirmPassword: 'DifferentPass1!' }),
    );

    expect(result.success).toBe(false);
    expect(registerIssueMessagesFor(result)).toContain(
      'Password confirmation must match password.',
    );
  });

  it('requires password confirmation for setup completion input', () => {
    const result = setupCompleteRequestSchema.safeParse({
      password: 'StrongerPass1!',
      firstName: 'Jane',
      lastName: 'Doe',
    });

    expect(result.success).toBe(false);
    expect(setupIssueMessagesFor(result)).toContain('Please confirm your password.');
  });

  it.each([
    ['shorter than 12 characters', 'Short1!', 'Password must be at least 12 characters long'],
    [
      'without a lowercase letter',
      'STRONGERPASS1!',
      'Password must contain at least one lowercase letter',
    ],
    [
      'without an uppercase letter',
      'strongerpass1!',
      'Password must contain at least one uppercase letter',
    ],
    ['without a number', 'StrongerPass!', 'Password must contain at least one number'],
    [
      'without a special character',
      'StrongerPass1',
      'Password must contain at least one special character',
    ],
    [
      'with whitespace as the only special character',
      'Stronger Pass1',
      'Password must contain at least one special character',
    ],
  ])('rejects register passwords %s', (_caseName, password, expectedMessage) => {
    const result = authRegisterRequestSchema.safeParse(validRegisterInput({ password }));

    expect(result.success).toBe(false);
    expect(registerIssueMessagesFor(result)).toContain(expectedMessage);
  });

  it('rejects register fields over maximum length', () => {
    const result = authRegisterRequestSchema.safeParse(
      validRegisterInput({
        email: `${'a'.repeat(250)}@example.com`,
        password: `${'A'.repeat(126)}a1!`,
        firstName: 'J'.repeat(101),
        lastName: 'D'.repeat(101),
      }),
    );

    expect(result.success).toBe(false);
    expect(registerIssueMessagesFor(result)).toEqual(
      expect.arrayContaining([
        'Email address must be at most 254 characters.',
        'Password must be at most 128 characters long',
        'First name must be at most 100 characters.',
        'Last name must be at most 100 characters.',
      ]),
    );
  });

  it('rejects whitespace-only register names after trimming', () => {
    const result = authRegisterRequestSchema.safeParse(
      validRegisterInput({
        firstName: '   ',
        lastName: '\t',
      }),
    );

    expect(result.success).toBe(false);
  });

  it('normalizes valid login input', () => {
    const result = authLoginRequestSchema.parse(
      validLoginInput({
        email: '  TRAINEE@EXAMPLE.COM  ',
      }),
    );

    expect(result).toEqual({
      email: 'trainee@example.com',
      password: 'password',
    });
  });

  it('keeps login password validation weaker than registration', () => {
    const result = authLoginRequestSchema.safeParse(validLoginInput({ password: 'legacy' }));

    expect(result.success).toBe(true);
  });

  it('rejects empty and too-long login passwords without requiring register strength', () => {
    expect(authLoginRequestSchema.safeParse(validLoginInput({ password: '' })).success).toBe(false);

    const tooLongResult = authLoginRequestSchema.safeParse(
      validLoginInput({ password: 'a'.repeat(129) }),
    );

    expect(tooLongResult.success).toBe(false);
    if (!tooLongResult.success) {
      expect(tooLongResult.error.issues.map((issue) => issue.message)).toContain(
        'Password must be at most 128 characters long.',
      );
    }
  });

  it('rejects login payloads with unexpected fields', () => {
    const result = authLoginRequestSchema.safeParse(validLoginInput({ rememberMe: true }));

    expect(result.success).toBe(false);
  });
});

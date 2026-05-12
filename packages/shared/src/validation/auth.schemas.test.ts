import { describe, expect, it } from 'vitest';
import { authLoginRequestSchema, authRegisterRequestSchema } from './auth.schemas.js';

describe('auth validation schemas', () => {
  it('normalizes valid register input', () => {
    const result = authRegisterRequestSchema.parse({
      email: '  LEARNER@EXAMPLE.COM  ',
      password: 'password123',
      firstName: ' Jane ',
      lastName: ' Doe ',
    });

    expect(result).toEqual({
      email: 'learner@example.com',
      password: 'password123',
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

  it('normalizes valid login input', () => {
    const result = authLoginRequestSchema.parse({
      email: '  LEARNER@EXAMPLE.COM  ',
      password: 'password123',
    });

    expect(result).toEqual({
      email: 'learner@example.com',
      password: 'password123',
    });
  });
});

import { describe, expect, it } from 'vitest';
import {
  createTraineeInvitationRequestSchema,
  createTraineeInvitationResponseSchema,
  disableTraineeRequestSchema,
  disableTraineeResponseSchema,
  organisationTraineeParamsSchema,
  organisationTraineesParamsSchema,
  traineeListItemSchema,
} from './organisation-trainee.js';

describe('organisationTraineesParamsSchema', () => {
  it('accepts valid UUIDs', () => {
    const valid = { organisationId: '11111111-1111-4111-8111-111111111111' };
    expect(organisationTraineesParamsSchema.parse(valid)).toEqual(valid);
  });

  it('rejects invalid UUIDs and extra properties due to strict mode', () => {
    expect(
      organisationTraineesParamsSchema.safeParse({ organisationId: 'not-a-uuid' }).success,
    ).toBe(false);
    expect(
      organisationTraineesParamsSchema.safeParse({
        organisationId: '11111111-1111-4111-8111-111111111111',
        extra: true,
      }).success,
    ).toBe(false);
  });
});

describe('organisationTraineeParamsSchema', () => {
  it('accepts valid organisationId and traineeId UUIDs', () => {
    const valid = {
      organisationId: '11111111-1111-4111-8111-111111111111',
      traineeId: '22222222-2222-4222-8222-222222222222',
    };
    expect(organisationTraineeParamsSchema.parse(valid)).toEqual(valid);
  });

  it('rejects missing or invalid UUIDs and extra fields', () => {
    expect(
      organisationTraineeParamsSchema.safeParse({
        organisationId: '11111111-1111-4111-8111-111111111111',
      }).success,
    ).toBe(false);
    expect(
      organisationTraineeParamsSchema.safeParse({
        organisationId: '11111111-1111-4111-8111-111111111111',
        traineeId: 'bad-id',
      }).success,
    ).toBe(false);
  });
});

describe('createTraineeInvitationRequestSchema', () => {
  it('accepts valid email, lowercases and trims it, with optional first and last names', () => {
    const input = {
      email: '  Trainee.User@EXAMPLE.com  ',
      firstName: ' John ',
      lastName: ' Doe ',
    };
    const parsed = createTraineeInvitationRequestSchema.parse(input);
    expect(parsed.email).toBe('trainee.user@example.com');
    expect(parsed.firstName).toBe('John');
    expect(parsed.lastName).toBe('Doe');
  });

  it('rejects emails over 254 characters and names over 100 characters', () => {
    const longEmail = `${'a'.repeat(245)}@domain.com`;
    expect(createTraineeInvitationRequestSchema.safeParse({ email: longEmail }).success).toBe(
      false,
    );
    expect(
      createTraineeInvitationRequestSchema.safeParse({
        email: 'test@example.com',
        firstName: 'a'.repeat(101),
      }).success,
    ).toBe(false);
  });

  it('rejects extra fields due to strict validation', () => {
    expect(
      createTraineeInvitationRequestSchema.safeParse({
        email: 'trainee@example.com',
        role: 'ADMIN',
      }).success,
    ).toBe(false);
  });
});

describe('disableTraineeRequestSchema', () => {
  it('accepts password and true confirmation', () => {
    const input = {
      password: 'securePassword123!',
      confirmation: true as const,
    };
    expect(disableTraineeRequestSchema.parse(input)).toEqual(input);
  });

  it('rejects extra fields or missing confirmation', () => {
    expect(
      disableTraineeRequestSchema.safeParse({
        password: 'securePassword123!',
      }).success,
    ).toBe(false);

    expect(
      disableTraineeRequestSchema.safeParse({
        password: 'securePassword123!',
        confirmation: true,
        extra: true,
      }).success,
    ).toBe(false);
  });
});

describe('traineeListItemSchema', () => {
  it('accepts valid list items and drops sensitive data', () => {
    const validItem = {
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      status: 'ACTIVE',
    };
    expect(traineeListItemSchema.safeParse(validItem).success).toBe(true);
  });
});

describe('Response Schemas', () => {
  it('disableTraineeResponseSchema enforces strict structure', () => {
    const valid = {
      success: true as const,
      message: 'Trainee account has been disabled.',
    };
    expect(disableTraineeResponseSchema.safeParse(valid).success).toBe(true);
    expect(disableTraineeResponseSchema.safeParse({ ...valid, extra: true }).success).toBe(false);
  });

  it('createTraineeInvitationResponseSchema enforces strict structure', () => {
    const valid = {
      success: true as const,
      message: 'Invitation sent.',
    };
    expect(createTraineeInvitationResponseSchema.safeParse(valid).success).toBe(true);
  });
});

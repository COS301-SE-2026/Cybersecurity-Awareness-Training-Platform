import { describe, expect, it } from 'vitest';
import {
  invitationAcceptRequestSchema,
  invitationAcceptResponseSchema,
  invitationActionResponseSchema,
  invitationContextResponseSchema,
  invitationIdParamsSchema,
  invitationRejectRequestSchema,
  invitationRejectResponseSchema,
  invitationResendResponseSchema,
  invitationRevokeResponseSchema,
  invitationTokenParamsSchema,
} from './invitation.js';

describe('invitationTokenParamsSchema', () => {
  it('accepts valid base64url or UUID tokens within length constraints', () => {
    const validUuid = '11111111-1111-4111-8111-111111111111';
    expect(invitationTokenParamsSchema.parse({ token: validUuid })).toEqual({
      token: validUuid,
    });

    const validBase64Url = 'aB1_cD2-eF3_gH4-iJ5_kL6-mN7_oP8-qR9_sT0-uV1_w';
    expect(invitationTokenParamsSchema.parse({ token: validBase64Url })).toEqual({
      token: validBase64Url,
    });
  });

  it('rejects tokens that are too short', () => {
    const shortToken = 'short-token-123';
    const result = invitationTokenParamsSchema.safeParse({ token: shortToken });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        'Invitation token must be at least 32 characters long.',
      );
    }
  });

  it('rejects tokens that contain invalid characters', () => {
    const invalidCharsToken = 'invalid.token/with+symbols$111111111111111111111';
    const result = invitationTokenParamsSchema.safeParse({ token: invalidCharsToken });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        'Invitation token must be a valid UUID or URL-safe base64 string.',
      );
    }
  });

  it('enforces strict object schema (rejects extra fields)', () => {
    const result = invitationTokenParamsSchema.safeParse({
      token: '11111111-1111-4111-8111-111111111111',
      extra: 'polluted',
    });
    expect(result.success).toBe(false);
  });
});

describe('invitationAcceptRequestSchema', () => {
  it('accepts valid optional confirmRoleChange boolean', () => {
    expect(invitationAcceptRequestSchema.parse({ confirmRoleChange: true })).toEqual({
      confirmRoleChange: true,
    });
    expect(invitationAcceptRequestSchema.parse({})).toEqual({});
  });

  it('rejects payload pollution due to strict mode', () => {
    const result = invitationAcceptRequestSchema.safeParse({
      confirmRoleChange: true,
      unauthorizedField: 'attack',
    });
    expect(result.success).toBe(false);
  });
});

describe('invitationRejectRequestSchema', () => {
  it('accepts optional rejection reason up to 255 characters', () => {
    expect(invitationRejectRequestSchema.parse({ rejectionReason: 'Not interested' })).toEqual({
      rejectionReason: 'Not interested',
    });
    expect(invitationRejectRequestSchema.parse({})).toEqual({});
  });

  it('rejects rejection reasons exceeding 255 characters', () => {
    const longReason = 'a'.repeat(256);
    const result = invitationRejectRequestSchema.safeParse({ rejectionReason: longReason });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        'Rejection reason must be at most 255 characters.',
      );
    }
  });

  it('rejects payload pollution due to strict mode', () => {
    const result = invitationRejectRequestSchema.safeParse({
      rejectionReason: 'No thanks',
      extra: 123,
    });
    expect(result.success).toBe(false);
  });
});

describe('invitationContextResponseSchema', () => {
  const baseValidResponse = {
    requiredAction: 'CONFIRM_ROLE_CHANGE' as const,
    rejectAllowed: true,
    status: 'PENDING' as const,
    expiresAt: '2026-12-31T23:59:59.000Z',
    invitationType: 'ORGANISATION_TRAINEE' as const,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'Insightful Phish Org',
    roleGranted: 'ORGANISATION_TRAINEE' as const,
    permissions: ['VIEW_ORGANISATION_TRAINEES'],
  };

  it('accepts a valid context response object for CONFIRM_ROLE_CHANGE', () => {
    expect(invitationContextResponseSchema.parse(baseValidResponse)).toEqual(baseValidResponse);
  });

  it('enforces that organisation details must be present for CONFIRM_ROLE_CHANGE if organisation-scoped', () => {
    const invalid = {
      ...baseValidResponse,
      organisationId: undefined,
      organisationName: undefined,
    };
    const result = invitationContextResponseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain(
        'organisationId must be present for CONFIRM_ROLE_CHANGE if invitationType is organisation-scoped.',
      );
      expect(messages).toContain(
        'organisationName must be present for CONFIRM_ROLE_CHANGE if invitationType is organisation-scoped.',
      );
    }
  });

  it('accepts valid privacy-minimized response for CONTINUE_SETUP', () => {
    const validSetupResponse = {
      requiredAction: 'CONTINUE_SETUP' as const,
      rejectAllowed: false,
      status: 'PENDING' as const,
      expiresAt: '2026-12-31T23:59:59.000Z',
    };
    expect(invitationContextResponseSchema.parse(validSetupResponse)).toEqual(validSetupResponse);
  });
});

describe('invitationAcceptResponseSchema and invitationRejectResponseSchema', () => {
  it('validates accept response strictly', () => {
    expect(
      invitationAcceptResponseSchema.parse({
        success: true,
        message: 'Invitation accepted successfully.',
      }),
    ).toEqual({
      success: true,
      message: 'Invitation accepted successfully.',
    });
  });

  it('validates reject response strictly', () => {
    expect(
      invitationRejectResponseSchema.parse({
        success: true,
        message: 'Invitation rejected successfully.',
      }),
    ).toEqual({
      success: true,
      message: 'Invitation rejected successfully.',
    });
  });
});

describe('invitationIdParamsSchema', () => {
  it('accepts valid invitationId UUID', () => {
    const valid = { invitationId: '11111111-1111-4111-8111-111111111111' };
    expect(invitationIdParamsSchema.parse(valid)).toEqual(valid);
  });

  it('rejects invalid UUID or extra fields in strict mode', () => {
    expect(invitationIdParamsSchema.safeParse({ invitationId: 'not-uuid' }).success).toBe(false);
    expect(
      invitationIdParamsSchema.safeParse({
        invitationId: '11111111-1111-4111-8111-111111111111',
        extra: 'field',
      }).success,
    ).toBe(false);
  });
});

describe('invitation resend and revoke response schemas', () => {
  it('validates invitationActionResponseSchema strictly', () => {
    const valid = {
      success: true as const,
      message: 'Action completed',
      invitationId: '11111111-1111-4111-8111-111111111111',
      status: 'REVOKED' as const,
    };
    expect(invitationActionResponseSchema.parse(valid)).toEqual(valid);
  });

  it('validates invitationResendResponseSchema strictly without token leakage', () => {
    const valid = {
      success: true as const,
      message: 'Resent invitation link',
      invitationId: '11111111-1111-4111-8111-111111111111',
      status: 'SENT' as const,
      resentAt: '2026-07-15T08:00:00.000Z',
    };
    expect(invitationResendResponseSchema.parse(valid)).toEqual(valid);
    expect(
      invitationResendResponseSchema.safeParse({
        ...valid,
        rawToken: 'secret_token_123',
      }).success,
    ).toBe(false);
  });

  it('validates invitationRevokeResponseSchema strictly', () => {
    const valid = {
      success: true as const,
      message: 'Invitation revoked',
      invitationId: '11111111-1111-4111-8111-111111111111',
      status: 'REVOKED' as const,
      revokedAt: '2026-07-15T08:00:00.000Z',
    };
    expect(invitationRevokeResponseSchema.parse(valid)).toEqual(valid);
  });
});

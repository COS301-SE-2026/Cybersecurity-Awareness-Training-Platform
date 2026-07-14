import { describe, expect, it } from 'vitest';
import {
  invitationAcceptRequestSchema,
  invitationAcceptResponseSchema,
  invitationContextResponseSchema,
  invitationRejectRequestSchema,
  invitationRejectResponseSchema,
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
    invitationType: 'ORGANISATION_TRAINEE' as const,
    targetEmail: 'trainee@example.com',
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'Insightful Phish Org',
    roleGranted: 'ORGANISATION_TRAINEE' as const,
    accountExists: true,
    requiresLogin: true,
    requiresSetup: false,
    status: 'PENDING' as const,
    expiresAt: '2026-12-31T23:59:59.000Z',
  };

  it('accepts a valid context response object', () => {
    expect(invitationContextResponseSchema.parse(baseValidResponse)).toEqual(baseValidResponse);
  });

  it('enforces matrix check: when accountExists is false, requiresSetup must be true', () => {
    const invalidMatrix = {
      ...baseValidResponse,
      accountExists: false,
      requiresSetup: false,
    };
    const result = invitationContextResponseSchema.safeParse(invalidMatrix);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        'When accountExists is false, requiresSetup must be true.',
      );
    }

    const validMatrix = {
      ...baseValidResponse,
      accountExists: false,
      requiresSetup: true,
    };
    expect(invitationContextResponseSchema.parse(validMatrix)).toEqual(validMatrix);
  });

  it('enforces that organisationId and organisationName must be present when invitationType is organisation-scoped', () => {
    const missingOrgDetails = {
      ...baseValidResponse,
      invitationType: 'ORGANISATION_ADMIN' as const,
      organisationId: undefined,
      organisationName: undefined,
    };
    const result = invitationContextResponseSchema.safeParse(missingOrgDetails);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain(
        'organisationId must be present if invitationType is organisation-scoped.',
      );
      expect(messages).toContain(
        'organisationName must be present if invitationType is organisation-scoped.',
      );
    }
  });

  it('allows optional organisationId and organisationName for non organisation-scoped invitations', () => {
    const platformAdminResponse = {
      ...baseValidResponse,
      invitationType: 'PLATFORM_ADMIN' as const,
      roleGranted: 'PLATFORM_ADMIN' as const,
      organisationId: undefined,
      organisationName: undefined,
    };
    expect(invitationContextResponseSchema.parse(platformAdminResponse)).toEqual(
      platformAdminResponse,
    );
  });

  it('rejects invalid email formats', () => {
    const invalidEmail = {
      ...baseValidResponse,
      targetEmail: 'not-an-email',
    };
    const result = invitationContextResponseSchema.safeParse(invalidEmail);
    expect(result.success).toBe(false);
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

import { describe, expect, it } from 'vitest';
import {
  accountCapabilitiesResponseSchema,
  accountDeletionBlockedReasonSchema,
  accountResponseSchema,
} from './account-settings.schemas.js';

describe('account-settings validation schemas', () => {
  const validAccountPayload = {
    profile: {
      id: 'user-1',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@example.com',
      userType: 'ORGANISATION_ADMIN',
      authStatus: 'ACTIVE',
      emailVerified: true,
      emailVerifiedAt: '2026-08-31T08:00:00.000Z',
      createdAt: '2026-08-01T08:00:00.000Z',
      updatedAt: '2026-08-31T08:00:00.000Z',
    },
    securityPreferences: {
      id: 'pref-1',
      preferredRegularSessionLengthHours: 8,
      preferredRememberMeSessionLengthHours: 72,
      preferredIdleTimeoutMinutes: 30,
      updatedAt: '2026-08-31T08:00:00.000Z',
    },
    effectivePolicy: {
      organisationId: 'org-1',
      rememberMeRequested: false,
      rememberMeAllowed: true,
      rememberMeApplied: false,
      regularSessionSeconds: 900,
      rememberedSessionSeconds: 604800,
      effectiveSessionSeconds: 900,
      idleTimeoutMinutes: 30,
      requireReauthenticationForSensitiveActions: true,
      allowEmailChange: true,
      sources: {
        rememberMe: 'PLATFORM_DEFAULT',
      },
    },
    capabilities: {
      canEditProfile: true,
      canRequestEmailChange: true,
      canChangePassword: true,
      canEditSecurityPreferences: true,
      canDeleteAccount: false,
      securityPreferenceEditable: {
        preferredRegularSessionLengthHours: true,
        preferredRememberMeSessionLengthHours: true,
        preferredIdleTimeoutMinutes: true,
      },
      blockedReasons: {
        emailChange: null,
        securityPreferences: null,
        preferredRegularSessionLengthHours: null,
        preferredRememberMeSessionLengthHours: null,
        preferredIdleTimeoutMinutes: null,
        deleteAccount: 'ORGANISATION_ADMIN_MANAGED' as const,
      },
    },
  };

  it('validates a correct account response payload', () => {
    const result = accountResponseSchema.safeParse(validAccountPayload);
    expect(result.success).toBe(true);
  });

  it('validates all supported deletion blocked reason enum values', () => {
    const supportedReasons = [
      'PLATFORM_SELF_DELETION_NOT_SUPPORTED',
      'ORGANISATION_ADMIN_MANAGED',
      'ORGANISATION_TRAINEE_MANAGED',
      'SELF_DELETION_NOT_SUPPORTED',
    ] as const;

    for (const reason of supportedReasons) {
      expect(accountDeletionBlockedReasonSchema.safeParse(reason).success).toBe(true);
      const capResult = accountCapabilitiesResponseSchema.safeParse({
        ...validAccountPayload.capabilities,
        blockedReasons: {
          ...validAccountPayload.capabilities.blockedReasons,
          deleteAccount: reason,
        },
      });
      expect(capResult.success).toBe(true);
    }
  });

  it('rejects unsupported deletion blocked reasons', () => {
    const invalidReasonResult = accountDeletionBlockedReasonSchema.safeParse('UNSUPPORTED_REASON');
    expect(invalidReasonResult.success).toBe(false);

    const capResult = accountCapabilitiesResponseSchema.safeParse({
      ...validAccountPayload.capabilities,
      blockedReasons: {
        ...validAccountPayload.capabilities.blockedReasons,
        deleteAccount: 'UNSUPPORTED_REASON',
      },
    });
    expect(capResult.success).toBe(false);
  });

  it('rejects invalid account responses with missing required capability fields', () => {
    const incompletePayload = {
      ...validAccountPayload,
      capabilities: {
        canEditProfile: true,
      },
    };
    expect(accountResponseSchema.safeParse(incompletePayload).success).toBe(false);
  });
});

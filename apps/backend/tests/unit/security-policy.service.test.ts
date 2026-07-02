import { beforeEach, describe, expect, it, vi } from 'vitest';

const securitySettingsRepositoryMock = vi.hoisted(() => ({
  DEFAULT_ORGANISATION_SECURITY_SETTINGS: {
    enforceRememberMePolicy: true,
    allowRememberMe: true,
    maxRememberedSessionHours: 168,
    enforceRegularSessionLength: true,
    regularSessionLengthHours: 8,
    enforceIdleTimeout: false,
    idleTimeoutMinutes: null,
    requireReauthenticationForSensitiveActions: true,
    allowTraineeEmailChange: true,
  },
  ensureDefaultOrganisationSecuritySettings: vi.fn(),
  findOrganisationSecuritySettings: vi.fn(),
  findUserSecurityPreferences: vi.fn(),
}));

vi.mock(
  '../../src/repositories/security-settings.repository.js',
  () => securitySettingsRepositoryMock,
);

import {
  canUserChangeOwnEmail,
  organisationIdForSecurityPolicy,
  resolveEffectiveSecurityPolicy,
} from '../../src/services/security-policy.service.js';
import type { GuardAuthSubject } from '../../src/services/auth-status-guard.service.js';

const platform = {
  regularSessionSeconds: 900,
  rememberedSessionSeconds: 604800,
  idleTimeoutMinutes: 30,
  allowRememberMe: true,
  requireReauthenticationForSensitiveActions: true,
  allowEmailChange: true,
};

function organisationTraineeSubject(): GuardAuthSubject {
  return {
    user: {
      id: 'user-1',
      userType: 'ORGANISATION_TRAINEE',
      authStatus: 'ACTIVE',
    },
    organisationTraineeProfile: {
      membershipStatus: 'ACTIVE',
      organisation: {
        id: 'org-1',
        status: 'ACTIVE',
      },
    },
  };
}

function organisationAdminSubject(): GuardAuthSubject {
  return {
    user: {
      id: 'admin-user-1',
      userType: 'ORGANISATION_ADMIN',
      authStatus: 'ACTIVE',
    },
    organisationAdminProfile: {
      adminStatus: 'ACTIVE',
      organisation: {
        id: 'org-1',
        status: 'ACTIVE',
      },
    },
  };
}

describe('security policy service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    securitySettingsRepositoryMock.findOrganisationSecuritySettings.mockResolvedValue(null);
    securitySettingsRepositoryMock.findUserSecurityPreferences.mockResolvedValue(null);
    securitySettingsRepositoryMock.ensureDefaultOrganisationSecuritySettings.mockResolvedValue(1);
  });

  it('resolves organisation trainee policy from organisation settings', async () => {
    securitySettingsRepositoryMock.findOrganisationSecuritySettings.mockResolvedValue({
      organisationId: 'org-1',
      enforceRememberMePolicy: true,
      allowRememberMe: false,
      maxRememberedSessionHours: 12,
      enforceRegularSessionLength: true,
      regularSessionLengthHours: 2,
      enforceIdleTimeout: true,
      idleTimeoutMinutes: 10,
      requireReauthenticationForSensitiveActions: false,
      allowTraineeEmailChange: false,
    });
    securitySettingsRepositoryMock.findUserSecurityPreferences.mockResolvedValue({
      userId: 'user-1',
      preferredRegularSessionLengthHours: 20,
      preferredRememberMeSessionLengthHours: 100,
      preferredIdleTimeoutMinutes: 60,
    });

    await expect(
      resolveEffectiveSecurityPolicy({
        subject: organisationTraineeSubject(),
        rememberMeRequested: true,
        platform,
      }),
    ).resolves.toMatchObject({
      organisationId: 'org-1',
      rememberMeAllowed: false,
      rememberMeApplied: false,
      regularSessionSeconds: 7200,
      effectiveSessionSeconds: 7200,
      idleTimeoutMinutes: 10,
      requireReauthenticationForSensitiveActions: false,
      allowEmailChange: false,
      sources: {
        rememberMe: 'ORGANISATION_POLICY',
        regularSession: 'ORGANISATION_POLICY',
        idleTimeout: 'ORGANISATION_POLICY',
      },
    });
  });

  it('uses user preferences for general trainees without loading organisation settings', async () => {
    securitySettingsRepositoryMock.findUserSecurityPreferences.mockResolvedValue({
      userId: 'user-2',
      preferredRegularSessionLengthHours: 4,
      preferredRememberMeSessionLengthHours: 48,
      preferredIdleTimeoutMinutes: 20,
    });

    await expect(
      resolveEffectiveSecurityPolicy({
        subject: {
          user: {
            id: 'user-2',
            userType: 'GENERAL_TRAINEE',
            authStatus: 'ACTIVE',
          },
        },
        rememberMeRequested: true,
        platform,
      }),
    ).resolves.toMatchObject({
      organisationId: null,
      regularSessionSeconds: 14400,
      rememberedSessionSeconds: 172800,
      idleTimeoutMinutes: 20,
      allowEmailChange: true,
      sources: {
        regularSession: 'USER_PREFERENCE',
        rememberedSession: 'USER_PREFERENCE',
        idleTimeout: 'USER_PREFERENCE',
      },
    });
    expect(securitySettingsRepositoryMock.findOrganisationSecuritySettings).not.toHaveBeenCalled();
    expect(
      securitySettingsRepositoryMock.ensureDefaultOrganisationSecuritySettings,
    ).not.toHaveBeenCalled();
  });

  it('defaults missing organisation settings without blocking login policy resolution', async () => {
    await expect(
      resolveEffectiveSecurityPolicy({
        subject: organisationAdminSubject(),
        rememberMeRequested: false,
        platform,
      }),
    ).resolves.toMatchObject({
      organisationId: 'org-1',
      regularSessionSeconds: 28800,
      idleTimeoutMinutes: 30,
      requireReauthenticationForSensitiveActions: true,
      allowEmailChange: true,
    });
    expect(
      securitySettingsRepositoryMock.ensureDefaultOrganisationSecuritySettings,
    ).toHaveBeenCalledWith({
      organisationId: 'org-1',
    });
  });

  it('identifies only organisation users as organisation-scoped for policy', () => {
    expect(organisationIdForSecurityPolicy(organisationTraineeSubject())).toBe('org-1');
    expect(organisationIdForSecurityPolicy(organisationAdminSubject())).toBe('org-1');
    expect(
      organisationIdForSecurityPolicy({
        user: { id: 'platform-1', userType: 'IP_ADMIN', authStatus: 'ACTIVE' },
      }),
    ).toBeNull();
  });

  it('blocks trainee email changes from organisation settings only', async () => {
    securitySettingsRepositoryMock.findOrganisationSecuritySettings.mockResolvedValue({
      organisationId: 'org-1',
      enforceRememberMePolicy: true,
      allowRememberMe: true,
      maxRememberedSessionHours: 168,
      enforceRegularSessionLength: true,
      regularSessionLengthHours: 8,
      enforceIdleTimeout: false,
      idleTimeoutMinutes: null,
      requireReauthenticationForSensitiveActions: true,
      allowTraineeEmailChange: false,
    });

    await expect(canUserChangeOwnEmail(organisationTraineeSubject())).resolves.toBe(false);
    await expect(canUserChangeOwnEmail(organisationAdminSubject())).resolves.toBe(true);
  });
});

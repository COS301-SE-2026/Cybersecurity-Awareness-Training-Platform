import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  getAccount,
  updateAccountProfile,
  requestAccountEmailChange,
  changeAccountPassword,
  getAccountSessions,
  revokeAccountSession,
  logoutOtherAccountSessions,
  updateAccountSecurityPreferences,
  extractErrorMessage,
} from '../account.service';
import { apiClient, ApiError } from '../../lib/apiClient';

vi.mock('../../lib/apiClient', async () => {
  const actual = await vi.importActual<typeof import('../../lib/apiClient')>('../../lib/apiClient');
  return {
    ...actual,
    apiClient: {
      get: vi.fn(),
      patch: vi.fn(),
      post: vi.fn(),
      delete: vi.fn(),
    },
  };
});

const mockAccountData = {
  profile: {
    id: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    userType: 'GENERAL_TRAINEE',
    authStatus: 'ACTIVE',
    emailVerified: true,
    emailVerifiedAt: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  },
  securityPreferences: {
    id: null,
    preferredRegularSessionLengthHours: null,
    preferredRememberMeSessionLengthHours: null,
    preferredIdleTimeoutMinutes: null,
    updatedAt: null,
  },
  effectivePolicy: {
    organisationId: null,
    rememberMeRequested: false,
    rememberMeAllowed: true,
    rememberMeApplied: false,
    regularSessionSeconds: 900,
    rememberedSessionSeconds: 604800,
    effectiveSessionSeconds: 900,
    idleTimeoutMinutes: null,
    requireReauthenticationForSensitiveActions: true,
    allowEmailChange: true,
    sources: {},
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
      deleteAccount: 'SELF_DELETION_NOT_SUPPORTED' as const,
    },
  },
};

describe('account.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and validates account details at runtime boundary', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce(mockAccountData);

    const res = await getAccount();
    expect(apiClient.get).toHaveBeenCalledWith('/account', { credentials: 'include' });
    expect(res).toEqual(mockAccountData);
  });

  it('fails safely when getAccount receives an invalid schema payload', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ invalid: 'payload' });

    await expect(getAccount()).rejects.toThrow();
  });

  it('updates account profile and validates response', async () => {
    const updatedMockData = {
      ...mockAccountData,
      profile: { ...mockAccountData.profile, firstName: 'Jane' },
    };
    vi.mocked(apiClient.patch).mockResolvedValueOnce(updatedMockData);

    const res = await updateAccountProfile({ firstName: 'Jane', lastName: 'Doe' });
    expect(apiClient.patch).toHaveBeenCalledWith(
      '/account/profile',
      { firstName: 'Jane', lastName: 'Doe' },
      { credentials: 'include' },
    );
    expect(res).toEqual(updatedMockData);
  });

  it('requests account email change', async () => {
    const mockData = { message: 'Verification email queued for delivery', emailQueued: true };
    vi.mocked(apiClient.post).mockResolvedValueOnce(mockData);

    const payload = {
      newEmail: 'new@example.com',
      confirmNewEmail: 'new@example.com',
      password: 'Password123!',
    };
    const res = await requestAccountEmailChange(payload);
    expect(apiClient.post).toHaveBeenCalledWith('/account/change-email', payload, {
      credentials: 'include',
    });
    expect(res).toEqual(mockData);
  });

  it('changes account password', async () => {
    const mockData = {
      message: 'Password changed',
      notificationQueued: true,
      revokedSessionCount: 2,
    };
    vi.mocked(apiClient.post).mockResolvedValueOnce(mockData);

    const payload = {
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword123!',
      confirmNewPassword: 'NewPassword123!',
    };
    const res = await changeAccountPassword(payload);
    expect(apiClient.post).toHaveBeenCalledWith('/account/change-password', payload, {
      credentials: 'include',
    });
    expect(res).toEqual(mockData);
  });

  it('fetches active sessions', async () => {
    const mockData = { sessions: [] };
    vi.mocked(apiClient.get).mockResolvedValueOnce(mockData);

    const res = await getAccountSessions();
    expect(apiClient.get).toHaveBeenCalledWith('/account/sessions', { credentials: 'include' });
    expect(res).toEqual(mockData);
  });

  it('revokes an active session', async () => {
    const mockData = { revoked: true };
    vi.mocked(apiClient.delete).mockResolvedValueOnce(mockData);

    const res = await revokeAccountSession('session-123');
    expect(apiClient.delete).toHaveBeenCalledWith('/account/sessions/session-123', {
      credentials: 'include',
    });
    expect(res).toEqual(mockData);
  });

  it('logs out other active sessions', async () => {
    const mockData = { revokedSessionCount: 3 };
    vi.mocked(apiClient.post).mockResolvedValueOnce(mockData);

    const res = await logoutOtherAccountSessions();
    expect(apiClient.post).toHaveBeenCalledWith('/account/sessions/logout-others', undefined, {
      credentials: 'include',
    });
    expect(res).toEqual(mockData);
  });

  it('updates security preferences', async () => {
    const updatedPreferencesData = {
      ...mockAccountData,
      securityPreferences: {
        ...mockAccountData.securityPreferences,
        preferredIdleTimeoutMinutes: 15,
      },
    };
    vi.mocked(apiClient.patch).mockResolvedValueOnce(updatedPreferencesData);

    const payload = { preferredIdleTimeoutMinutes: 15 };
    const res = await updateAccountSecurityPreferences(payload);
    expect(apiClient.patch).toHaveBeenCalledWith('/account/security-preferences', payload, {
      credentials: 'include',
    });
    expect(res).toEqual(updatedPreferencesData);
  });

  it('extracts error message from ApiError and standard errors', () => {
    const apiErr = new ApiError('Default msg', {
      status: 422,
      statusText: 'Unprocessable Entity',
      method: 'POST',
      url: '/account/profile',
      body: { details: [{ message: 'First name is invalid' }] },
    });
    expect(extractErrorMessage(apiErr)).toBe('First name is invalid');

    const simpleApiErr = new ApiError('Default msg', {
      status: 409,
      statusText: 'Conflict',
      method: 'POST',
      url: '/account/change-email',
      body: { message: 'Email already in use' },
    });
    expect(extractErrorMessage(simpleApiErr)).toBe('Email already in use');

    expect(extractErrorMessage(new Error('Network offline'))).toBe('Network offline');
    expect(extractErrorMessage('Unknown error string')).toBe('An unexpected error occurred');
  });
});

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

describe('account.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches account details', async () => {
    const mockData = { profile: { id: '1', firstName: 'John', lastName: 'Doe' } };
    vi.mocked(apiClient.get).mockResolvedValueOnce(mockData);

    const res = await getAccount();
    expect(apiClient.get).toHaveBeenCalledWith('/account', { credentials: 'include' });
    expect(res).toEqual(mockData);
  });

  it('updates account profile', async () => {
    const mockData = { profile: { id: '1', firstName: 'Jane', lastName: 'Doe' } };
    vi.mocked(apiClient.patch).mockResolvedValueOnce(mockData);

    const res = await updateAccountProfile({ firstName: 'Jane', lastName: 'Doe' });
    expect(apiClient.patch).toHaveBeenCalledWith(
      '/account/profile',
      { firstName: 'Jane', lastName: 'Doe' },
      { credentials: 'include' },
    );
    expect(res).toEqual(mockData);
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
    const mockData = { securityPreferences: { preferredIdleTimeoutMinutes: 15 } };
    vi.mocked(apiClient.patch).mockResolvedValueOnce(mockData);

    const payload = { preferredIdleTimeoutMinutes: 15 };
    const res = await updateAccountSecurityPreferences(payload);
    expect(apiClient.patch).toHaveBeenCalledWith('/account/security-preferences', payload, {
      credentials: 'include',
    });
    expect(res).toEqual(mockData);
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

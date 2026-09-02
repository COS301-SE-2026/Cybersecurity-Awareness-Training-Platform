import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { AuthLoginResponseDto, AuthMeResponseDto } from '@insightful-phish/shared';
import { AuthProvider } from '../AuthContext';
import { useAuth } from '../useAuth';

const { getCurrentUserMock, logoutSessionMock, refreshSessionMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  logoutSessionMock: vi.fn(),
  refreshSessionMock: vi.fn(),
}));

vi.mock('../../services/auth.service', () => ({
  getCurrentUser: getCurrentUserMock,
  logoutSession: logoutSessionMock,
  refreshSession: refreshSessionMock,
}));

const storedValues = new Map<string, string>();

const localStorageMock = {
  getItem: (key: string) => storedValues.get(key) ?? null,
  setItem: (key: string, value: string) => storedValues.set(key, value),
  removeItem: (key: string) => storedValues.delete(key),
  clear: () => storedValues.clear(),
};

const user = {
  id: 'admin-user',
  firstName: 'Ada',
  lastName: 'Admin',
  email: 'ada@example.com',
  userType: 'IP_ADMIN' as const,
  authStatus: 'ACTIVE' as const,
  traineeProfile: null,
  adminProfile: null,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const privilegedContext = {
  user: {
    id: 'admin-user',
    userType: 'IP_ADMIN' as const,
    authStatus: 'ACTIVE' as const,
  },
  role: 'IP_ADMIN' as const,
  organisation: {
    id: 'stale-organisation',
    name: 'Stale Organisation',
    status: 'ACTIVE',
  },
  platformAdminRole: 'SUPER_ADMIN' as const,
  permissions: ['PLATFORM_ADMIN_MANAGE'],
  redirectTo: '/platform-administrators',
};

const authoritativeResponse: AuthMeResponseDto = {
  user,
  context: {
    ...privilegedContext,
    organisation: null,
    platformAdminRole: 'NORMAL_ADMIN',
    permissions: ['PLATFORM_ADMIN_READ'],
  },
  permissions: ['PLATFORM_ADMIN_READ'],
  redirectTo: '/platform-administrators',
};

function seedAuthenticatedSession(
  token = 'existing-token',
  expiresAt = '2099-01-01T01:00:00.000Z',
) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('authContext', JSON.stringify(privilegedContext));
  localStorage.setItem('permissions', JSON.stringify(privilegedContext.permissions));
  localStorage.setItem('redirectTo', privilegedContext.redirectTo);
  localStorage.setItem('expiresAt', expiresAt);
  localStorage.setItem('sessionExpiresAt', '2099-01-08T00:00:00.000Z');
}

function renderProvider() {
  return renderHook(() => useAuth(), { wrapper: AuthProvider });
}

describe('AuthProvider authenticated-context refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', localStorageMock);
    localStorage.clear();
  });

  it('uses the rotated current token and authoritatively replaces privileges', async () => {
    seedAuthenticatedSession('old-token', '2000-01-01T00:00:00.000Z');

    const restoredSession: AuthLoginResponseDto = {
      accessToken: 'new-token',
      user,
      context: privilegedContext,
      permissions: privilegedContext.permissions,
      redirectTo: privilegedContext.redirectTo,
      expiresAt: '2099-01-01T01:00:00.000Z',
      sessionExpiresAt: '2099-01-08T00:00:00.000Z',
      idleTimeoutMinutes: 30,
    };

    refreshSessionMock.mockResolvedValueOnce(restoredSession);
    getCurrentUserMock.mockResolvedValueOnce(authoritativeResponse);

    const { result } = renderProvider();

    await waitFor(() => {
      expect(result.current.token).toBe('new-token');
      expect(result.current.isAuthLoading).toBe(false);
    });

    await act(async () => {
      await result.current!.refreshAuthContext();
    });

    expect(getCurrentUserMock).toHaveBeenCalledWith('new-token');
    expect(result.current!.token).toBe('new-token');
    expect(localStorage.getItem('token')).toBe('new-token');
    expect(result.current!.authContext?.platformAdminRole).toBe('NORMAL_ADMIN');
    expect(result.current!.authContext?.organisation).toBeNull();
    expect(result.current!.permissions).toEqual(['PLATFORM_ADMIN_READ']);
    expect(result.current!.permissions).not.toContain('PLATFORM_ADMIN_MANAGE');
    expect(result.current!.redirectTo).toBe('/platform-administrators');
    expect(result.current!.expiresAt).toBe('2099-01-01T01:00:00.000Z');
    expect(result.current!.sessionExpiresAt).toBe('2099-01-08T00:00:00.000Z');
  });

  it('propagates transient failure without corrupting valid auth', async () => {
    seedAuthenticatedSession();
    getCurrentUserMock.mockRejectedValueOnce(new Error('Temporary failure'));

    const { result } = renderProvider();

    await waitFor(() => expect(result.current).not.toBeNull());

    await expect(result.current!.refreshAuthContext()).rejects.toThrow('Temporary failure');

    expect(result.current!.token).toBe('existing-token');
    expect(result.current!.authContext?.platformAdminRole).toBe('SUPER_ADMIN');
    expect(result.current!.permissions).toEqual(['PLATFORM_ADMIN_MANAGE']);
    expect(localStorage.getItem('token')).toBe('existing-token');
    expect(localStorage.getItem('authContext')).toBe(JSON.stringify(privilegedContext));
  });

  it('rejects a stale response after the active session is cleared', async () => {
    seedAuthenticatedSession();

    let resolveRequest!: (response: AuthMeResponseDto) => void;
    getCurrentUserMock.mockReturnValueOnce(
      new Promise<AuthMeResponseDto>((resolve) => {
        resolveRequest = resolve;
      }),
    );

    const { result } = renderProvider();

    await waitFor(() => expect(result.current).not.toBeNull());

    const refreshPromise = result.current!.refreshAuthContext();

    act(() => {
      result.current!.clearAuth();
    });

    resolveRequest(authoritativeResponse);

    await expect(refreshPromise).rejects.toThrow(
      'Authenticated session changed during auth context refresh',
    );

    expect(result.current!.token).toBeNull();
    expect(result.current!.authContext).toBeNull();
    expect(result.current!.permissions).toEqual([]);
    expect(localStorage.getItem('token')).toBeNull();
  });
});

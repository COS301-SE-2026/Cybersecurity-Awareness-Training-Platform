import type {
  AccountChangeEmailRequestDto,
  AccountChangePasswordRequestDto,
  AccountProfileUpdateRequestDto,
  AccountSecurityPreferencesRequestDto,
} from '@insightful-phish/shared';
import { apiClient, ApiError } from '../lib/apiClient';

export type AccountPolicyResponse = {
  organisationId: string | null;
  rememberMeRequested: boolean;
  rememberMeAllowed: boolean;
  rememberMeApplied: boolean;
  regularSessionSeconds: number;
  rememberedSessionSeconds: number;
  effectiveSessionSeconds: number;
  idleTimeoutMinutes: number | null;
  requireReauthenticationForSensitiveActions: boolean;
  allowEmailChange: boolean;
  sources: Record<string, string>;
};

export type AccountCapabilitiesResponse = {
  canEditProfile: boolean;
  canRequestEmailChange: boolean;
  canChangePassword: boolean;
  canEditSecurityPreferences: boolean;
  canDeleteAccount?: boolean;
  securityPreferenceEditable: Record<string, boolean>;
  blockedReasons: Record<string, string | null>;
};

export type AccountProfileResponse = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  userType: string;
  authStatus: string;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AccountSecurityPreferencesResponse = {
  id: string | null;
  preferredRegularSessionLengthHours: number | null;
  preferredRememberMeSessionLengthHours: number | null;
  preferredIdleTimeoutMinutes: number | null;
  updatedAt: string | null;
};

export type AccountResponse = {
  profile: AccountProfileResponse;
  securityPreferences: AccountSecurityPreferencesResponse;
  effectivePolicy: AccountPolicyResponse;
  capabilities: AccountCapabilitiesResponse;
};

export type AccountChangeEmailResponse = { message: string; emailQueued: boolean };
export type AccountChangePasswordResponse = {
  message: string;
  notificationQueued: boolean;
  revokedSessionCount: number;
};

export type AccountSessionResponse = {
  id: string;
  rememberMe: boolean;
  current: boolean;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  idleTimeoutMinutes: number | null;
  deviceSummary: string | null;
  locationSummary: string | null;
};

export type AccountSessionsResponse = { sessions: AccountSessionResponse[] };
export type AccountSessionRevocationResponse = { revoked: true };
export type AccountLogoutOthersResponse = { revokedSessionCount: number };

export function getAccount(): Promise<AccountResponse> {
  return apiClient.get<AccountResponse>('/account', {
    credentials: 'include',
  });
}

export function updateAccountProfile(
  payload: AccountProfileUpdateRequestDto,
): Promise<AccountResponse> {
  return apiClient.patch<AccountResponse, AccountProfileUpdateRequestDto>(
    '/account/profile',
    payload,
    { credentials: 'include' },
  );
}

export function requestAccountEmailChange(
  payload: AccountChangeEmailRequestDto,
): Promise<AccountChangeEmailResponse> {
  return apiClient.post<AccountChangeEmailResponse, AccountChangeEmailRequestDto>(
    '/account/change-email',
    payload,
    { credentials: 'include' },
  );
}

export function changeAccountPassword(
  payload: AccountChangePasswordRequestDto,
): Promise<AccountChangePasswordResponse> {
  return apiClient.post<AccountChangePasswordResponse, AccountChangePasswordRequestDto>(
    '/account/change-password',
    payload,
    { credentials: 'include' },
  );
}

export function getAccountSessions(): Promise<AccountSessionsResponse> {
  return apiClient.get<AccountSessionsResponse>('/account/sessions', {
    credentials: 'include',
  });
}

export function revokeAccountSession(sessionId: string): Promise<AccountSessionRevocationResponse> {
  return apiClient.delete<AccountSessionRevocationResponse>(
    `/account/sessions/${encodeURIComponent(sessionId)}`,
    { credentials: 'include' },
  );
}

export function logoutOtherAccountSessions(): Promise<AccountLogoutOthersResponse> {
  return apiClient.post<AccountLogoutOthersResponse>('/account/sessions/logout-others', undefined, {
    credentials: 'include',
  });
}

export function updateAccountSecurityPreferences(
  payload: AccountSecurityPreferencesRequestDto,
): Promise<AccountResponse> {
  return apiClient.patch<AccountResponse, AccountSecurityPreferencesRequestDto>(
    '/account/security-preferences',
    payload,
    { credentials: 'include' },
  );
}

export function extractErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.body && typeof error.body === 'object') {
      const body = error.body as {
        message?: string;
        error?: string;
        details?: Array<{ field?: string; message: string }>;
      };
      if (Array.isArray(body.details) && body.details.length > 0) {
        return body.details.map((d) => d.message).join('. ');
      }
      if (typeof body.message === 'string' && body.message.trim()) {
        return body.message;
      }
      if (typeof body.error === 'string' && body.error.trim()) {
        return body.error;
      }
    }
    return error.message || `Request failed with status ${error.status}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

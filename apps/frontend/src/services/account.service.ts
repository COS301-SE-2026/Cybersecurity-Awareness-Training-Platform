import {
  accountResponseSchema,
  type AccountChangeEmailRequestDto,
  type AccountChangePasswordRequestDto,
  type AccountProfileUpdateRequestDto,
  type AccountSecurityPreferencesRequestDto,
  type AccountCapabilitiesResponseDto,
  type AccountResponseDto,
  type AccountPolicyResponseDto,
  type AccountProfileResponseDto,
  type AccountSecurityPreferencesResponseDto,
  type AccountDeletionBlockedReasonDto,
} from '@insightful-phish/shared';
import { apiClient, ApiError } from '../lib/apiClient';

export type AccountPolicyResponse = AccountPolicyResponseDto;
export type AccountCapabilitiesResponse = AccountCapabilitiesResponseDto;
export type AccountProfileResponse = AccountProfileResponseDto;
export type AccountSecurityPreferencesResponse = AccountSecurityPreferencesResponseDto;
export type AccountResponse = AccountResponseDto;
export type { AccountDeletionBlockedReasonDto };

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

export async function getAccount(): Promise<AccountResponse> {
  const raw = await apiClient.get<unknown>('/account', {
    credentials: 'include',
  });
  return accountResponseSchema.parse(raw);
}

export async function updateAccountProfile(
  payload: AccountProfileUpdateRequestDto,
): Promise<AccountResponse> {
  const raw = await apiClient.patch<unknown, AccountProfileUpdateRequestDto>(
    '/account/profile',
    payload,
    { credentials: 'include' },
  );
  return accountResponseSchema.parse(raw);
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

export async function updateAccountSecurityPreferences(
  payload: AccountSecurityPreferencesRequestDto,
): Promise<AccountResponse> {
  const raw = await apiClient.patch<unknown, AccountSecurityPreferencesRequestDto>(
    '/account/security-preferences',
    payload,
    { credentials: 'include' },
  );
  return accountResponseSchema.parse(raw);
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

import type {
  AuthLoginRequestDto,
  AuthLoginResponseDto,
  AuthMeResponseDto,
} from '@insightful-phish/shared';
import { apiClient } from '../lib/apiClient';

export function loginUser(payload: AuthLoginRequestDto): Promise<AuthLoginResponseDto> {
  return apiClient.post<AuthLoginResponseDto, AuthLoginRequestDto>('/auth/login', payload, {
    credentials: 'include',
  });
}

export function refreshSession(): Promise<AuthLoginResponseDto> {
  return apiClient.post<AuthLoginResponseDto>('/auth/refresh', undefined, {
    credentials: 'include',
  });
}

export function logoutSession(): Promise<{ success: boolean }> {
  return apiClient.post<{ success: boolean }>('/auth/logout', undefined, {
    credentials: 'include',
  });
}

export function getCurrentUser(token: string): Promise<AuthMeResponseDto> {
  return apiClient.get<AuthMeResponseDto>('/auth/me', {
    authToken: token,
  });
}

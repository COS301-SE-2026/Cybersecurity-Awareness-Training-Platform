import type {
  AccountVerifyEmailChangeRequestDto,
  AccountVerifyEmailChangeResponseDto,
  ActionTokenStateDto,
  AuthLoginRequestDto,
  AuthLoginResponseDto,
  AuthMeResponseDto,
  AuthRegisterResponseDto,
  AuthVerifyEmailRequestDto,
  AuthVerifyEmailResponseDto,
  SetupCompleteResponseDto,
  SetupTokenContextResponseDto,
} from '@insightful-phish/shared';
import { apiClient } from '../lib/apiClient';

export type RegisterUserPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type CompleteSetupPayload = {
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
};

export type TokenLinkFlowDto =
  | 'EMAIL_VERIFICATION'
  | 'PASSWORD_RESET'
  | 'EMAIL_CHANGE_VERIFICATION'
  | 'INITIAL_ORGANISATION_ADMIN_SETUP'
  | 'ORGANISATION_TRAINEE_INVITE'
  | 'ORGANISATION_ADMIN_PROMOTION'
  | 'PLATFORM_ADMIN_INVITE'
  | 'PLATFORM_ADMIN_UPGRADE_CONFIRMATION'
  | 'UNKNOWN';

export type TokenContextResponseDto = {
  tokenState: ActionTokenStateDto;
  canResend: boolean;
  resendCooldownSeconds: number;
  messageCode: string;
  flow: TokenLinkFlowDto;
};

export type ResendTokenResponseDto = {
  success: boolean;
};

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

export function registerUser(payload: RegisterUserPayload): Promise<AuthRegisterResponseDto> {
  return apiClient.post<AuthRegisterResponseDto, RegisterUserPayload>('/auth/register', payload, {
    credentials: 'include',
  });
}

export function resendVerification(payload: {
  email: string;
}): Promise<{ message?: string; success?: boolean }> {
  return apiClient.post<{ message?: string; success?: boolean }, { email: string }>(
    '/auth/resend-verification',
    payload,
    {
      credentials: 'include',
    },
  );
}

export function verifyEmail(token: string): Promise<AuthVerifyEmailResponseDto> {
  return apiClient.post<AuthVerifyEmailResponseDto, AuthVerifyEmailRequestDto>(
    '/auth/verify-email',
    { token },
    {
      credentials: 'include',
    },
  );
}

export function verifyEmailChange(token: string): Promise<AccountVerifyEmailChangeResponseDto> {
  return apiClient.post<AccountVerifyEmailChangeResponseDto, AccountVerifyEmailChangeRequestDto>(
    '/account/verify-email-change',
    { token },
    {
      credentials: 'include',
    },
  );
}

export function getTokenContext(token: string): Promise<TokenContextResponseDto> {
  return apiClient.get<TokenContextResponseDto>(
    `/auth/tokens/${encodeURIComponent(token)}/context`,
    {
      credentials: 'include',
    },
  );
}

export function resendToken(token: string): Promise<ResendTokenResponseDto> {
  return apiClient.post<ResendTokenResponseDto>(
    `/auth/tokens/${encodeURIComponent(token)}/resend`,
    undefined,
    {
      credentials: 'include',
    },
  );
}

export function getSetupTokenContext(token: string): Promise<SetupTokenContextResponseDto> {
  return apiClient.get<SetupTokenContextResponseDto>(
    `/setup/token/${encodeURIComponent(token)}/context`,
    {
      credentials: 'include',
    },
  );
}

export function completeSetupWithToken(
  token: string,
  payload: CompleteSetupPayload,
): Promise<SetupCompleteResponseDto> {
  return apiClient.post<SetupCompleteResponseDto, CompleteSetupPayload>(
    `/setup/token/${encodeURIComponent(token)}/complete`,
    payload,
    {
      credentials: 'include',
    },
  );
}

export function getCurrentUser(token: string): Promise<AuthMeResponseDto> {
  return apiClient.get<AuthMeResponseDto>('/auth/me', {
    authToken: token,
  });
}

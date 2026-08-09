import type {
  AuthMeResponseDto,
  DemotePlatformAdminRequestDto,
  DemotePlatformAdminResponseDto,
  InvitePlatformAdminRequestDto,
  InvitePlatformAdminResponseDto,
  PlatformAdminListResponseDto,
  ResendPlatformAdminInviteResponseDto,
  TransferSuperAdminRequestDto,
} from '@insightful-phish/shared';
import { apiClient } from '../lib/apiClient';

export function getPlatformAdmins(token: string): Promise<PlatformAdminListResponseDto> {
  return apiClient.get<PlatformAdminListResponseDto>('/platform/admins', {
    authToken: token,
  });
}

export function invitePlatformAdmin(
  input: InvitePlatformAdminRequestDto,
  token: string,
): Promise<InvitePlatformAdminResponseDto> {
  return apiClient.post<InvitePlatformAdminResponseDto, InvitePlatformAdminRequestDto>(
    '/platform/admin-invitations',
    input,
    {
      authToken: token,
    },
  );
}

export function resendPlatformAdminInvite(
  inviteId: string,
  token: string,
): Promise<ResendPlatformAdminInviteResponseDto> {
  return apiClient.post<ResendPlatformAdminInviteResponseDto>(
    `/platform/admin-invitations/${encodeURIComponent(inviteId)}/resend`,
    undefined,
    {
      authToken: token,
    },
  );
}

export function transferSuperAdmin(
  input: TransferSuperAdminRequestDto,
  token: string,
): Promise<AuthMeResponseDto> {
  return apiClient.post<AuthMeResponseDto, TransferSuperAdminRequestDto>(
    '/platform/admins/transfer-super-admin',
    input,
    {
      authToken: token,
    },
  );
}

export function demotePlatformAdmin(
  userId: string,
  input: DemotePlatformAdminRequestDto,
  token: string,
): Promise<DemotePlatformAdminResponseDto> {
  return apiClient.post<DemotePlatformAdminResponseDto, DemotePlatformAdminRequestDto>(
    `/platform/admins/${encodeURIComponent(userId)}/demote`,
    input,
    {
      authToken: token,
    },
  );
}

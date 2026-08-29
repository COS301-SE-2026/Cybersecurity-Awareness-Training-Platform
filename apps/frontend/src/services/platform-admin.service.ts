import {
  demotePlatformAdminResponseSchema,
  invitePlatformAdminResponseSchema,
  platformAdminListResponseSchema,
  resendPlatformAdminInviteResponseSchema,
  type AuthMeResponseDto,
  type DemotePlatformAdminRequestDto,
  type DemotePlatformAdminResponseDto,
  type InvitePlatformAdminRequestDto,
  type InvitePlatformAdminResponseDto,
  type PlatformAdminListResponseDto,
  type ResendPlatformAdminInviteResponseDto,
  type TransferSuperAdminRequestDto,
} from '@insightful-phish/shared';
import { apiClient } from '../lib/apiClient';

export async function getPlatformAdmins(token: string): Promise<PlatformAdminListResponseDto> {
  const response = await apiClient.get<unknown>('/platform/admins', {
    authToken: token,
  });
  return platformAdminListResponseSchema.parse(response);
}

export async function invitePlatformAdmin(
  input: InvitePlatformAdminRequestDto,
  token: string,
): Promise<InvitePlatformAdminResponseDto> {
  const response = await apiClient.post<unknown, InvitePlatformAdminRequestDto>(
    '/platform/admin-invitations',
    input,
    {
      authToken: token,
    },
  );
  return invitePlatformAdminResponseSchema.parse(response);
}

export async function resendPlatformAdminInvite(
  inviteId: string,
  token: string,
): Promise<ResendPlatformAdminInviteResponseDto> {
  const response = await apiClient.post<unknown>(
    `/platform/admin-invitations/${encodeURIComponent(inviteId)}/resend`,
    undefined,
    {
      authToken: token,
    },
  );
  return resendPlatformAdminInviteResponseSchema.parse(response);
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

export async function demotePlatformAdmin(
  userId: string,
  input: DemotePlatformAdminRequestDto,
  token: string,
): Promise<DemotePlatformAdminResponseDto> {
  const response = await apiClient.post<unknown, DemotePlatformAdminRequestDto>(
    `/platform/admins/${encodeURIComponent(userId)}/demote`,
    input,
    {
      authToken: token,
    },
  );
  return demotePlatformAdminResponseSchema.parse(response);
}

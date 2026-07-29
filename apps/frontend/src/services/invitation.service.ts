import type {
  InvitationAcceptRequestDto,
  InvitationAcceptResponseDto,
  InvitationContextResponseDto,
  InvitationRejectRequestDto,
  InvitationRejectResponseDto,
} from '@insightful-phish/shared';
import { apiClient } from '../lib/apiClient';

export async function getInvitationContext(token: string): Promise<InvitationContextResponseDto> {
  return apiClient.get<InvitationContextResponseDto>(
    `/invitations/token/${encodeURIComponent(token)}/context`,
  );
}

export async function acceptInvitation(
  token: string,
  payload: InvitationAcceptRequestDto = {},
): Promise<InvitationAcceptResponseDto> {
  return apiClient.post<InvitationAcceptResponseDto>(
    `/invitations/token/${encodeURIComponent(token)}/accept`,
    payload,
  );
}

export async function rejectInvitation(
  token: string,
  payload: InvitationRejectRequestDto = {},
): Promise<InvitationRejectResponseDto> {
  return apiClient.post<InvitationRejectResponseDto>(
    `/invitations/token/${encodeURIComponent(token)}/reject`,
    payload,
    { authToken: null },
  );
}

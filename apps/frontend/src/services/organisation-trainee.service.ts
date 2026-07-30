import type {
  CreateTraineeInvitationResponseDto,
  CreateTraineeInvitationRequestDto,
  DisableTraineeRequestDto,
  DisableTraineeResponseDto,
  InvitationResendResponseDto,
  InvitationRevokeResponseDto,
  TraineeListResponseDto,
} from '@insightful-phish/shared';
import { apiClient } from '../lib/apiClient';

export function getOrganisationTrainees(
  organisationId: string,
  token: string,
): Promise<TraineeListResponseDto> {
  return apiClient.get<TraineeListResponseDto>(
    `/organisations/${encodeURIComponent(organisationId)}/trainees`,
    {
      authToken: token,
    },
  );
}

export function createOrganisationTraineeInvitation(
  organisationId: string,
  input: CreateTraineeInvitationRequestDto,
  token: string,
): Promise<CreateTraineeInvitationResponseDto> {
  return apiClient.post<CreateTraineeInvitationResponseDto, CreateTraineeInvitationRequestDto>(
    `/organisations/${organisationId}/trainee-invitations`,
    input,
    {
      authToken: token,
    },
  );
}

export function resendOrganisationTraineeInvitation(
  organisationId: string,
  invitationId: string,
  token: string,
): Promise<InvitationResendResponseDto> {
  return apiClient.post<InvitationResendResponseDto>(
    `/organisations/${organisationId}/trainee-invitations/${invitationId}/resend`,
    undefined,
    {
      authToken: token,
    },
  );
}

export function revokeOrganisationTraineeInvitation(
  organisationId: string,
  invitationId: string,
  token: string,
): Promise<InvitationRevokeResponseDto> {
  return apiClient.post<InvitationRevokeResponseDto>(
    `/organisations/${organisationId}/trainee-invitations/${invitationId}/revoke`,
    undefined,
    {
      authToken: token,
    },
  );
}

export function disableOrganisationTrainee(
  organisationId: string,
  traineeId: string,
  input: DisableTraineeRequestDto,
  token: string,
): Promise<DisableTraineeResponseDto> {
  return apiClient.patch<DisableTraineeResponseDto, DisableTraineeRequestDto>(
    `/organisations/${organisationId}/trainees/${traineeId}/disable`,
    input,
    {
      authToken: token,
    },
  );
}

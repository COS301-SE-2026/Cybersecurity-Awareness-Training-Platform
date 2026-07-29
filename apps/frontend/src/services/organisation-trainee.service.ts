import type {
  CreateTraineeInvitationResponseDto,
  CreateTraineeInvitationRequestDto,
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

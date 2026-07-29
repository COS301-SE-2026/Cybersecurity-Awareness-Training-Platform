import type { TraineeListResponseDto } from '@insightful-phish/shared';
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

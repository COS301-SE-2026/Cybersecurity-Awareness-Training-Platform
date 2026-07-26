import type {
  OrganisationSecuritySettingsResponseDto,
  UpdateOrganisationSecuritySettingsRequestDto,
} from '@insightful-phish/shared';
import { apiClient } from '../lib/apiClient';

export async function getOrganisationSecuritySettings(
  organisationId: string,
  token: string,
): Promise<OrganisationSecuritySettingsResponseDto> {
  return apiClient.get<OrganisationSecuritySettingsResponseDto>(
    `/organisations/${organisationId}/security-settings`,
    {
      authToken: token,
    },
  );
}

export async function updateOrganisationSecuritySettings(
  organisationId: string,
  payload: UpdateOrganisationSecuritySettingsRequestDto,
  token: string,
): Promise<OrganisationSecuritySettingsResponseDto> {
  return apiClient.patch<
    OrganisationSecuritySettingsResponseDto,
    UpdateOrganisationSecuritySettingsRequestDto
  >(`/organisations/${organisationId}/security-settings`, payload, {
    authToken: token,
  });
}

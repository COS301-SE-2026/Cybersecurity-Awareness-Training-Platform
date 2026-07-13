import type {
  CreateOrganisationRegistrationRequestDto,
  OrganisationRegistrationRequestResponseDto,
} from '@insightful-phish/shared';
import { apiClient } from '../lib/apiClient';

export function submitOrganisationRegistrationRequest(
  payload: CreateOrganisationRegistrationRequestDto,
): Promise<OrganisationRegistrationRequestResponseDto> {
  return apiClient.post<
    OrganisationRegistrationRequestResponseDto,
    CreateOrganisationRegistrationRequestDto
  >('/organisation-registration-requests', payload);
}

import type {
  OwnOrganisationDetailDto,
  PlatformOrganisationDetailDto,
  PlatformOrganisationRequestDetailsResponseDto,
  ResendInitialAdminSetupResponseDto,
} from '@insightful-phish/shared';
import { apiClient } from '../lib/apiClient';

// helper service for fetching org details and sending resend setup mail to backend
// make sure token is passed in header for platform admin permissions check

export async function getOwnOrganisationDetail(
  organisationId: string,
  token: string,
): Promise<OwnOrganisationDetailDto> {
  return apiClient.get<OwnOrganisationDetailDto>(`/organisations/${organisationId}`, {
    authToken: token,
  });
}

export async function getPlatformOrganisationDetail(
  organisationId: string,
  token: string,
): Promise<PlatformOrganisationDetailDto> {
  // call backend endpoint to get surface level organisation details
  return apiClient.get<PlatformOrganisationDetailDto>(`/platform/organisations/${organisationId}`, {
    authToken: token,
  });
}

export async function getPlatformOrganisationRequestDetails(
  requestId: string,
  token: string,
): Promise<PlatformOrganisationRequestDetailsResponseDto> {
  // call backend request detail endpoint when org is not active yet or pending request
  return apiClient.get<PlatformOrganisationRequestDetailsResponseDto>(
    `/platform/organisation-requests/${requestId}/details`,
    {
      authToken: token,
    },
  );
}

export async function resendInitialAdminSetup(
  organisationId: string,
  token: string,
): Promise<ResendInitialAdminSetupResponseDto> {
  // post request to resend initial admin setup email when setup is expred or failed
  return apiClient.post<ResendInitialAdminSetupResponseDto>(
    `/platform/organisations/${organisationId}/resend-initial-admin-setup`,
    undefined,
    {
      authToken: token,
    },
  );
}


import type {
  CreateEmailProviderProfileRequestDto,
  EmailProviderProfileConnectionCheckResponseDto,
  EmailProviderProfileListResponseDto,
  EmailProviderProfileManagementDetailResponseDto,
  UpdateEmailProviderProfileRequestDto,
  EmailProviderProfileTestEmailResponseDto,
} from '@insightful-phish/shared';
import { apiClient } from '../lib/apiClient';

export function listEmailProviderProfiles(
  organisationId: string,
  token: string,
): Promise<EmailProviderProfileListResponseDto> {
  return apiClient.get<EmailProviderProfileListResponseDto>(
    `/organisations/${encodeURIComponent(organisationId)}/email-provider-profiles`,
    { authToken: token },
  );
}

export function getEmailProviderProfile(
  organisationId: string,
  profileId: string,
  token: string,
): Promise<EmailProviderProfileManagementDetailResponseDto> {
  return apiClient.get<EmailProviderProfileManagementDetailResponseDto>(
    `/organisations/${encodeURIComponent(organisationId)}/email-provider-profiles/${encodeURIComponent(profileId)}`,
    { authToken: token },
  );
}

export function createEmailProviderProfile(
  organisationId: string,
  input: CreateEmailProviderProfileRequestDto,
  token: string,
): Promise<EmailProviderProfileManagementDetailResponseDto> {
  return apiClient.post<
    EmailProviderProfileManagementDetailResponseDto,
    CreateEmailProviderProfileRequestDto
  >(`/organisations/${encodeURIComponent(organisationId)}/email-provider-profiles`, input, {
    authToken: token,
  });
}

export function updateEmailProviderProfile(
  organisationId: string,
  profileId: string,
  input: UpdateEmailProviderProfileRequestDto,
  token: string,
): Promise<EmailProviderProfileManagementDetailResponseDto> {
  return apiClient.patch<
    EmailProviderProfileManagementDetailResponseDto,
    UpdateEmailProviderProfileRequestDto
  >(
    `/organisations/${encodeURIComponent(organisationId)}/email-provider-profiles/${encodeURIComponent(profileId)}`,
    input,
    { authToken: token },
  );
}

export function checkEmailProviderProfileConnection(
  organisationId: string,
  profileId: string,
  token: string,
): Promise<EmailProviderProfileConnectionCheckResponseDto> {
  return apiClient.post<EmailProviderProfileConnectionCheckResponseDto>(
    `/organisations/${encodeURIComponent(organisationId)}/email-provider-profiles/${encodeURIComponent(profileId)}/connection-check`,
    undefined,
    { authToken: token },
  );
}

export function removeEmailProviderProfile(
  organisationId: string,
  profileId: string,
  token: string,
): Promise<void> {
  return apiClient.delete<void>(
    `/organisations/${encodeURIComponent(organisationId)}/email-provider-profiles/${encodeURIComponent(profileId)}`,
    { authToken: token },
  );
}

export function sendEmailProviderProfileTest(
  organisationId: string,
  profileId: string,
  token: string,
): Promise<EmailProviderProfileTestEmailResponseDto> {
  return apiClient.post<EmailProviderProfileTestEmailResponseDto>(
    `/organisations/${encodeURIComponent(organisationId)}/email-provider-profiles/${encodeURIComponent(profileId)}/test-email`,
    undefined,
    { authToken: token },
  );
}

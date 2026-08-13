import type {
  CampaignCatalogueQueryDto,
  CampaignDetailResponseDto,
  CampaignLifecycleActionResponseDto,
  CampaignListQueryDto,
  CreateCampaignDraftRequestDto,
  GetCampaignCatalogueResponseDto,
  GetCampaignsResponseDto,
  GetTraineeCampaignDetailResponseDto,
  GetTraineeCampaignsResponseDto,
  UpdateCampaignDraftRequestDto,
} from '@insightful-phish/shared';
import { apiClient } from './apiClient.js';

function buildQueryString(params?: Record<string, unknown>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  }
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export async function getTraineeCampaigns(): Promise<GetTraineeCampaignsResponseDto> {
  return apiClient.get<GetTraineeCampaignsResponseDto>('/trainee/campaigns');
}

export async function getTraineeCampaignDetail(
  campaignId: string,
): Promise<GetTraineeCampaignDetailResponseDto> {
  return apiClient.get<GetTraineeCampaignDetailResponseDto>(`/trainee/campaigns/${campaignId}`);
}

export async function getOrganisationCampaignCatalogue(
  organisationId: string,
  params?: CampaignCatalogueQueryDto,
): Promise<GetCampaignCatalogueResponseDto> {
  return apiClient.get<GetCampaignCatalogueResponseDto>(
    `/organisations/${organisationId}/campaign-content/catalog${buildQueryString(params as any)}`,
  );
}

export async function getPlatformCampaignCatalogue(
  params?: CampaignCatalogueQueryDto,
): Promise<GetCampaignCatalogueResponseDto> {
  return apiClient.get<GetCampaignCatalogueResponseDto>(
    `/platform/campaign-content/catalog${buildQueryString(params as any)}`,
  );
}

export async function getOrganisationCampaigns(
  organisationId: string,
  params?: CampaignListQueryDto,
): Promise<GetCampaignsResponseDto> {
  return apiClient.get<GetCampaignsResponseDto>(
    `/organisations/${organisationId}/campaigns${buildQueryString(params as any)}`,
  );
}

export async function getPlatformCampaigns(
  params?: CampaignListQueryDto,
): Promise<GetCampaignsResponseDto> {
  return apiClient.get<GetCampaignsResponseDto>(
    `/platform/campaigns${buildQueryString(params as any)}`,
  );
}

export async function getOrganisationCampaignDetail(
  organisationId: string,
  campaignId: string,
): Promise<CampaignDetailResponseDto> {
  return apiClient.get<CampaignDetailResponseDto>(
    `/organisations/${organisationId}/campaigns/${campaignId}`,
  );
}

export async function getPlatformCampaignDetail(
  campaignId: string,
): Promise<CampaignDetailResponseDto> {
  return apiClient.get<CampaignDetailResponseDto>(`/platform/campaigns/${campaignId}`);
}

export async function createOrganisationCampaignDraft(
  organisationId: string,
  data: CreateCampaignDraftRequestDto,
): Promise<CampaignDetailResponseDto> {
  return apiClient.post<CampaignDetailResponseDto, CreateCampaignDraftRequestDto>(
    `/organisations/${organisationId}/campaigns`,
    data,
  );
}

export async function createPlatformCampaignDraft(
  data: CreateCampaignDraftRequestDto,
): Promise<CampaignDetailResponseDto> {
  return apiClient.post<CampaignDetailResponseDto, CreateCampaignDraftRequestDto>(
    '/platform/campaigns',
    data,
  );
}

export async function updateOrganisationCampaignDraft(
  organisationId: string,
  campaignId: string,
  data: UpdateCampaignDraftRequestDto,
): Promise<CampaignDetailResponseDto> {
  return apiClient.put<CampaignDetailResponseDto, UpdateCampaignDraftRequestDto>(
    `/organisations/${organisationId}/campaigns/${campaignId}`,
    data,
  );
}

export async function updatePlatformCampaignDraft(
  campaignId: string,
  data: UpdateCampaignDraftRequestDto,
): Promise<CampaignDetailResponseDto> {
  return apiClient.put<CampaignDetailResponseDto, UpdateCampaignDraftRequestDto>(
    `/platform/campaigns/${campaignId}`,
    data,
  );
}

export async function activateOrganisationCampaign(
  organisationId: string,
  campaignId: string,
): Promise<CampaignLifecycleActionResponseDto> {
  return apiClient.post<CampaignLifecycleActionResponseDto>(
    `/organisations/${organisationId}/campaigns/${campaignId}/activate`,
  );
}

export async function activatePlatformCampaign(
  campaignId: string,
): Promise<CampaignLifecycleActionResponseDto> {
  return apiClient.post<CampaignLifecycleActionResponseDto>(
    `/platform/campaigns/${campaignId}/activate`,
  );
}

export async function archiveOrganisationCampaign(
  organisationId: string,
  campaignId: string,
): Promise<CampaignLifecycleActionResponseDto> {
  return apiClient.post<CampaignLifecycleActionResponseDto>(
    `/organisations/${organisationId}/campaigns/${campaignId}/archive`,
  );
}

export async function archivePlatformCampaign(
  campaignId: string,
): Promise<CampaignLifecycleActionResponseDto> {
  return apiClient.post<CampaignLifecycleActionResponseDto>(
    `/platform/campaigns/${campaignId}/archive`,
  );
}

export async function reactivateOrganisationCampaign(
  organisationId: string,
  campaignId: string,
): Promise<CampaignLifecycleActionResponseDto> {
  return apiClient.post<CampaignLifecycleActionResponseDto>(
    `/organisations/${organisationId}/campaigns/${campaignId}/reactivate`,
  );
}

export async function reactivatePlatformCampaign(
  campaignId: string,
): Promise<CampaignLifecycleActionResponseDto> {
  return apiClient.post<CampaignLifecycleActionResponseDto>(
    `/platform/campaigns/${campaignId}/reactivate`,
  );
}

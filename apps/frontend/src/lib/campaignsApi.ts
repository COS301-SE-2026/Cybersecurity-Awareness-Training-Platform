import type {
  CampaignCatalogueQueryDto,
  CampaignDetailResponseDto,
  CampaignLifecycleActionResponseDto,
  CampaignListQueryDto,
  CampaignMutationPreconditionDto,
  CreateCampaignDraftRequestDto,
  GetCampaignCatalogueResponseDto,
  GetCampaignsResponseDto,
  GetTraineeCampaignDetailResponseDto,
  GetTraineeCampaignsResponseDto,
  UpdateCampaignDraftRequestDto,
} from '@insightful-phish/shared';
import {
  campaignDetailResponseSchema,
  campaignLifecycleActionResponseSchema,
  getCampaignCatalogueResponseSchema,
  getCampaignsResponseSchema,
  getTraineeCampaignDetailResponseSchema,
  getTraineeCampaignsResponseSchema,
} from '@insightful-phish/shared';
import { apiClient } from './apiClient.js';

function buildQueryString(
  params?: Record<string, string | number | boolean | null | undefined>,
): string {
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
  const res = await apiClient.get<unknown>('/trainee/campaigns');
  return getTraineeCampaignsResponseSchema.parse(res);
}

export async function getTraineeCampaignDetail(
  campaignId: string,
): Promise<GetTraineeCampaignDetailResponseDto> {
  const res = await apiClient.get<unknown>(`/trainee/campaigns/${campaignId}`);
  return getTraineeCampaignDetailResponseSchema.parse(res) as GetTraineeCampaignDetailResponseDto;
}

export async function getOrganisationCampaignCatalogue(
  organisationId: string,
  params?: CampaignCatalogueQueryDto,
): Promise<GetCampaignCatalogueResponseDto> {
  const res = await apiClient.get<unknown>(
    `/organisations/${organisationId}/campaign-content/catalog${buildQueryString(params as Record<string, string | number | boolean | null | undefined>)}`,
  );
  return getCampaignCatalogueResponseSchema.parse(res);
}

export async function getPlatformCampaignCatalogue(
  params?: CampaignCatalogueQueryDto,
): Promise<GetCampaignCatalogueResponseDto> {
  const res = await apiClient.get<unknown>(
    `/platform/campaign-content/catalog${buildQueryString(params as Record<string, string | number | boolean | null | undefined>)}`,
  );
  return getCampaignCatalogueResponseSchema.parse(res);
}

export async function getOrganisationCampaigns(
  organisationId: string,
  params?: CampaignListQueryDto,
): Promise<GetCampaignsResponseDto> {
  const res = await apiClient.get<unknown>(
    `/organisations/${organisationId}/campaigns${buildQueryString(params as Record<string, string | number | boolean | null | undefined>)}`,
  );
  return getCampaignsResponseSchema.parse(res);
}

export async function getPlatformCampaigns(
  params?: CampaignListQueryDto,
): Promise<GetCampaignsResponseDto> {
  const res = await apiClient.get<unknown>(
    `/platform/campaigns${buildQueryString(params as Record<string, string | number | boolean | null | undefined>)}`,
  );
  return getCampaignsResponseSchema.parse(res);
}

export async function getOrganisationCampaignDetail(
  organisationId: string,
  campaignId: string,
): Promise<CampaignDetailResponseDto> {
  const res = await apiClient.get<unknown>(
    `/organisations/${organisationId}/campaigns/${campaignId}`,
  );
  return campaignDetailResponseSchema.parse(res);
}

export async function getPlatformCampaignDetail(
  campaignId: string,
): Promise<CampaignDetailResponseDto> {
  const res = await apiClient.get<unknown>(`/platform/campaigns/${campaignId}`);
  return campaignDetailResponseSchema.parse(res);
}

export async function createOrganisationCampaignDraft(
  organisationId: string,
  data: CreateCampaignDraftRequestDto,
): Promise<CampaignDetailResponseDto> {
  const res = await apiClient.post<unknown, CreateCampaignDraftRequestDto>(
    `/organisations/${organisationId}/campaigns`,
    data,
  );
  return campaignDetailResponseSchema.parse(res);
}

export async function createPlatformCampaignDraft(
  data: CreateCampaignDraftRequestDto,
): Promise<CampaignDetailResponseDto> {
  const res = await apiClient.post<unknown, CreateCampaignDraftRequestDto>(
    '/platform/campaigns',
    data,
  );
  return campaignDetailResponseSchema.parse(res);
}

export async function updateOrganisationCampaignDraft(
  organisationId: string,
  campaignId: string,
  data: UpdateCampaignDraftRequestDto,
): Promise<CampaignDetailResponseDto> {
  const res = await apiClient.put<unknown, UpdateCampaignDraftRequestDto>(
    `/organisations/${organisationId}/campaigns/${campaignId}`,
    data,
  );
  return campaignDetailResponseSchema.parse(res);
}

export async function updatePlatformCampaignDraft(
  campaignId: string,
  data: UpdateCampaignDraftRequestDto,
): Promise<CampaignDetailResponseDto> {
  const res = await apiClient.put<unknown, UpdateCampaignDraftRequestDto>(
    `/platform/campaigns/${campaignId}`,
    data,
  );
  return campaignDetailResponseSchema.parse(res);
}

export async function activateOrganisationCampaign(
  organisationId: string,
  campaignId: string,
  precondition: CampaignMutationPreconditionDto,
): Promise<CampaignLifecycleActionResponseDto> {
  const res = await apiClient.post<unknown, CampaignMutationPreconditionDto>(
    `/organisations/${organisationId}/campaigns/${campaignId}/activate`,
    precondition,
  );
  return campaignLifecycleActionResponseSchema.parse(res);
}

export async function activatePlatformCampaign(
  campaignId: string,
  precondition: CampaignMutationPreconditionDto,
): Promise<CampaignLifecycleActionResponseDto> {
  const res = await apiClient.post<unknown, CampaignMutationPreconditionDto>(
    `/platform/campaigns/${campaignId}/activate`,
    precondition,
  );
  return campaignLifecycleActionResponseSchema.parse(res);
}

export async function archiveOrganisationCampaign(
  organisationId: string,
  campaignId: string,
  precondition: CampaignMutationPreconditionDto,
): Promise<CampaignLifecycleActionResponseDto> {
  const res = await apiClient.post<unknown, CampaignMutationPreconditionDto>(
    `/organisations/${organisationId}/campaigns/${campaignId}/archive`,
    precondition,
  );
  return campaignLifecycleActionResponseSchema.parse(res);
}

export async function archivePlatformCampaign(
  campaignId: string,
  precondition: CampaignMutationPreconditionDto,
): Promise<CampaignLifecycleActionResponseDto> {
  const res = await apiClient.post<unknown, CampaignMutationPreconditionDto>(
    `/platform/campaigns/${campaignId}/archive`,
    precondition,
  );
  return campaignLifecycleActionResponseSchema.parse(res);
}

export async function reactivateOrganisationCampaign(
  organisationId: string,
  campaignId: string,
  precondition: CampaignMutationPreconditionDto,
): Promise<CampaignLifecycleActionResponseDto> {
  const res = await apiClient.post<unknown, CampaignMutationPreconditionDto>(
    `/organisations/${organisationId}/campaigns/${campaignId}/reactivate`,
    precondition,
  );
  return campaignLifecycleActionResponseSchema.parse(res);
}

export async function reactivatePlatformCampaign(
  campaignId: string,
  precondition: CampaignMutationPreconditionDto,
): Promise<CampaignLifecycleActionResponseDto> {
  const res = await apiClient.post<unknown, CampaignMutationPreconditionDto>(
    `/platform/campaigns/${campaignId}/reactivate`,
    precondition,
  );
  return campaignLifecycleActionResponseSchema.parse(res);
}

import type {
  AddLibraryEmailToSimulatedInboxRequest,
  CampaignCatalogueQueryDto,
  CampaignProposalRequestDto,
  CampaignProposalResponseDto,
  CampaignDetailResponseDto,
  CampaignLifecycleActionResponseDto,
  CampaignListQueryDto,
  CampaignMutationPreconditionDto,
  CampaignStatisticsQueryDto,
  CreateSimulatedInboxDraftRequest,
  CreateCampaignDraftRequestDto,
  EnrolPlatformCampaignParamsDto,
  EnrolPlatformCampaignResponseDto,
  GetCampaignCatalogueResponseDto,
  GetPlatformCampaignsResponseDto,
  ListPlatformCampaignsQueryDto,
  GetCampaignsResponseDto,
  GetOrganisationCampaignStatisticsResponseDto,
  GetTraineeCampaignDetailResponseDto,
  GetTraineeCampaignsResponseDto,
  FollowUpCampaignProposalRequestDto,
  FollowUpCampaignProposalResponseDto,
  ListOrganisationEmailsQuery,
  ListSimulatedInboxesQuery,
  OrganisationEmailDraftInput,
  OrganisationEmailListResponse,
  OrganisationEmailManagementDetailResponse,
  OrganisationEmailRegistrationResponse,
  ReorderSimulatedInboxEmailsRequest,
  SimulatedInboxChildEmail,
  SimulatedInboxDetail,
  SimulatedInboxListResponse,
  SimulatedInboxSnapshotCreationResponse,
  UpdateCampaignDraftRequestDto,
  UpdateSimulatedInboxDraftRequest,
} from '@insightful-phish/shared';
import {
  campaignDetailResponseSchema,
  campaignProposalResponseSchema,
  campaignLifecycleActionResponseSchema,
  enrolPlatformCampaignResponseSchema,
  getCampaignCatalogueResponseSchema,
  getPlatformCampaignsResponseSchema,
  getCampaignsResponseSchema,
  getOrganisationCampaignStatisticsResponseSchema,
  getTraineeCampaignDetailResponseSchema,
  getTraineeCampaignsResponseSchema,
  followUpCampaignProposalResponseSchema,
  organisationEmailListResponseSchema,
  organisationEmailManagementDetailResponseSchema,
  organisationEmailRegistrationResponseSchema,
  simulatedInboxChildEmailSchema,
  simulatedInboxDetailSchema,
  simulatedInboxListResponseSchema,
  simulatedInboxSnapshotCreationResponseSchema,
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

export async function discoverPlatformCampaigns(
  params: ListPlatformCampaignsQueryDto,
): Promise<GetPlatformCampaignsResponseDto> {
  const res = await apiClient.get<unknown>(
    `/trainee/platform-campaigns${buildQueryString({
      page: params.page,
      limit: params.limit,
      search: params.search,
    })}`,
  );
  return getPlatformCampaignsResponseSchema.parse(res);
}

export async function getTraineeCampaigns(): Promise<GetTraineeCampaignsResponseDto> {
  const res = await apiClient.get<unknown>('/trainee/campaigns');
  return getTraineeCampaignsResponseSchema.parse(res);
}

export async function enrolPlatformCampaign({
  campaignId,
}: EnrolPlatformCampaignParamsDto): Promise<EnrolPlatformCampaignResponseDto> {
  const res = await apiClient.post<unknown>(
    `/trainee/platform-campaigns/${encodeURIComponent(campaignId)}/enrol`,
  );
  return enrolPlatformCampaignResponseSchema.parse(res);
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

export async function generateOrganisationCampaignProposal(
  organisationId: string,
  request: CampaignProposalRequestDto,
): Promise<CampaignProposalResponseDto> {
  const response = await apiClient.post<unknown, CampaignProposalRequestDto>(
    `/organisations/${encodeURIComponent(organisationId)}/campaign-proposals/generate`,
    request,
  );
  return campaignProposalResponseSchema.parse(response);
}

export async function generateOrganisationFollowUpCampaignProposal(
  organisationId: string,
  request: FollowUpCampaignProposalRequestDto,
): Promise<FollowUpCampaignProposalResponseDto> {
  const response = await apiClient.post<unknown, FollowUpCampaignProposalRequestDto>(
    `/organisations/${encodeURIComponent(organisationId)}/campaign-proposals/follow-up/generate`,
    request,
  );
  return followUpCampaignProposalResponseSchema.parse(response);
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

export async function getOrganisationCampaignStatistics(
  organisationId: string,
  campaignId: string,
  params?: CampaignStatisticsQueryDto,
): Promise<GetOrganisationCampaignStatisticsResponseDto> {
  const res = await apiClient.get<unknown>(
    `/organisations/${organisationId}/campaigns/${campaignId}/statistics${buildQueryString({
      page: params?.page,
      limit: params?.limit,
    })}`,
  );

  return getOrganisationCampaignStatisticsResponseSchema.parse(res);
}

export async function getPlatformCampaignDetail(
  campaignId: string,
): Promise<CampaignDetailResponseDto> {
  const res = await apiClient.get<unknown>(`/platform/campaigns/${campaignId}`);
  return campaignDetailResponseSchema.parse(res);
}

export async function copyOrganisationCampaigntoDraft(
  organisationId: string,
  campaignId: string,
): Promise<CampaignDetailResponseDto> {
  const res = await apiClient.post<unknown>(
    `/organisations/${organisationId}/campaigns/${campaignId}/copy`,
  );
  return campaignDetailResponseSchema.parse(res);
}

export async function copyPlatformCampaignToDraft(
  campaignId: string,
): Promise<CampaignDetailResponseDto> {
  const res = await apiClient.post<unknown>(`/platform/campaigns/${campaignId}/copy`);
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

function organisationEmailPath(organisationId: string, emailId?: string): string {
  const collection = `/organisations/${encodeURIComponent(organisationId)}/email-library`;
  return emailId ? `${collection}/${encodeURIComponent(emailId)}` : collection;
}

export async function getOrganisationEmails(
  organisationId: string,
  params: ListOrganisationEmailsQuery,
): Promise<OrganisationEmailListResponse> {
  const response = await apiClient.get<unknown>(
    `${organisationEmailPath(organisationId)}${buildQueryString(params)}`,
  );
  return organisationEmailListResponseSchema.parse(response);
}

export async function getOrganisationEmail(
  organisationId: string,
  emailId: string,
): Promise<OrganisationEmailManagementDetailResponse> {
  const response = await apiClient.get<unknown>(organisationEmailPath(organisationId, emailId));
  return organisationEmailManagementDetailResponseSchema.parse(response);
}

export async function registerOrganisationEmail(
  organisationId: string,
  input: OrganisationEmailDraftInput,
): Promise<OrganisationEmailRegistrationResponse> {
  const response = await apiClient.post<unknown, OrganisationEmailDraftInput>(
    organisationEmailPath(organisationId),
    input,
  );
  return organisationEmailRegistrationResponseSchema.parse(response);
}

export async function updateOrganisationEmail(
  organisationId: string,
  emailId: string,
  input: OrganisationEmailDraftInput,
): Promise<OrganisationEmailManagementDetailResponse> {
  const response = await apiClient.patch<unknown, OrganisationEmailDraftInput>(
    organisationEmailPath(organisationId, emailId),
    input,
  );
  return organisationEmailManagementDetailResponseSchema.parse(response);
}

export async function activateOrganisationEmail(
  organisationId: string,
  emailId: string,
): Promise<OrganisationEmailManagementDetailResponse> {
  const response = await apiClient.post<unknown, Record<string, never>>(
    `${organisationEmailPath(organisationId, emailId)}/activate`,
    {},
  );
  return organisationEmailManagementDetailResponseSchema.parse(response);
}

export async function copyOrganisationEmail(
  organisationId: string,
  emailId: string,
): Promise<OrganisationEmailManagementDetailResponse> {
  const response = await apiClient.post<unknown, Record<string, never>>(
    `${organisationEmailPath(organisationId, emailId)}/copy`,
    {},
  );
  return organisationEmailManagementDetailResponseSchema.parse(response);
}

function simulatedInboxPath(organisationId: string, simulationId?: string): string {
  const collection = `/organisations/${encodeURIComponent(organisationId)}/simulated-inboxes`;
  return simulationId ? `${collection}/${encodeURIComponent(simulationId)}` : collection;
}

export async function getSimulatedInboxes(
  organisationId: string,
  params: ListSimulatedInboxesQuery,
): Promise<SimulatedInboxListResponse> {
  const response = await apiClient.get<unknown>(
    `${simulatedInboxPath(organisationId)}${buildQueryString(params)}`,
  );
  return simulatedInboxListResponseSchema.parse(response);
}

export async function createSimulatedInboxDraft(
  organisationId: string,
  input: CreateSimulatedInboxDraftRequest,
): Promise<SimulatedInboxDetail> {
  const response = await apiClient.post<unknown, CreateSimulatedInboxDraftRequest>(
    simulatedInboxPath(organisationId),
    input,
  );
  return simulatedInboxDetailSchema.parse(response);
}

export async function getSimulatedInbox(
  organisationId: string,
  simulationId: string,
): Promise<SimulatedInboxDetail> {
  const response = await apiClient.get<unknown>(simulatedInboxPath(organisationId, simulationId));
  return simulatedInboxDetailSchema.parse(response);
}

export async function updateSimulatedInboxDraft(
  organisationId: string,
  simulationId: string,
  input: UpdateSimulatedInboxDraftRequest,
): Promise<SimulatedInboxDetail> {
  const response = await apiClient.patch<unknown, UpdateSimulatedInboxDraftRequest>(
    simulatedInboxPath(organisationId, simulationId),
    input,
  );
  return simulatedInboxDetailSchema.parse(response);
}

export async function addAuthoredEmailToSimulatedInbox(
  organisationId: string,
  simulationId: string,
  input: OrganisationEmailDraftInput,
): Promise<SimulatedInboxSnapshotCreationResponse> {
  const response = await apiClient.post<unknown, OrganisationEmailDraftInput>(
    `${simulatedInboxPath(organisationId, simulationId)}/emails/authored`,
    input,
  );
  return simulatedInboxSnapshotCreationResponseSchema.parse(response);
}

export async function addLibraryEmailToSimulatedInbox(
  organisationId: string,
  simulationId: string,
  input: AddLibraryEmailToSimulatedInboxRequest,
): Promise<SimulatedInboxSnapshotCreationResponse> {
  const response = await apiClient.post<unknown, AddLibraryEmailToSimulatedInboxRequest>(
    `${simulatedInboxPath(organisationId, simulationId)}/emails/from-library`,
    input,
  );
  return simulatedInboxSnapshotCreationResponseSchema.parse(response);
}

export async function updateSimulatedInboxEmail(
  organisationId: string,
  simulationId: string,
  emailId: string,
  input: OrganisationEmailDraftInput,
): Promise<SimulatedInboxChildEmail> {
  const response = await apiClient.patch<unknown, OrganisationEmailDraftInput>(
    `${simulatedInboxPath(organisationId, simulationId)}/emails/${encodeURIComponent(emailId)}`,
    input,
  );
  return simulatedInboxChildEmailSchema.parse(response);
}

export async function removeSimulatedInboxEmail(
  organisationId: string,
  simulationId: string,
  emailId: string,
): Promise<void> {
  await apiClient.delete<void>(
    `${simulatedInboxPath(organisationId, simulationId)}/emails/${encodeURIComponent(emailId)}`,
  );
}

export async function reorderSimulatedInboxEmails(
  organisationId: string,
  simulationId: string,
  input: ReorderSimulatedInboxEmailsRequest,
): Promise<SimulatedInboxDetail> {
  const response = await apiClient.put<unknown, ReorderSimulatedInboxEmailsRequest>(
    `${simulatedInboxPath(organisationId, simulationId)}/emails/order`,
    input,
  );
  return simulatedInboxDetailSchema.parse(response);
}

export async function activateSimulatedInbox(
  organisationId: string,
  simulationId: string,
): Promise<SimulatedInboxDetail> {
  const response = await apiClient.post<unknown, Record<string, never>>(
    `${simulatedInboxPath(organisationId, simulationId)}/activate`,
    {},
  );
  return simulatedInboxDetailSchema.parse(response);
}

export async function copySimulatedInbox(
  organisationId: string,
  simulationId: string,
): Promise<SimulatedInboxDetail> {
  const response = await apiClient.post<unknown, Record<string, never>>(
    `${simulatedInboxPath(organisationId, simulationId)}/copy`,
    {},
  );
  return simulatedInboxDetailSchema.parse(response);
}

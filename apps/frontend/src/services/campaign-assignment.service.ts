import {
  campaignAssignmentOptionsQuerySchema,
  campaignAssignmentsReadQuerySchema,
  createCampaignAssignmentsSchema,
  createCampaignAssignmentsResponseSchema,
  deleteCampaignAssignmentResponseSchema,
  getAssignableCampaignsResponseSchema,
  getCampaignAssignmentCandidatesResponseSchema,
  getCampaignAssignmentsResponseSchema,
  type CampaignAssignmentOptionsQueryDto,
  type CampaignAssignmentsReadQueryDto,
  type CreateCampaignAssignmentsRequestDto,
  type CreateCampaignAssignmentsResponseDto,
  type DeleteCampaignAssignmentResponseDto,
  type GetAssignableCampaignsResponseDto,
  type GetCampaignAssignmentCandidatesResponseDto,
  type GetCampaignAssignmentsResponseDto,
} from '@insightful-phish/shared';

import { apiClient } from '../lib/apiClient';

function buildQueryString(
  query: CampaignAssignmentOptionsQueryDto | CampaignAssignmentsReadQueryDto,
): string {
  const params = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit),
  });

  const search = query.search?.trim();

  if (search) {
    params.set('search', search);
  }

  if ('status' in query && query.status) {
    params.set('status', query.status);
  }

  return params.toString();
}

export async function getCampaignAssignmentCandidates(
  organisationId: string,
  query: CampaignAssignmentOptionsQueryDto,
): Promise<GetCampaignAssignmentCandidatesResponseDto> {
  const validatedQuery = campaignAssignmentOptionsQuerySchema.parse(query);
  const queryString = buildQueryString(validatedQuery);

  const response = await apiClient.get<unknown>(
    `/organisations/${encodeURIComponent(organisationId)}/campaign-assignment-candidates?${queryString}`,
  );

  return getCampaignAssignmentCandidatesResponseSchema.parse(response);
}

export async function getAssignableCampaigns(
  organisationId: string,
  query: CampaignAssignmentOptionsQueryDto,
): Promise<GetAssignableCampaignsResponseDto> {
  const validatedQuery = campaignAssignmentOptionsQuerySchema.parse(query);
  const queryString = buildQueryString(validatedQuery);

  const response = await apiClient.get<unknown>(
    `/organisations/${encodeURIComponent(organisationId)}/campaigns/assignable?${queryString}`,
  );

  return getAssignableCampaignsResponseSchema.parse(response);
}

export async function createCampaignAssignments(
  organisationId: string,
  payload: CreateCampaignAssignmentsRequestDto,
): Promise<CreateCampaignAssignmentsResponseDto> {
  const validatedPayload = createCampaignAssignmentsSchema.parse({
    campaignIds: [...new Set(payload.campaignIds)],
    traineeProfileIds: [...new Set(payload.traineeProfileIds)],
  });

  const response = await apiClient.post<unknown, CreateCampaignAssignmentsRequestDto>(
    `/organisations/${encodeURIComponent(organisationId)}/campaign-assignments`,
    validatedPayload,
  );

  return createCampaignAssignmentsResponseSchema.parse(response);
}

export async function getCampaignAssignmentsByTrainee(
  organisationId: string,
  traineeProfileId: string,
  query: CampaignAssignmentsReadQueryDto,
): Promise<GetCampaignAssignmentsResponseDto> {
  const validatedQuery = campaignAssignmentsReadQuerySchema.parse(query);
  const queryString = buildQueryString(validatedQuery);

  const response = await apiClient.get<unknown>(
    `/organisations/${encodeURIComponent(organisationId)}/trainees/${encodeURIComponent(traineeProfileId)}/campaign-assignments?${queryString}`,
  );

  return getCampaignAssignmentsResponseSchema.parse(response);
}

export async function deleteCampaignAssignment(
  organisationId: string,
  assignmentId: string,
): Promise<DeleteCampaignAssignmentResponseDto> {
  const response = await apiClient.delete<unknown>(
    `/organisations/${encodeURIComponent(organisationId)}/campaign-assignments/${encodeURIComponent(assignmentId)}`,
  );

  return deleteCampaignAssignmentResponseSchema.parse(response);
}

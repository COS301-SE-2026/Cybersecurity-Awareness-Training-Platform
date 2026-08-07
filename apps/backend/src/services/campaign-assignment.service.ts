import type {
  AssignableCampaignOptionDto,
  CampaignAssignmentCandidateOptionDto,
  CampaignAssignmentOptionsQueryDto,
  GetAssignableCampaignsResponseDto,
  GetCampaignAssignmentCandidatesResponseDto,
} from '@insightful-phish/shared';
import {
  findActorOrganisationAdmin,
  findAssignableCampaigns,
  findAssignmentCandidates,
} from '../repositories/campaign-assignment.repository.js';

export class CampaignAssignmentServiceError extends Error {
  constructor(
    public readonly statusCode: 401 | 403 | 404 | 422,
    public readonly error: string,
    message: string,
  ) {
    super(message);
    this.name = 'CampaignAssignmentServiceError';
  }
}

async function requireAuthorisedOrganisationAdmin(actorUserId: string, organisationId: string) {
  const actor = await findActorOrganisationAdmin({
    userId: actorUserId,
    organisationId,
  });

  if (!actor) {
    throw new CampaignAssignmentServiceError(
      404,
      'INACCESSIBLE_ORGANISATION',
      'Inaccessible organisation',
    );
  }

  if (actor.organisation.status !== 'ACTIVE') {
    throw new CampaignAssignmentServiceError(
      403,
      'ORGANISATION_NOT_ACTIVE',
      'Organisation is not active',
    );
  }

  const hasAssignPermission = actor.permissionGrants.some(
    (grant) => grant.organisationPermission.key === 'ASSIGN_CAMPAIGNS',
  );

  if (!hasAssignPermission) {
    throw new CampaignAssignmentServiceError(
      403,
      'MISSING_ASSIGN_CAMPAIGNS_PERMISSION',
      'Assign campaigns permission is required',
    );
  }

  return actor;
}

export async function getAssignableCampaigns(
  actorUserId: string,
  organisationId: string,
  query: CampaignAssignmentOptionsQueryDto,
): Promise<GetAssignableCampaignsResponseDto> {
  await requireAuthorisedOrganisationAdmin(actorUserId, organisationId);

  const { items: repoItems, total } = await findAssignableCampaigns({
    organisationId,
    page: query.page,
    limit: query.limit,
    search: query.search,
  });

  const totalPages = total > 0 ? Math.ceil(total / query.limit) : 0;

  const items: AssignableCampaignOptionDto[] = repoItems.map((item) => ({
    campaignId: item.id,
    name: item.name,
    description: item.description,
    status: item.status as AssignableCampaignOptionDto['status'],
    type: item.campaignType as AssignableCampaignOptionDto['type'],
    itemCount: item.itemCount,
    startDate: item.startDate ? item.startDate.toISOString() : null,
    endDate: item.endDate ? item.endDate.toISOString() : null,
    assignmentCount: item.assignmentCount,
  }));

  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
    },
  };
}

export async function getAssignmentCandidates(
  actorUserId: string,
  organisationId: string,
  query: CampaignAssignmentOptionsQueryDto,
): Promise<GetCampaignAssignmentCandidatesResponseDto> {
  await requireAuthorisedOrganisationAdmin(actorUserId, organisationId);

  const { items: repoItems, total } = await findAssignmentCandidates({
    organisationId,
    page: query.page,
    limit: query.limit,
    search: query.search,
  });

  const totalPages = total > 0 ? Math.ceil(total / query.limit) : 0;

  const items: CampaignAssignmentCandidateOptionDto[] = repoItems.map((item) => ({
    traineeProfileId: item.traineeProfileId,
    organisationTraineeProfileId: item.id,
    userId: item.userId,
    displayName: `${item.firstName} ${item.lastName}`.trim(),
    email: item.email,
    active: true,
  }));

  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
    },
  };
}

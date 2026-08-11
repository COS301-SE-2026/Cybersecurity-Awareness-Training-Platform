import type {
  AssignableCampaignOptionDto,
  CampaignAssignmentCandidateOptionDto,
  CampaignAssignmentOptionsQueryDto,
  CampaignAssignmentReadRowDto,
  CampaignAssignmentsReadQueryDto,
  CreateCampaignAssignmentsRequestDto,
  CreateCampaignAssignmentsResponseDto,
  DeleteCampaignAssignmentResponseDto,
  GetAssignableCampaignsResponseDto,
  GetCampaignAssignmentCandidatesResponseDto,
  GetCampaignAssignmentsResponseDto,
} from '@insightful-phish/shared';
import {
  deleteCampaignAssignment as deleteCampaignAssignmentInRepo,
  executeBulkCampaignAssignment,
  findActorOrganisationAdmin,
  findActorOrganisationTrainee,
  findAssignableCampaigns,
  findAssignmentCandidates,
  findCampaignAssignmentsByCampaign,
  findCampaignAssignmentsByTrainee,
  findCampaignByIdInOrganisation,
  findTraineeByIdInOrganisation,
} from '../repositories/campaign-assignment.repository.js';

import { recordAuditLog } from './audit-log.service.js';

export class CampaignAssignmentServiceError extends Error {
  constructor(
    public readonly statusCode: 401 | 403 | 404 | 409 | 422,
    public readonly error: string,
    message: string,
  ) {
    super(message);
    this.name = 'CampaignAssignmentServiceError';
  }
}

async function requireAuthorisedOrganisationAdmin(actorUserId: string, organisationId: string) {
  const adminActor = await findActorOrganisationAdmin({
    userId: actorUserId,
    organisationId,
  });

  if (!adminActor) {
    const traineeActor = await findActorOrganisationTrainee({
      userId: actorUserId,
      organisationId,
    });

    if (traineeActor) {
      if (traineeActor.organisation.status !== 'ACTIVE') {
        throw new CampaignAssignmentServiceError(
          403,
          'ORGANISATION_NOT_ACTIVE',
          'Organisation is not active',
        );
      }

      throw new CampaignAssignmentServiceError(
        403,
        'FORBIDDEN_ORGANISATION_ROLE',
        'Trainees cannot manage campaign assignments',
      );
    }

    throw new CampaignAssignmentServiceError(
      404,
      'INACCESSIBLE_ORGANISATION',
      'Inaccessible organisation',
    );
  }

  if (adminActor.organisation.status !== 'ACTIVE') {
    throw new CampaignAssignmentServiceError(
      403,
      'ORGANISATION_NOT_ACTIVE',
      'Organisation is not active',
    );
  }

  const hasAssignPermission = adminActor.permissionGrants.some(
    (grant) => grant.organisationPermission.key === 'ASSIGN_CAMPAIGNS',
  );

  if (!hasAssignPermission) {
    throw new CampaignAssignmentServiceError(
      403,
      'MISSING_ASSIGN_CAMPAIGNS_PERMISSION',
      'Assign campaigns permission is required',
    );
  }

  return adminActor;
}

function formatCampaignAssignmentReadRows(
  repoItems: Array<{
    assignmentId: string;
    campaignId: string;
    campaignName: string;
    campaignStatus: string;
    campaignType: string;
    traineeProfileId: string;
    firstName: string;
    lastName: string;
    email: string;
    traineeStatus: string;
    assignmentStatus: string;
    accessType: string;
    assignedAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
  }>,
): CampaignAssignmentReadRowDto[] {
  return repoItems.map((item) => ({
    assignmentId: item.assignmentId,
    campaignId: item.campaignId,
    campaignName: item.campaignName,
    campaignStatus: item.campaignStatus as CampaignAssignmentReadRowDto['campaignStatus'],
    campaignType: item.campaignType as CampaignAssignmentReadRowDto['campaignType'],
    traineeProfileId: item.traineeProfileId,
    displayName: `${item.firstName} ${item.lastName}`.trim(),
    email: item.email,
    traineeStatus: item.traineeStatus as CampaignAssignmentReadRowDto['traineeStatus'],
    assignmentStatus: item.assignmentStatus as CampaignAssignmentReadRowDto['assignmentStatus'],
    accessType: item.accessType as CampaignAssignmentReadRowDto['accessType'],
    assignedAt: item.assignedAt.toISOString(),
    startedAt: item.startedAt ? item.startedAt.toISOString() : null,
    completedAt: item.completedAt ? item.completedAt.toISOString() : null,
  }));
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

export async function createCampaignAssignments(
  actorUserId: string,
  organisationId: string,
  body: CreateCampaignAssignmentsRequestDto,
): Promise<CreateCampaignAssignmentsResponseDto> {
  await requireAuthorisedOrganisationAdmin(actorUserId, organisationId);

  const uniqueCampaignIds = Array.from(new Set(body.campaignIds));
  const uniqueTraineeProfileIds = Array.from(new Set(body.traineeProfileIds));

  const result = await executeBulkCampaignAssignment({
    organisationId,
    campaignIds: uniqueCampaignIds,
    traineeProfileIds: uniqueTraineeProfileIds,
    actorUserId,
  });

  if (!result.success) {
    const statusCode =
      result.error === 'CAMPAIGN_NOT_FOUND' || result.error === 'TRAINEE_NOT_FOUND' ? 404 : 409;
    throw new CampaignAssignmentServiceError(statusCode, result.error, result.message);
  }

  try {
    await recordAuditLog({
      actorUserId,
      actorType: 'ORGANISATION_ADMIN',
      organisationId,
      targetType: 'CAMPAIGN',
      targetId: uniqueCampaignIds[0] ?? organisationId,
      actionType: 'CREATED',
      outcome: 'SUCCESS',
      metadata: {
        campaignIds: uniqueCampaignIds,
        traineeProfileIds: uniqueTraineeProfileIds,
        requestedCount: result.summary.requestedPairs,
        createdCount: result.summary.createdCount,
        alreadyAssignedCount: result.summary.alreadyAssignedCount,
      },
    });
  } catch (_auditError) {
    // Non-blocking audit log catch
  }

  return {
    created: result.created,
    alreadyAssigned: result.alreadyAssigned,
    summary: result.summary,
  };
}

export async function getCampaignAssignmentsByCampaign(
  actorUserId: string,
  organisationId: string,
  campaignId: string,
  query: CampaignAssignmentsReadQueryDto,
): Promise<GetCampaignAssignmentsResponseDto> {
  await requireAuthorisedOrganisationAdmin(actorUserId, organisationId);

  const campaign = await findCampaignByIdInOrganisation(organisationId, campaignId);
  if (!campaign) {
    throw new CampaignAssignmentServiceError(
      404,
      'CAMPAIGN_NOT_FOUND',
      'Campaign was not found in this organisation',
    );
  }

  const { items: repoItems, total } = await findCampaignAssignmentsByCampaign({
    organisationId,
    campaignId,
    page: query.page,
    limit: query.limit,
    search: query.search,
    status: query.status,
  });

  const totalPages = total > 0 ? Math.ceil(total / query.limit) : 0;

  return {
    items: formatCampaignAssignmentReadRows(repoItems),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
    },
  };
}

export async function getCampaignAssignmentsByTrainee(
  actorUserId: string,
  organisationId: string,
  traineeProfileId: string,
  query: CampaignAssignmentsReadQueryDto,
): Promise<GetCampaignAssignmentsResponseDto> {
  await requireAuthorisedOrganisationAdmin(actorUserId, organisationId);

  const trainee = await findTraineeByIdInOrganisation(organisationId, traineeProfileId);
  if (!trainee) {
    throw new CampaignAssignmentServiceError(
      404,
      'TRAINEE_NOT_FOUND',
      'Trainee profile was not found in this organisation',
    );
  }

  const { items: repoItems, total } = await findCampaignAssignmentsByTrainee({
    organisationId,
    traineeProfileId,
    page: query.page,
    limit: query.limit,
    search: query.search,
    status: query.status,
  });

  const totalPages = total > 0 ? Math.ceil(total / query.limit) : 0;

  return {
    items: formatCampaignAssignmentReadRows(repoItems),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
    },
  };
}

export async function deleteCampaignAssignment(
  actorUserId: string,
  organisationId: string,
  assignmentId: string,
): Promise<DeleteCampaignAssignmentResponseDto> {
  await requireAuthorisedOrganisationAdmin(actorUserId, organisationId);

  const result = await deleteCampaignAssignmentInRepo({
    organisationId,
    assignmentId,
    actorUserId,
  });

  if (!result.success) {
    throw new CampaignAssignmentServiceError(404, 'ASSIGNMENT_NOT_FOUND', result.message);
  }

  return {
    assignmentId: result.assignmentId,
    campaignId: result.campaignId,
    traineeProfileId: result.traineeProfileId,
    unassigned: true,
    deletedProgress: result.deletedProgress,
  };
}

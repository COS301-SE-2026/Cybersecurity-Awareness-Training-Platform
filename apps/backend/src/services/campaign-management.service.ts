import type {
  CampaignCatalogueQueryDto,
  CampaignDetailItemDto,
  CampaignDetailResponseDto,
  CampaignLifecycleActionResponseDto,
  CampaignListQueryDto,
  CampaignListRowDto,
  CampaignStatusDto,
  CampaignTypeDto,
  CreateCampaignDraftItemInputDto,
  CreateCampaignDraftRequestDto,
  GetCampaignCatalogueResponseDto,
  GetCampaignsResponseDto,
  PaginationMetadataDto,
  SupportedTraineeCampaignComponentTypeDto,
  UpdateCampaignDraftRequestDto,
} from '@insightful-phish/shared';

import * as CampaignManagementRepository from '../repositories/campaign-management.repository.js';
import * as OrganisationScopeRepository from '../repositories/organisation-scope.repository.js';

export type UserActorContext = {
  userId: string;
  userType: 'ORGANISATION_ADMIN' | 'IP_ADMIN' | string;
};

export class CampaignManagementServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly error: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'CampaignManagementServiceError';
  }
}

function buildPaginationMetadata(
  page: number,
  limit: number,
  totalItems: number,
): PaginationMetadataDto {
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 0;
  return {
    page,
    limit,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

async function validateOrganisationAdminActor(
  actor: UserActorContext,
  organisationId: string,
  requiredPermissionKey?: 'VIEW_CAMPAIGNS' | 'MANAGE_CAMPAIGNS',
) {
  const adminScope = await OrganisationScopeRepository.findOrganisationAdminActorScope({
    userId: actor.userId,
    organisationId,
  });

  if (!adminScope) {
    throw new CampaignManagementServiceError(
      404,
      'ORGANISATION_NOT_FOUND',
      'Organisation context not found or user is not an active admin',
    );
  }

  if (requiredPermissionKey) {
    const hasPermission = adminScope.permissionGrants.some(
      (grant) => grant.organisationPermission.key === requiredPermissionKey,
    );
    if (!hasPermission) {
      throw new CampaignManagementServiceError(
        403,
        'FORBIDDEN',
        `Missing required permission: ${requiredPermissionKey}`,
      );
    }
  }

  return adminScope;
}

async function validatePlatformAdminActor(actor: UserActorContext) {
  const ipAdmin = await OrganisationScopeRepository.findActiveIpAdminScope(actor.userId);
  if (!ipAdmin) {
    throw new CampaignManagementServiceError(
      403,
      'FORBIDDEN',
      'Platform administrator access is required',
    );
  }
  return ipAdmin;
}

function computeAllowedActions(
  status: string,
  userType: string,
  isManager: boolean,
): Array<'VIEW' | 'EDIT' | 'ACTIVATE' | 'ARCHIVE' | 'REACTIVATE' | 'ASSIGN'> {
  if (!isManager && userType !== 'IP_ADMIN') {
    return ['VIEW'];
  }

  switch (status) {
    case 'DRAFT':
      return ['VIEW', 'EDIT', 'ACTIVATE'];
    case 'ACTIVE':
      return ['VIEW', 'ARCHIVE', 'ASSIGN'];
    case 'ARCHIVED':
      return ['VIEW', 'REACTIVATE'];
    default:
      return ['VIEW'];
  }
}

export async function getOrganisationCampaignCatalogue(
  actor: UserActorContext,
  organisationId: string,
  query: CampaignCatalogueQueryDto,
): Promise<GetCampaignCatalogueResponseDto> {
  await validateOrganisationAdminActor(actor, organisationId, 'VIEW_CAMPAIGNS');

  const { items, total } = await CampaignManagementRepository.findCampaignCatalogue({
    page: query.page,
    limit: query.limit,
    search: query.search,
    type: query.type,
  });

  return {
    items,
    pagination: buildPaginationMetadata(query.page, query.limit, total),
  };
}

export async function getPlatformCampaignCatalogue(
  actor: UserActorContext,
  query: CampaignCatalogueQueryDto,
): Promise<GetCampaignCatalogueResponseDto> {
  await validatePlatformAdminActor(actor);

  const { items, total } = await CampaignManagementRepository.findCampaignCatalogue({
    page: query.page,
    limit: query.limit,
    search: query.search,
    type: query.type,
  });

  return {
    items,
    pagination: buildPaginationMetadata(query.page, query.limit, total),
  };
}

export async function getOrganisationCampaigns(
  actor: UserActorContext,
  organisationId: string,
  query: CampaignListQueryDto,
): Promise<GetCampaignsResponseDto> {
  const adminScope = await validateOrganisationAdminActor(actor, organisationId, 'VIEW_CAMPAIGNS');
  const isManager = adminScope.permissionGrants.some(
    (grant) => grant.organisationPermission.key === 'MANAGE_CAMPAIGNS',
  );

  const { items, total } = await CampaignManagementRepository.findCampaigns({
    organisationId,
    page: query.page,
    limit: query.limit,
    search: query.search,
    status: query.status,
  });

  const rowDtos: CampaignListRowDto[] = items.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    accentColor: row.accentColor,
    campaignType: row.campaignType as CampaignTypeDto,
    status: row.status as CampaignStatusDto,
    itemCount: row.itemCount,
    startDate: row.startDate ? row.startDate.toISOString() : null,
    endDate: row.endDate ? row.endDate.toISOString() : null,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    allowedActions: computeAllowedActions(row.status, actor.userType, isManager),
  }));

  return {
    items: rowDtos,
    pagination: buildPaginationMetadata(query.page, query.limit, total),
  };
}

export async function getPlatformCampaigns(
  actor: UserActorContext,
  query: CampaignListQueryDto,
): Promise<GetCampaignsResponseDto> {
  await validatePlatformAdminActor(actor);

  const { items, total } = await CampaignManagementRepository.findCampaigns({
    platformOnly: true,
    page: query.page,
    limit: query.limit,
    search: query.search,
    status: query.status,
  });

  const rowDtos: CampaignListRowDto[] = items.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    accentColor: row.accentColor,
    campaignType: row.campaignType as CampaignTypeDto,
    status: row.status as CampaignStatusDto,
    itemCount: row.itemCount,
    startDate: row.startDate ? row.startDate.toISOString() : null,
    endDate: row.endDate ? row.endDate.toISOString() : null,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    allowedActions: computeAllowedActions(row.status, actor.userType, true),
  }));

  return {
    items: rowDtos,
    pagination: buildPaginationMetadata(query.page, query.limit, total),
  };
}

export async function getOrganisationCampaignDetail(
  actor: UserActorContext,
  organisationId: string,
  campaignId: string,
): Promise<CampaignDetailResponseDto> {
  const adminScope = await validateOrganisationAdminActor(actor, organisationId, 'VIEW_CAMPAIGNS');
  const isManager = adminScope.permissionGrants.some(
    (grant) => grant.organisationPermission.key === 'MANAGE_CAMPAIGNS',
  );

  const campaign = await CampaignManagementRepository.findCampaignById(campaignId, {
    organisationId,
  });

  if (!campaign) {
    throw new CampaignManagementServiceError(404, 'NOT_FOUND', 'Campaign not found');
  }

  const items: CampaignDetailItemDto[] = campaign.items.map((item) => ({
    campaignItemId: item.campaignItemId,
    componentType: item.componentType as SupportedTraineeCampaignComponentTypeDto,
    contentId: item.contentId,
    title: item.title,
    description: item.description,
    position: item.position,
    isRequired: item.isRequired,
    sourceAvailable: item.sourceAvailable,
  }));

  return {
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
    accentColor: campaign.accentColor,
    campaignType: campaign.campaignType as CampaignTypeDto,
    status: campaign.status as CampaignStatusDto,
    startDate: campaign.startDate ? campaign.startDate.toISOString() : null,
    endDate: campaign.endDate ? campaign.endDate.toISOString() : null,
    createdBy: campaign.createdBy,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
    allowedActions: computeAllowedActions(campaign.status, actor.userType, isManager),
    items,
  };
}

export async function getPlatformCampaignDetail(
  actor: UserActorContext,
  campaignId: string,
): Promise<CampaignDetailResponseDto> {
  await validatePlatformAdminActor(actor);

  const campaign = await CampaignManagementRepository.findCampaignById(campaignId, {
    platformOnly: true,
  });

  if (!campaign) {
    throw new CampaignManagementServiceError(404, 'NOT_FOUND', 'Platform campaign not found');
  }

  const items: CampaignDetailItemDto[] = campaign.items.map((item) => ({
    campaignItemId: item.campaignItemId,
    componentType: item.componentType as SupportedTraineeCampaignComponentTypeDto,
    contentId: item.contentId,
    title: item.title,
    description: item.description,
    position: item.position,
    isRequired: item.isRequired,
    sourceAvailable: item.sourceAvailable,
  }));

  return {
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
    accentColor: campaign.accentColor,
    campaignType: campaign.campaignType as CampaignTypeDto,
    status: campaign.status as CampaignStatusDto,
    startDate: campaign.startDate ? campaign.startDate.toISOString() : null,
    endDate: campaign.endDate ? campaign.endDate.toISOString() : null,
    createdBy: campaign.createdBy,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
    allowedActions: computeAllowedActions(campaign.status, actor.userType, true),
    items,
  };
}

export async function createOrganisationCampaignDraft(
  actor: UserActorContext,
  organisationId: string,
  input: CreateCampaignDraftRequestDto,
): Promise<CampaignDetailResponseDto> {
  await validateOrganisationAdminActor(actor, organisationId, 'MANAGE_CAMPAIGNS');

  let startDate: Date | null = null;
  let endDate: Date | null = null;

  if (input.startDate) {
    startDate = new Date(input.startDate);
  }
  if (input.endDate) {
    endDate = new Date(input.endDate);
  }

  if (startDate && endDate && endDate.getTime() <= startDate.getTime()) {
    throw new CampaignManagementServiceError(
      400,
      'VALIDATION_ERROR',
      'endDate must be after startDate',
    );
  }

  const createdId = await CampaignManagementRepository.createCampaignDraft({
    name: input.name,
    description: input.description ?? null,
    accentColor: input.accentColor,
    startDate,
    endDate,
    campaignType: 'ORGANISATION_CUSTOM',
    organisationId,
    createdByUserId: actor.userId,
    items: input.items.map((item: CreateCampaignDraftItemInputDto) => ({
      componentType: item.componentType,
      contentId: item.contentId,
      isRequired: item.isRequired ?? true,
    })),
  });

  return getOrganisationCampaignDetail(actor, organisationId, createdId);
}

export async function createPlatformCampaignDraft(
  actor: UserActorContext,
  input: CreateCampaignDraftRequestDto,
): Promise<CampaignDetailResponseDto> {
  await validatePlatformAdminActor(actor);

  if (input.startDate || input.endDate) {
    throw new CampaignManagementServiceError(
      400,
      'VALIDATION_ERROR',
      'Platform campaigns cannot have dates',
    );
  }

  const createdId = await CampaignManagementRepository.createCampaignDraft({
    name: input.name,
    description: input.description ?? null,
    accentColor: input.accentColor,
    startDate: null,
    endDate: null,
    campaignType: 'PREMADE_GENERAL',
    organisationId: null,
    createdByUserId: actor.userId,
    items: input.items.map((item: CreateCampaignDraftItemInputDto) => ({
      componentType: item.componentType,
      contentId: item.contentId,
      isRequired: item.isRequired ?? true,
    })),
  });

  return getPlatformCampaignDetail(actor, createdId);
}

export async function updateOrganisationCampaignDraft(
  actor: UserActorContext,
  organisationId: string,
  campaignId: string,
  input: UpdateCampaignDraftRequestDto,
): Promise<CampaignDetailResponseDto> {
  await validateOrganisationAdminActor(actor, organisationId, 'MANAGE_CAMPAIGNS');

  const existing = await CampaignManagementRepository.findCampaignById(campaignId, {
    organisationId,
  });

  if (!existing) {
    throw new CampaignManagementServiceError(404, 'NOT_FOUND', 'Campaign not found');
  }

  if (existing.status !== 'DRAFT') {
    throw new CampaignManagementServiceError(
      409,
      'CAMPAIGN_IMMUTABLE',
      'Active or Archived campaigns are immutable and cannot be updated as drafts',
    );
  }

  let startDate: Date | null = null;
  let endDate: Date | null = null;

  if (input.startDate) {
    startDate = new Date(input.startDate);
  }
  if (input.endDate) {
    endDate = new Date(input.endDate);
  }

  if (startDate && endDate && endDate.getTime() <= startDate.getTime()) {
    throw new CampaignManagementServiceError(
      400,
      'VALIDATION_ERROR',
      'endDate must be after startDate',
    );
  }

  await CampaignManagementRepository.updateCampaignDraft({
    campaignId,
    name: input.name,
    description: input.description ?? null,
    accentColor: input.accentColor,
    startDate,
    endDate,
    items: input.items.map((item: CreateCampaignDraftItemInputDto) => ({
      campaignItemId: item.campaignItemId,
      componentType: item.componentType,
      contentId: item.contentId,
      isRequired: item.isRequired ?? true,
    })),
  });

  return getOrganisationCampaignDetail(actor, organisationId, campaignId);
}

export async function updatePlatformCampaignDraft(
  actor: UserActorContext,
  campaignId: string,
  input: UpdateCampaignDraftRequestDto,
): Promise<CampaignDetailResponseDto> {
  await validatePlatformAdminActor(actor);

  if (input.startDate || input.endDate) {
    throw new CampaignManagementServiceError(
      400,
      'VALIDATION_ERROR',
      'Platform campaigns cannot have dates',
    );
  }

  const existing = await CampaignManagementRepository.findCampaignById(campaignId, {
    platformOnly: true,
  });

  if (!existing) {
    throw new CampaignManagementServiceError(404, 'NOT_FOUND', 'Platform campaign not found');
  }

  if (existing.status !== 'DRAFT') {
    throw new CampaignManagementServiceError(
      409,
      'CAMPAIGN_IMMUTABLE',
      'Active or Archived campaigns are immutable and cannot be updated as drafts',
    );
  }

  await CampaignManagementRepository.updateCampaignDraft({
    campaignId,
    name: input.name,
    description: input.description ?? null,
    accentColor: input.accentColor,
    startDate: null,
    endDate: null,
    items: input.items.map((item: CreateCampaignDraftItemInputDto) => ({
      campaignItemId: item.campaignItemId,
      componentType: item.componentType,
      contentId: item.contentId,
      isRequired: item.isRequired ?? true,
    })),
  });

  return getPlatformCampaignDetail(actor, campaignId);
}

export async function activateOrganisationCampaign(
  actor: UserActorContext,
  organisationId: string,
  campaignId: string,
): Promise<CampaignLifecycleActionResponseDto> {
  await validateOrganisationAdminActor(actor, organisationId, 'MANAGE_CAMPAIGNS');

  const existing = await CampaignManagementRepository.findCampaignById(campaignId, {
    organisationId,
  });

  if (!existing) {
    throw new CampaignManagementServiceError(404, 'NOT_FOUND', 'Campaign not found');
  }

  if (existing.status !== 'DRAFT') {
    throw new CampaignManagementServiceError(
      409,
      'LIFECYCLE_CONFLICT',
      `Cannot activate campaign with status ${existing.status}`,
    );
  }

  if (existing.items.length === 0) {
    throw new CampaignManagementServiceError(
      409,
      'EMPTY_CAMPAIGN',
      'Campaign must contain at least one item before activation',
    );
  }

  const hasUnavailableContent = existing.items.some((item) => !item.sourceAvailable);
  if (hasUnavailableContent) {
    throw new CampaignManagementServiceError(
      409,
      'UNAVAILABLE_CONTENT',
      'Campaign contains unavailable or unapproved component content',
    );
  }

  await CampaignManagementRepository.activateCampaign(campaignId, actor.userId, organisationId);

  const updated = await getOrganisationCampaignDetail(actor, organisationId, campaignId);

  return {
    success: true,
    campaignId,
    status: 'ACTIVE',
    allowedActions: updated.allowedActions,
  };
}

export async function activatePlatformCampaign(
  actor: UserActorContext,
  campaignId: string,
): Promise<CampaignLifecycleActionResponseDto> {
  await validatePlatformAdminActor(actor);

  const existing = await CampaignManagementRepository.findCampaignById(campaignId, {
    platformOnly: true,
  });

  if (!existing) {
    throw new CampaignManagementServiceError(404, 'NOT_FOUND', 'Platform campaign not found');
  }

  if (existing.status !== 'DRAFT') {
    throw new CampaignManagementServiceError(
      409,
      'LIFECYCLE_CONFLICT',
      `Cannot activate platform campaign with status ${existing.status}`,
    );
  }

  if (existing.items.length === 0) {
    throw new CampaignManagementServiceError(
      409,
      'EMPTY_CAMPAIGN',
      'Campaign must contain at least one item before activation',
    );
  }

  const hasUnavailableContent = existing.items.some((item) => !item.sourceAvailable);
  if (hasUnavailableContent) {
    throw new CampaignManagementServiceError(
      409,
      'UNAVAILABLE_CONTENT',
      'Campaign contains unavailable or unapproved component content',
    );
  }

  await CampaignManagementRepository.activateCampaign(campaignId, actor.userId, null);

  const updated = await getPlatformCampaignDetail(actor, campaignId);

  return {
    success: true,
    campaignId,
    status: 'ACTIVE',
    allowedActions: updated.allowedActions,
  };
}

export async function archiveOrganisationCampaign(
  actor: UserActorContext,
  organisationId: string,
  campaignId: string,
): Promise<CampaignLifecycleActionResponseDto> {
  await validateOrganisationAdminActor(actor, organisationId, 'MANAGE_CAMPAIGNS');

  const existing = await CampaignManagementRepository.findCampaignById(campaignId, {
    organisationId,
  });

  if (!existing) {
    throw new CampaignManagementServiceError(404, 'NOT_FOUND', 'Campaign not found');
  }

  if (existing.status !== 'ACTIVE') {
    throw new CampaignManagementServiceError(
      409,
      'LIFECYCLE_CONFLICT',
      `Cannot archive campaign with status ${existing.status}`,
    );
  }

  await CampaignManagementRepository.archiveCampaign(campaignId, actor.userId, organisationId);

  const updated = await getOrganisationCampaignDetail(actor, organisationId, campaignId);

  return {
    success: true,
    campaignId,
    status: 'ARCHIVED',
    allowedActions: updated.allowedActions,
  };
}

export async function archivePlatformCampaign(
  actor: UserActorContext,
  campaignId: string,
): Promise<CampaignLifecycleActionResponseDto> {
  await validatePlatformAdminActor(actor);

  const existing = await CampaignManagementRepository.findCampaignById(campaignId, {
    platformOnly: true,
  });

  if (!existing) {
    throw new CampaignManagementServiceError(404, 'NOT_FOUND', 'Platform campaign not found');
  }

  if (existing.status !== 'ACTIVE') {
    throw new CampaignManagementServiceError(
      409,
      'LIFECYCLE_CONFLICT',
      `Cannot archive platform campaign with status ${existing.status}`,
    );
  }

  await CampaignManagementRepository.archiveCampaign(campaignId, actor.userId, null);

  const updated = await getPlatformCampaignDetail(actor, campaignId);

  return {
    success: true,
    campaignId,
    status: 'ARCHIVED',
    allowedActions: updated.allowedActions,
  };
}

export async function reactivateOrganisationCampaign(
  actor: UserActorContext,
  organisationId: string,
  campaignId: string,
): Promise<CampaignLifecycleActionResponseDto> {
  await validateOrganisationAdminActor(actor, organisationId, 'MANAGE_CAMPAIGNS');

  const existing = await CampaignManagementRepository.findCampaignById(campaignId, {
    organisationId,
  });

  if (!existing) {
    throw new CampaignManagementServiceError(404, 'NOT_FOUND', 'Campaign not found');
  }

  if (existing.status !== 'ARCHIVED') {
    throw new CampaignManagementServiceError(
      409,
      'LIFECYCLE_CONFLICT',
      `Cannot reactivate campaign with status ${existing.status}`,
    );
  }

  const hasUnavailableContent = existing.items.some((item) => !item.sourceAvailable);
  if (hasUnavailableContent) {
    throw new CampaignManagementServiceError(
      409,
      'UNAVAILABLE_CONTENT',
      'Campaign contains unavailable or unapproved component content',
    );
  }

  await CampaignManagementRepository.reactivateCampaign(campaignId, actor.userId, organisationId);

  const updated = await getOrganisationCampaignDetail(actor, organisationId, campaignId);

  return {
    success: true,
    campaignId,
    status: 'ACTIVE',
    allowedActions: updated.allowedActions,
  };
}

export async function reactivatePlatformCampaign(
  actor: UserActorContext,
  campaignId: string,
): Promise<CampaignLifecycleActionResponseDto> {
  await validatePlatformAdminActor(actor);

  const existing = await CampaignManagementRepository.findCampaignById(campaignId, {
    platformOnly: true,
  });

  if (!existing) {
    throw new CampaignManagementServiceError(404, 'NOT_FOUND', 'Platform campaign not found');
  }

  if (existing.status !== 'ARCHIVED') {
    throw new CampaignManagementServiceError(
      409,
      'LIFECYCLE_CONFLICT',
      `Cannot reactivate platform campaign with status ${existing.status}`,
    );
  }

  const hasUnavailableContent = existing.items.some((item) => !item.sourceAvailable);
  if (hasUnavailableContent) {
    throw new CampaignManagementServiceError(
      409,
      'UNAVAILABLE_CONTENT',
      'Campaign contains unavailable or unapproved component content',
    );
  }

  await CampaignManagementRepository.reactivateCampaign(campaignId, actor.userId, null);

  const updated = await getPlatformCampaignDetail(actor, campaignId);

  return {
    success: true,
    campaignId,
    status: 'ACTIVE',
    allowedActions: updated.allowedActions,
  };
}

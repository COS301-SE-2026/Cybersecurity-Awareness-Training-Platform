import type {
  CampaignCatalogueQueryDto,
  CampaignDetailItemDto,
  CampaignDetailResponseDto,
  CampaignLifecycleActionResponseDto,
  CampaignListQueryDto,
  CampaignListRowDto,
  CreateCampaignDraftItemInputDto,
  CreateCampaignDraftRequestDto,
  GetCampaignCatalogueResponseDto,
  GetCampaignsResponseDto,
  PaginationMetadataDto,
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

function mapCampaignRow(
  row: Awaited<ReturnType<typeof CampaignManagementRepository.findCampaigns>>['items'][number],
  userType: string,
  isManager: boolean,
): CampaignListRowDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    accentColor: row.accentColor,
    campaignType: row.campaignType,
    status: row.status,
    itemCount: row.itemCount,
    startDate: row.startDate ? row.startDate.toISOString() : null,
    endDate: row.endDate ? row.endDate.toISOString() : null,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    allowedActions: computeAllowedActions(row.status, userType, isManager),
  };
}

function mapCampaignDetail(
  campaign: NonNullable<Awaited<ReturnType<typeof CampaignManagementRepository.findCampaignById>>>,
  userType: string,
  isManager: boolean,
): CampaignDetailResponseDto {
  const items: CampaignDetailItemDto[] = campaign.items.map((item) => ({
    campaignItemId: item.campaignItemId,
    componentType: item.componentType,
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
    campaignType: campaign.campaignType,
    status: campaign.status,
    startDate: campaign.startDate ? campaign.startDate.toISOString() : null,
    endDate: campaign.endDate ? campaign.endDate.toISOString() : null,
    createdBy: campaign.createdBy,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
    allowedActions: computeAllowedActions(campaign.status, userType, isManager),
    items,
  };
}

function parseAndValidateDates(input: { startDate?: string | null; endDate?: string | null }) {
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

  return { startDate, endDate };
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

  return {
    items: items.map((row) => mapCampaignRow(row, actor.userType, isManager)),
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

  return {
    items: items.map((row) => mapCampaignRow(row, actor.userType, true)),
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

  return mapCampaignDetail(campaign, actor.userType, isManager);
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

  return mapCampaignDetail(campaign, actor.userType, true);
}

export async function createOrganisationCampaignDraft(
  actor: UserActorContext,
  organisationId: string,
  input: CreateCampaignDraftRequestDto,
): Promise<CampaignDetailResponseDto> {
  await validateOrganisationAdminActor(actor, organisationId, 'MANAGE_CAMPAIGNS');

  const { startDate, endDate } = parseAndValidateDates(input);

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

  const { startDate, endDate } = parseAndValidateDates(input);

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

async function performLifecycleTransition(options: {
  actor: UserActorContext;
  organisationId?: string | null;
  campaignId: string;
  expectedCurrentStatus: string;
  targetStatus: 'ACTIVE' | 'ARCHIVED';
  requireNonEmpty?: boolean;
  repoAction: (
    campaignId: string,
    actorUserId?: string,
    orgId?: string | null,
  ) => Promise<{ success: boolean; status?: string; error?: string }>;
  fetchDetail: (
    actor: UserActorContext,
    campaignId: string,
    orgId?: string | null,
  ) => Promise<CampaignDetailResponseDto>;
}): Promise<CampaignLifecycleActionResponseDto> {
  if (options.organisationId) {
    await validateOrganisationAdminActor(options.actor, options.organisationId, 'MANAGE_CAMPAIGNS');
  } else {
    await validatePlatformAdminActor(options.actor);
  }

  const existing = await CampaignManagementRepository.findCampaignById(options.campaignId, {
    organisationId: options.organisationId ?? undefined,
    platformOnly: !options.organisationId,
  });

  if (!existing) {
    throw new CampaignManagementServiceError(404, 'NOT_FOUND', 'Campaign not found');
  }

  if (existing.status !== options.expectedCurrentStatus) {
    throw new CampaignManagementServiceError(
      409,
      'LIFECYCLE_CONFLICT',
      `Cannot transition campaign with status ${existing.status} to ${options.targetStatus}`,
    );
  }

  if (options.requireNonEmpty && existing.items.length === 0) {
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

  await options.repoAction(options.campaignId, options.actor.userId, options.organisationId);

  const updated = await options.fetchDetail(
    options.actor,
    options.campaignId,
    options.organisationId,
  );

  return {
    success: true,
    campaignId: options.campaignId,
    status: options.targetStatus,
    allowedActions: updated.allowedActions,
  };
}

export async function activateOrganisationCampaign(
  actor: UserActorContext,
  organisationId: string,
  campaignId: string,
): Promise<CampaignLifecycleActionResponseDto> {
  return performLifecycleTransition({
    actor,
    organisationId,
    campaignId,
    expectedCurrentStatus: 'DRAFT',
    targetStatus: 'ACTIVE',
    requireNonEmpty: true,
    repoAction: CampaignManagementRepository.activateCampaign,
    fetchDetail: (act, id, orgId) => getOrganisationCampaignDetail(act, orgId!, id),
  });
}

export async function activatePlatformCampaign(
  actor: UserActorContext,
  campaignId: string,
): Promise<CampaignLifecycleActionResponseDto> {
  return performLifecycleTransition({
    actor,
    organisationId: null,
    campaignId,
    expectedCurrentStatus: 'DRAFT',
    targetStatus: 'ACTIVE',
    requireNonEmpty: true,
    repoAction: CampaignManagementRepository.activateCampaign,
    fetchDetail: (act, id) => getPlatformCampaignDetail(act, id),
  });
}

export async function archiveOrganisationCampaign(
  actor: UserActorContext,
  organisationId: string,
  campaignId: string,
): Promise<CampaignLifecycleActionResponseDto> {
  return performLifecycleTransition({
    actor,
    organisationId,
    campaignId,
    expectedCurrentStatus: 'ACTIVE',
    targetStatus: 'ARCHIVED',
    repoAction: CampaignManagementRepository.archiveCampaign,
    fetchDetail: (act, id, orgId) => getOrganisationCampaignDetail(act, orgId!, id),
  });
}

export async function archivePlatformCampaign(
  actor: UserActorContext,
  campaignId: string,
): Promise<CampaignLifecycleActionResponseDto> {
  return performLifecycleTransition({
    actor,
    organisationId: null,
    campaignId,
    expectedCurrentStatus: 'ACTIVE',
    targetStatus: 'ARCHIVED',
    repoAction: CampaignManagementRepository.archiveCampaign,
    fetchDetail: (act, id) => getPlatformCampaignDetail(act, id),
  });
}

export async function reactivateOrganisationCampaign(
  actor: UserActorContext,
  organisationId: string,
  campaignId: string,
): Promise<CampaignLifecycleActionResponseDto> {
  return performLifecycleTransition({
    actor,
    organisationId,
    campaignId,
    expectedCurrentStatus: 'ARCHIVED',
    targetStatus: 'ACTIVE',
    repoAction: CampaignManagementRepository.reactivateCampaign,
    fetchDetail: (act, id, orgId) => getOrganisationCampaignDetail(act, orgId!, id),
  });
}

export async function reactivatePlatformCampaign(
  actor: UserActorContext,
  campaignId: string,
): Promise<CampaignLifecycleActionResponseDto> {
  return performLifecycleTransition({
    actor,
    organisationId: null,
    campaignId,
    expectedCurrentStatus: 'ARCHIVED',
    targetStatus: 'ACTIVE',
    repoAction: CampaignManagementRepository.reactivateCampaign,
    fetchDetail: (act, id) => getPlatformCampaignDetail(act, id),
  });
}

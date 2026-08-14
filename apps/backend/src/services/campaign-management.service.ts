import type {
  CampaignAllowedActionDto,
  CampaignCatalogueQueryDto,
  CampaignDetailResponseDto,
  CampaignLifecycleActionResponseDto,
  CampaignListQueryDto,
  CampaignListRowDto,
  CampaignMutationPreconditionDto,
  CreateCampaignDraftRequestDto,
  GetCampaignCatalogueResponseDto,
  GetCampaignsResponseDto,
  PaginationMetadataDto,
  UpdateCampaignDraftRequestDto,
} from '@insightful-phish/shared';
import {
  campaignDetailResponseSchema,
  campaignLifecycleActionResponseSchema,
  getCampaignCatalogueResponseSchema,
  getCampaignsResponseSchema,
} from '@insightful-phish/shared';

import * as CampaignManagementRepository from '../repositories/campaign-management.repository.js';
import * as OrganisationScopeRepository from '../repositories/organisation-scope.repository.js';

export type UserActorContext = {
  userId: string;
  userType: string;
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
    const hasPermission = adminScope.permissionGrants.some((grant) => {
      const key = grant.organisationPermission.key;
      if (requiredPermissionKey === 'VIEW_CAMPAIGNS') {
        return key === 'VIEW_CAMPAIGNS' || key === 'MANAGE_CAMPAIGNS';
      }
      return key === requiredPermissionKey;
    });

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

function isCampaignActivatable(
  hasItems: boolean,
  sourcesUsable: boolean,
  isExpired: boolean,
): boolean {
  return hasItems && sourcesUsable && !isExpired;
}

function computeAllowedActions(input: {
  status: string;
  canManage: boolean;
  canAssign?: boolean;
  hasItems?: boolean;
  sourcesUsable?: boolean;
  endDate?: Date | null;
  now?: Date;
}): CampaignAllowedActionDto[] {
  const actions: CampaignAllowedActionDto[] = ['VIEW'];
  const now = input.now ?? new Date();
  const isExpired = input.endDate ? input.endDate.getTime() < now.getTime() : false;
  const canActivate = isCampaignActivatable(
    input.hasItems ?? true,
    input.sourcesUsable ?? true,
    isExpired,
  );

  if (input.canManage) {
    if (input.status === 'DRAFT') {
      actions.push('EDIT');
      if (canActivate) actions.push('ACTIVATE');
    } else if (input.status === 'ACTIVE') {
      actions.push('ARCHIVE');
    } else if (input.status === 'ARCHIVED' && canActivate) {
      actions.push('REACTIVATE');
    }
  }

  if (input.canAssign && input.status === 'ACTIVE' && !isExpired) {
    actions.push('ASSIGN');
  }

  return actions;
}

function mapCampaignRow(
  row: Awaited<ReturnType<typeof CampaignManagementRepository.findCampaigns>>['items'][number],
  canManage: boolean,
  canAssign: boolean,
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
    allowedActions: computeAllowedActions({
      status: row.status,
      canManage,
      canAssign,
      hasItems: row.itemCount > 0,
      endDate: row.endDate,
    }),
  };
}

function mapCampaignDetail(
  campaign: NonNullable<Awaited<ReturnType<typeof CampaignManagementRepository.findCampaignById>>>,
  canManage: boolean,
  canAssign: boolean,
): CampaignDetailResponseDto {
  const allSourcesUsable = campaign.items.every((item) => {
    if (item.itemType === 'GROUP') {
      return item.children.every((child) => child.sourceAvailable);
    }
    return item.sourceAvailable;
  });

  return campaignDetailResponseSchema.parse({
    id: campaign.id,
    organisationId: campaign.organisationId,
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
    allowedActions: computeAllowedActions({
      status: campaign.status,
      canManage,
      canAssign,
      hasItems: campaign.items.length > 0,
      sourcesUsable: allSourcesUsable,
      endDate: campaign.endDate,
    }),
    items: campaign.items,
  });
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

  return getCampaignCatalogueResponseSchema.parse({
    items,
    pagination: buildPaginationMetadata(query.page, query.limit, total),
  });
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

  return getCampaignCatalogueResponseSchema.parse({
    items,
    pagination: buildPaginationMetadata(query.page, query.limit, total),
  });
}

export async function getOrganisationCampaigns(
  actor: UserActorContext,
  organisationId: string,
  query: CampaignListQueryDto,
): Promise<GetCampaignsResponseDto> {
  const adminScope = await validateOrganisationAdminActor(actor, organisationId, 'VIEW_CAMPAIGNS');
  const canManage = adminScope.permissionGrants.some(
    (grant) => grant.organisationPermission.key === 'MANAGE_CAMPAIGNS',
  );
  const canAssign = adminScope.permissionGrants.some(
    (grant) => grant.organisationPermission.key === 'ASSIGN_CAMPAIGNS',
  );

  const { items, total } = await CampaignManagementRepository.findCampaigns({
    organisationId,
    page: query.page,
    limit: query.limit,
    search: query.search,
    status: query.status,
  });

  return getCampaignsResponseSchema.parse({
    items: items.map((row) => mapCampaignRow(row, canManage, canAssign)),
    pagination: buildPaginationMetadata(query.page, query.limit, total),
  });
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

  return getCampaignsResponseSchema.parse({
    items: items.map((row) => mapCampaignRow(row, true, false)),
    pagination: buildPaginationMetadata(query.page, query.limit, total),
  });
}

export async function getOrganisationCampaignDetail(
  actor: UserActorContext,
  organisationId: string,
  campaignId: string,
): Promise<CampaignDetailResponseDto> {
  const adminScope = await validateOrganisationAdminActor(actor, organisationId, 'VIEW_CAMPAIGNS');
  const canManage = adminScope.permissionGrants.some(
    (grant) => grant.organisationPermission.key === 'MANAGE_CAMPAIGNS',
  );
  const canAssign = adminScope.permissionGrants.some(
    (grant) => grant.organisationPermission.key === 'ASSIGN_CAMPAIGNS',
  );

  const campaign = await CampaignManagementRepository.findCampaignById(campaignId, {
    organisationId,
  });

  if (!campaign) {
    throw new CampaignManagementServiceError(404, 'NOT_FOUND', 'Campaign not found');
  }

  return mapCampaignDetail(campaign, canManage, canAssign);
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

  return mapCampaignDetail(campaign, true, false);
}

function mapDraftInputItems(
  items: CreateCampaignDraftRequestDto['items'],
): CampaignManagementRepository.RepositoryCampaignItemInput[] {
  return items.map((item) => {
    if (item.itemType === 'GROUP') {
      return {
        itemType: 'GROUP' as const,
        campaignItemId: item.campaignItemId,
        title: item.title,
        description: item.description ?? null,
        groupType: item.groupType,
        completionRule: item.completionRule,
        isRequired: item.isRequired ?? true,
        children: item.children.map((c) => ({
          itemType: 'COMPONENT' as const,
          campaignItemId: c.campaignItemId,
          componentType: c.componentType,
          contentId: c.contentId,
          isRequired: c.isRequired ?? true,
        })),
      };
    }
    return {
      itemType: 'COMPONENT' as const,
      campaignItemId: item.campaignItemId,
      componentType: item.componentType,
      contentId: item.contentId,
      isRequired: item.isRequired ?? true,
    };
  });
}

function handleUpdateDraftError(error?: string): never {
  if (error === 'CAMPAIGN_NOT_FOUND') {
    throw new CampaignManagementServiceError(404, 'NOT_FOUND', 'Campaign not found');
  }
  if (error === 'CAMPAIGN_CHANGED') {
    throw new CampaignManagementServiceError(
      409,
      'CAMPAIGN_CHANGED',
      'Campaign has been modified concurrently',
    );
  }
  if (error === 'CAMPAIGN_IMMUTABLE') {
    throw new CampaignManagementServiceError(
      409,
      'CAMPAIGN_IMMUTABLE',
      'Active or Archived campaigns are immutable and cannot be updated as drafts',
    );
  }
  if (error === 'CAMPAIGN_ITEM_IDENTITY_CHANGED') {
    throw new CampaignManagementServiceError(
      409,
      'CAMPAIGN_ITEM_IDENTITY_CHANGED',
      'Campaign item component type or content cannot be altered',
    );
  }
  throw new CampaignManagementServiceError(400, 'VALIDATION_ERROR', error ?? 'Invalid data');
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
    items: mapDraftInputItems(input.items),
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
    items: mapDraftInputItems(input.items),
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

  const { startDate, endDate } = parseAndValidateDates(input);

  const result = await CampaignManagementRepository.updateCampaignDraft({
    campaignId,
    organisationId,
    expectedUpdatedAt: new Date(input.expectedUpdatedAt),
    name: input.name,
    description: input.description ?? null,
    accentColor: input.accentColor,
    startDate,
    endDate,
    items: mapDraftInputItems(input.items),
  });

  if (!result.success) {
    handleUpdateDraftError(result.error);
  }

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

  const result = await CampaignManagementRepository.updateCampaignDraft({
    campaignId,
    organisationId: null,
    expectedUpdatedAt: new Date(input.expectedUpdatedAt),
    name: input.name,
    description: input.description ?? null,
    accentColor: input.accentColor,
    startDate: null,
    endDate: null,
    items: mapDraftInputItems(input.items),
  });

  if (!result.success) {
    handleUpdateDraftError(result.error);
  }

  return getPlatformCampaignDetail(actor, campaignId);
}

async function performLifecycleTransition(options: {
  actor: UserActorContext;
  organisationId?: string | null;
  campaignId: string;
  precondition?: CampaignMutationPreconditionDto;
  targetStatus: 'ACTIVE' | 'ARCHIVED';
  repoAction: (
    campaignId: string,
    actorUserId?: string,
    orgId?: string | null,
    expectedUpdatedAt?: Date,
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

  const expectedUpdatedAt = options.precondition?.expectedUpdatedAt
    ? new Date(options.precondition.expectedUpdatedAt)
    : undefined;

  const result = await options.repoAction(
    options.campaignId,
    options.actor.userId,
    options.organisationId,
    expectedUpdatedAt,
  );

  if (!result.success) {
    if (result.error === 'CAMPAIGN_NOT_FOUND') {
      throw new CampaignManagementServiceError(404, 'NOT_FOUND', 'Campaign not found');
    }
    if (result.error === 'CAMPAIGN_CHANGED') {
      throw new CampaignManagementServiceError(
        409,
        'CAMPAIGN_CHANGED',
        'Campaign has been modified concurrently',
      );
    }
    if (result.error === 'CAMPAIGN_LIFECYCLE_CONFLICT') {
      throw new CampaignManagementServiceError(
        409,
        'LIFECYCLE_CONFLICT',
        `Cannot transition campaign to ${options.targetStatus}`,
      );
    }
    if (result.error === 'EMPTY_CAMPAIGN') {
      throw new CampaignManagementServiceError(
        409,
        'EMPTY_CAMPAIGN',
        'Campaign must contain at least one item before activation',
      );
    }
    if (result.error === 'INVALID_CONTENT_STATUS') {
      throw new CampaignManagementServiceError(
        409,
        'UNAVAILABLE_CONTENT',
        'Campaign contains unavailable or unapproved component content',
      );
    }
    throw new CampaignManagementServiceError(
      400,
      'VALIDATION_ERROR',
      result.error ?? 'Lifecycle transition failed',
    );
  }

  const updated = await options.fetchDetail(
    options.actor,
    options.campaignId,
    options.organisationId,
  );

  return campaignLifecycleActionResponseSchema.parse({
    success: true,
    campaignId: options.campaignId,
    status: options.targetStatus,
    allowedActions: updated.allowedActions,
  });
}

export async function activateOrganisationCampaign(
  actor: UserActorContext,
  organisationId: string,
  campaignId: string,
  precondition?: CampaignMutationPreconditionDto,
): Promise<CampaignLifecycleActionResponseDto> {
  return performLifecycleTransition({
    actor,
    organisationId,
    campaignId,
    precondition,
    targetStatus: 'ACTIVE',
    repoAction: CampaignManagementRepository.activateCampaign,
    fetchDetail: (act, id, orgId) => getOrganisationCampaignDetail(act, orgId!, id),
  });
}

export async function activatePlatformCampaign(
  actor: UserActorContext,
  campaignId: string,
  precondition?: CampaignMutationPreconditionDto,
): Promise<CampaignLifecycleActionResponseDto> {
  return performLifecycleTransition({
    actor,
    organisationId: null,
    campaignId,
    precondition,
    targetStatus: 'ACTIVE',
    repoAction: CampaignManagementRepository.activateCampaign,
    fetchDetail: (act, id) => getPlatformCampaignDetail(act, id),
  });
}

export async function archiveOrganisationCampaign(
  actor: UserActorContext,
  organisationId: string,
  campaignId: string,
  precondition?: CampaignMutationPreconditionDto,
): Promise<CampaignLifecycleActionResponseDto> {
  return performLifecycleTransition({
    actor,
    organisationId,
    campaignId,
    precondition,
    targetStatus: 'ARCHIVED',
    repoAction: CampaignManagementRepository.archiveCampaign,
    fetchDetail: (act, id, orgId) => getOrganisationCampaignDetail(act, orgId!, id),
  });
}

export async function archivePlatformCampaign(
  actor: UserActorContext,
  campaignId: string,
  precondition?: CampaignMutationPreconditionDto,
): Promise<CampaignLifecycleActionResponseDto> {
  return performLifecycleTransition({
    actor,
    organisationId: null,
    campaignId,
    precondition,
    targetStatus: 'ARCHIVED',
    repoAction: CampaignManagementRepository.archiveCampaign,
    fetchDetail: (act, id) => getPlatformCampaignDetail(act, id),
  });
}

export async function reactivateOrganisationCampaign(
  actor: UserActorContext,
  organisationId: string,
  campaignId: string,
  precondition?: CampaignMutationPreconditionDto,
): Promise<CampaignLifecycleActionResponseDto> {
  return performLifecycleTransition({
    actor,
    organisationId,
    campaignId,
    precondition,
    targetStatus: 'ACTIVE',
    repoAction: CampaignManagementRepository.reactivateCampaign,
    fetchDetail: (act, id, orgId) => getOrganisationCampaignDetail(act, orgId!, id),
  });
}

export async function reactivatePlatformCampaign(
  actor: UserActorContext,
  campaignId: string,
  precondition?: CampaignMutationPreconditionDto,
): Promise<CampaignLifecycleActionResponseDto> {
  return performLifecycleTransition({
    actor,
    organisationId: null,
    campaignId,
    precondition,
    targetStatus: 'ACTIVE',
    repoAction: CampaignManagementRepository.reactivateCampaign,
    fetchDetail: (act, id) => getPlatformCampaignDetail(act, id),
  });
}

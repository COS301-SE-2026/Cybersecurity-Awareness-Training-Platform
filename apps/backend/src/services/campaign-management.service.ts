import type {
  CampaignAllowedActionDto,
  CampaignCatalogueQueryDto,
  CampaignDetailResponseDto,
  CampaignLifecycleActionResponseDto,
  CampaignListQueryDto,
  CampaignListRowDto,
  CampaignMutationPreconditionDto,
  CampaignPortalReportingFact,
  CampaignStatisticsAdaptiveDto,
  CampaignStatisticsPortalDto,
  CampaignStatisticsRealEmailDto,
  CampaignStatisticsQueryDto,
  CampaignStatisticsTraineeRowDto,
  CreateCampaignDraftRequestDto,
  GetCampaignCatalogueResponseDto,
  GetCampaignsResponseDto,
  GetCampaignStatisticsResponseDto,
  PaginationMetadataDto,
  ParsedCampaignDraftRequestDto,
  PortalDeliveryChannel,
  PortalInsightSummary,
  TraineePortalInsight,
  UpdateCampaignDraftRequestDto,
} from '@insightful-phish/shared';
import {
  calculateCampaignAverageQuizScore,
  calculateCampaignOverallProgress,
  calculateItemProgressPercentage,
  calculateTraineeAverageQuizScore,
  campaignDetailResponseSchema,
  campaignDraftItemSchema,
  campaignLifecycleActionResponseSchema,
  getCampaignCatalogueResponseSchema,
  getCampaignsResponseSchema,
  getCampaignStatisticsResponseSchema,
  roundPercentageToInteger,
} from '@insightful-phish/shared';

import * as CampaignManagementRepository from '../repositories/campaign-management.repository.js';
import * as CampaignStatisticsRepository from '../repositories/campaign-statistics.repository.js';
import * as OrganisationScopeRepository from '../repositories/organisation-scope.repository.js';
import * as PhishingSimulationRepository from '../repositories/phishing-simulation.repository.js';
import { getCampaignPortalReportingFacts } from './phishing-portal.service.js';
import { calculatedEffectiveQuizScore } from './quiz-score-policy.js';

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

export async function requireOrganisationCampaignManagementAccess(
  actor: UserActorContext,
  organisationId: string,
): Promise<void> {
  await validateOrganisationAdminActor(actor, organisationId, 'MANAGE_CAMPAIGNS');
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
  canAssign: boolean;
  hasItems: boolean;
  sourcesUsable: boolean;
  endDate: Date | null;
  now: Date;
}): CampaignAllowedActionDto[] {
  const actions: CampaignAllowedActionDto[] = ['VIEW'];
  const isExpired = input.endDate ? input.endDate.getTime() <= input.now.getTime() : false;
  const canActivate = isCampaignActivatable(input.hasItems, input.sourcesUsable, isExpired);

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

function areCampaignSourcesUsable(
  items: Array<{
    itemType: string;
    componentType?: string | null;
    trainingDocument?: { organisationId: string | null; status: string } | null;
    quiz?: { organisationId: string | null; status: string } | null;
    simulation?: {
      organisationId: string | null;
      safetyStatus: string;
      simulatedInbox?: { status: string } | null;
    } | null;
    sourceAvailable?: boolean;
    children?: Array<{ sourceAvailable?: boolean }>;
  }>,
  campaignOrganisationId: string | null,
): boolean {
  const isVisible = (contentOrganisationId: string | null) =>
    contentOrganisationId === null || contentOrganisationId === campaignOrganisationId;

  return items.every((item) => {
    if (item.itemType === 'GROUP') {
      if (item.children) {
        return item.children.every((child) => Boolean(child.sourceAvailable));
      }
      return true;
    }
    if (typeof item.sourceAvailable === 'boolean') {
      return item.sourceAvailable;
    }
    switch (item.componentType) {
      case 'TRAINING_DOCUMENT':
        return Boolean(
          item.trainingDocument &&
          isVisible(item.trainingDocument.organisationId) &&
          item.trainingDocument.status === 'AVAILABLE',
        );
      case 'QUIZ':
        return Boolean(
          item.quiz && isVisible(item.quiz.organisationId) && item.quiz.status === 'PUBLISHED',
        );
      case 'SIMULATED_INBOX': {
        if (!item.simulation) {
          return false;
        }
        return (
          isVisible(item.simulation.organisationId) &&
          item.simulation.safetyStatus === 'APPROVED' &&
          item.simulation.simulatedInbox?.status === 'ACTIVE'
        );
      }
      default:
        return false;
    }
  });
}

function mapCampaignRow(
  row: Awaited<ReturnType<typeof CampaignManagementRepository.findCampaigns>>['items'][number],
  canManage: boolean,
  canAssign: boolean,
  now: Date,
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
      sourcesUsable: areCampaignSourcesUsable(row.sourceFacts, row.organisationId),
      endDate: row.endDate,
      now,
    }),
  };
}

function mapCampaignDetail(
  campaign: NonNullable<Awaited<ReturnType<typeof CampaignManagementRepository.findCampaignById>>>,
  canManage: boolean,
  canAssign: boolean,
  now: Date,
): CampaignDetailResponseDto {
  const allSourcesUsable = areCampaignSourcesUsable(campaign.items, campaign.organisationId);

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
      now,
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
    category: query.category,
    organisationId,
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
    category: query.category,
    organisationId: null,
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
  const now = new Date();

  const { items, total } = await CampaignManagementRepository.findCampaigns({
    organisationId,
    page: query.page,
    limit: query.limit,
    search: query.search,
    status: query.status,
  });

  return getCampaignsResponseSchema.parse({
    items: items.map((row) => mapCampaignRow(row, canManage, canAssign, now)),
    pagination: buildPaginationMetadata(query.page, query.limit, total),
  });
}

export async function getPlatformCampaigns(
  actor: UserActorContext,
  query: CampaignListQueryDto,
): Promise<GetCampaignsResponseDto> {
  await validatePlatformAdminActor(actor);
  const now = new Date();

  const { items, total } = await CampaignManagementRepository.findCampaigns({
    platformOnly: true,
    page: query.page,
    limit: query.limit,
    search: query.search,
    status: query.status,
  });

  return getCampaignsResponseSchema.parse({
    items: items.map((row) => mapCampaignRow(row, true, false, now)),
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
  const now = new Date();

  const campaign = await CampaignManagementRepository.findCampaignById(campaignId, {
    organisationId,
  });

  if (!campaign) {
    throw new CampaignManagementServiceError(404, 'NOT_FOUND', 'Campaign not found');
  }

  return mapCampaignDetail(campaign, canManage, canAssign, now);
}

export async function getPlatformCampaignDetail(
  actor: UserActorContext,
  campaignId: string,
): Promise<CampaignDetailResponseDto> {
  await validatePlatformAdminActor(actor);
  const now = new Date();

  const campaign = await CampaignManagementRepository.findCampaignById(campaignId, {
    platformOnly: true,
  });

  if (!campaign) {
    throw new CampaignManagementServiceError(404, 'NOT_FOUND', 'Platform campaign not found');
  }

  return mapCampaignDetail(campaign, true, false, now);
}

function validateDraftStructure(items: CreateCampaignDraftRequestDto['items']): void {
  const seenItemIds = new Set<string>();
  const seenSources = new Set<string>();

  const validateComponent = (item: {
    campaignItemId?: string;
    componentType: string;
    contentId: string;
  }) => {
    if (item.campaignItemId) {
      if (seenItemIds.has(item.campaignItemId)) {
        throw new CampaignManagementServiceError(
          422,
          'DUPLICATE_CAMPAIGN_ITEM_ID',
          'The same Campaign Item ID cannot appear more than once.',
        );
      }
      seenItemIds.add(item.campaignItemId);
    }

    const sourceKey = `${item.componentType}:${item.contentId}`;
    if (seenSources.has(sourceKey)) {
      throw new CampaignManagementServiceError(
        422,
        'DUPLICATE_CAMPAIGN_CONTENT',
        'The same reusable content cannot appear more than once in a Campaign.',
      );
    }
    seenSources.add(sourceKey);
  };

  const validateAdaptive = (item: Extract<(typeof items)[number], { itemType: 'ADAPTIVE' }>) => {
    if (item.campaignItemId) {
      if (seenItemIds.has(item.campaignItemId)) {
        throw new CampaignManagementServiceError(
          422,
          'DUPLICATE_CAMPAIGN_ITEM_ID',
          'The same Campaign Item ID cannot appear more than once.',
        );
      }
      seenItemIds.add(item.campaignItemId);
    }
    for (const alternative of Object.values(item.alternatives)) {
      const sourceKey = `${item.componentType}:${alternative.contentId}`;
      if (seenSources.has(sourceKey)) {
        throw new CampaignManagementServiceError(
          422,
          'DUPLICATE_CAMPAIGN_CONTENT',
          'The same reusable content cannot appear more than once in a Campaign.',
        );
      }
      seenSources.add(sourceKey);
    }
  };

  for (const item of items) {
    if (item.itemType === 'GROUP' && item.campaignItemId) {
      if (seenItemIds.has(item.campaignItemId)) {
        throw new CampaignManagementServiceError(
          422,
          'DUPLICATE_CAMPAIGN_ITEM_ID',
          'The same Campaign Item ID cannot appear more than once.',
        );
      }
      seenItemIds.add(item.campaignItemId);
    }

    if (item.itemType === 'GROUP') {
      if (item.children.length < 2) {
        throw new CampaignManagementServiceError(
          422,
          'GROUP_MIN_CHILDREN_REQUIRED',
          'A Campaign Group must contain at least two Campaign Items.',
        );
      }

      for (const child of item.children) {
        if (child.itemType === 'ADAPTIVE') {
          validateAdaptive(child);
        } else {
          validateComponent(child);
        }
      }
      continue;
    }

    if (item.itemType === 'ADAPTIVE') {
      validateAdaptive(item);
    } else {
      validateComponent(item);
    }
  }
}

type ParsedDraftComponent = Extract<
  ParsedCampaignDraftRequestDto['items'][number],
  { itemType: 'COMPONENT' }
>;
type ParsedDraftAdaptive = Extract<
  ParsedCampaignDraftRequestDto['items'][number],
  { itemType: 'ADAPTIVE' }
>;

function mapDraftComponent(
  item: ParsedDraftComponent,
): CampaignManagementRepository.RepositoryCampaignComponentInput {
  const common = {
    itemType: 'COMPONENT' as const,
    campaignItemId: item.campaignItemId,
    contentId: item.contentId,
    isRequired: item.isRequired,
  };

  if (item.componentType === 'QUIZ') {
    return {
      ...common,
      componentType: 'QUIZ',
      maxAttempts: item.maxAttempts,
      scorePolicy: item.scorePolicy,
    };
  }

  return { ...common, componentType: item.componentType };
}

function mapDraftAdaptive(
  item: ParsedDraftAdaptive,
): CampaignManagementRepository.RepositoryCampaignAdaptiveInput {
  const common = {
    itemType: 'ADAPTIVE' as const,
    campaignItemId: item.campaignItemId,
    alternatives: item.alternatives,
    isRequired: item.isRequired,
  };
  return item.componentType === 'QUIZ'
    ? {
        ...common,
        componentType: 'QUIZ',
        maxAttempts: item.maxAttempts,
        scorePolicy: item.scorePolicy,
      }
    : { ...common, componentType: item.componentType };
}

function mapDraftConsumable(
  item: ParsedDraftComponent | ParsedDraftAdaptive,
):
  | CampaignManagementRepository.RepositoryCampaignComponentInput
  | CampaignManagementRepository.RepositoryCampaignAdaptiveInput {
  return item.itemType === 'ADAPTIVE' ? mapDraftAdaptive(item) : mapDraftComponent(item);
}

function mapDraftInputItems(
  items: CreateCampaignDraftRequestDto['items'],
): CampaignManagementRepository.RepositoryCampaignItemInput[] {
  const parsedItems: ParsedCampaignDraftRequestDto['items'] = items.map((item) =>
    campaignDraftItemSchema.parse(item),
  );

  return parsedItems.map((item) => {
    if (item.itemType === 'GROUP') {
      return {
        itemType: 'GROUP' as const,
        campaignItemId: item.campaignItemId,
        title: item.title,
        description: item.description ?? null,
        groupType: item.groupType,
        completionRule: item.completionRule,
        isRequired: item.isRequired ?? true,
        children: item.children.map(mapDraftConsumable),
      };
    }
    return mapDraftConsumable(item);
  });
}

function handleCampaignRepositoryFailure(
  result: CampaignManagementRepository.CampaignRepositoryFailure,
): never {
  switch (result.error) {
    case 'CAMPAIGN_NOT_FOUND':
      throw new CampaignManagementServiceError(404, 'NOT_FOUND', 'Campaign not found.');
    case 'CAMPAIGN_CHANGED':
      throw new CampaignManagementServiceError(
        409,
        'CAMPAIGN_CHANGED',
        'The Campaign was changed by another administrator. Reload before retrying.',
      );
    case 'CAMPAIGN_IMMUTABLE':
      throw new CampaignManagementServiceError(
        409,
        'CAMPAIGN_IMMUTABLE',
        'Active and Archived Campaign structure cannot be edited.',
      );
    case 'CAMPAIGN_LIFECYCLE_CONFLICT':
      throw new CampaignManagementServiceError(
        409,
        'LIFECYCLE_CONFLICT',
        'The Campaign is no longer in the required lifecycle state.',
      );
    case 'CAMPAIGN_ITEM_IDENTITY_CHANGED':
      throw new CampaignManagementServiceError(
        409,
        'CAMPAIGN_ITEM_IDENTITY_CHANGED',
        'An existing Campaign Item cannot be reassigned to different reusable content.',
      );
    case 'INVALID_CAMPAIGN_ITEM_ID':
      throw new CampaignManagementServiceError(
        422,
        'INVALID_CAMPAIGN_ITEM_ID',
        'One or more Campaign Item IDs do not belong to this Campaign.',
      );
    case 'UNAVAILABLE_CONTENT':
      throw new CampaignManagementServiceError(
        409,
        'UNAVAILABLE_CAMPAIGN_CONTENT',
        'One or more reusable content items are no longer available.',
        result.contentType ? { componentType: result.contentType } : undefined,
      );
    case 'EMPTY_CAMPAIGN':
      throw new CampaignManagementServiceError(
        409,
        'EMPTY_CAMPAIGN',
        'A Campaign must contain at least one item before activation.',
      );
    default:
      throw new CampaignManagementServiceError(400, 'VALIDATION_ERROR', 'Operation failed.');
  }
}

export async function createOrganisationCampaignDraft(
  actor: UserActorContext,
  organisationId: string,
  input: CreateCampaignDraftRequestDto,
): Promise<CampaignDetailResponseDto> {
  await validateOrganisationAdminActor(actor, organisationId, 'MANAGE_CAMPAIGNS');
  validateDraftStructure(input.items);

  const { startDate, endDate } = parseAndValidateDates(input);

  const result = await CampaignManagementRepository.createCampaignDraft({
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

  if (!result.success) {
    handleCampaignRepositoryFailure(result);
  }

  return getOrganisationCampaignDetail(actor, organisationId, result.campaignId);
}

export async function createPlatformCampaignDraft(
  actor: UserActorContext,
  input: CreateCampaignDraftRequestDto,
): Promise<CampaignDetailResponseDto> {
  await validatePlatformAdminActor(actor);
  validateDraftStructure(input.items);

  if (input.startDate || input.endDate) {
    throw new CampaignManagementServiceError(
      400,
      'VALIDATION_ERROR',
      'Platform campaigns cannot have dates',
    );
  }

  const result = await CampaignManagementRepository.createCampaignDraft({
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

  if (!result.success) {
    handleCampaignRepositoryFailure(result);
  }

  return getPlatformCampaignDetail(actor, result.campaignId);
}

export async function copyOrganisationCampaignToDraft(
  actor: UserActorContext,
  organisationId: string,
  campaignId: string,
): Promise<CampaignDetailResponseDto> {
  await validateOrganisationAdminActor(actor, organisationId, 'MANAGE_CAMPAIGNS');

  const result = await CampaignManagementRepository.copyActiveCampaignToDraft({
    campaignId,
    organisationId,
    createdByUserId: actor.userId,
  });

  if (!result.success) {
    handleCampaignRepositoryFailure(result);
  }

  return getOrganisationCampaignDetail(actor, organisationId, result.campaignId);
}

export async function copyPlatformCampaignToDraft(
  actor: UserActorContext,
  campaignId: string,
): Promise<CampaignDetailResponseDto> {
  await validatePlatformAdminActor(actor);

  const result = await CampaignManagementRepository.copyActiveCampaignToDraft({
    campaignId,
    organisationId: null,
    createdByUserId: actor.userId,
  });

  if (!result.success) {
    handleCampaignRepositoryFailure(result);
  }

  return getPlatformCampaignDetail(actor, result.campaignId);
}

export async function updateOrganisationCampaignDraft(
  actor: UserActorContext,
  organisationId: string,
  campaignId: string,
  input: UpdateCampaignDraftRequestDto,
): Promise<CampaignDetailResponseDto> {
  await validateOrganisationAdminActor(actor, organisationId, 'MANAGE_CAMPAIGNS');
  validateDraftStructure(input.items);

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
    handleCampaignRepositoryFailure(result);
  }

  return getOrganisationCampaignDetail(actor, organisationId, campaignId);
}

export async function updatePlatformCampaignDraft(
  actor: UserActorContext,
  campaignId: string,
  input: UpdateCampaignDraftRequestDto,
): Promise<CampaignDetailResponseDto> {
  await validatePlatformAdminActor(actor);
  validateDraftStructure(input.items);

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
    handleCampaignRepositoryFailure(result);
  }

  return getPlatformCampaignDetail(actor, campaignId);
}

async function performLifecycleTransition(options: {
  actor: UserActorContext;
  organisationId: string | null;
  campaignId: string;
  precondition: CampaignMutationPreconditionDto;
  expectedStatus: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  targetStatus: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  requirements: {
    requireItems: boolean;
    requireAvailableSources: boolean;
  };
  fetchDetail: (
    actor: UserActorContext,
    campaignId: string,
    orgId: string | null,
  ) => Promise<CampaignDetailResponseDto>;
}): Promise<CampaignLifecycleActionResponseDto> {
  if (options.organisationId !== null) {
    await validateOrganisationAdminActor(options.actor, options.organisationId, 'MANAGE_CAMPAIGNS');
  } else {
    await validatePlatformAdminActor(options.actor);
  }

  const result = await CampaignManagementRepository.transitionCampaign({
    campaignId: options.campaignId,
    organisationId: options.organisationId,
    expectedStatus: options.expectedStatus,
    targetStatus: options.targetStatus,
    expectedUpdatedAt: new Date(options.precondition.expectedUpdatedAt),
    requirements: options.requirements,
  });

  if (!result.success) {
    handleCampaignRepositoryFailure(result);
  }

  const updated = await options.fetchDetail(
    options.actor,
    options.campaignId,
    options.organisationId,
  );

  return campaignLifecycleActionResponseSchema.parse({
    success: true,
    campaignId: result.campaignId,
    status: result.status,
    updatedAt: result.updatedAt.toISOString(),
    allowedActions: updated.allowedActions,
  });
}

export async function activateOrganisationCampaign(
  actor: UserActorContext,
  organisationId: string,
  campaignId: string,
  precondition: CampaignMutationPreconditionDto,
): Promise<CampaignLifecycleActionResponseDto> {
  return performLifecycleTransition({
    actor,
    organisationId,
    campaignId,
    precondition,
    expectedStatus: 'DRAFT',
    targetStatus: 'ACTIVE',
    requirements: {
      requireItems: true,
      requireAvailableSources: true,
    },
    fetchDetail: (act, id, orgId) => getOrganisationCampaignDetail(act, orgId!, id),
  });
}

export async function activatePlatformCampaign(
  actor: UserActorContext,
  campaignId: string,
  precondition: CampaignMutationPreconditionDto,
): Promise<CampaignLifecycleActionResponseDto> {
  return performLifecycleTransition({
    actor,
    organisationId: null,
    campaignId,
    precondition,
    expectedStatus: 'DRAFT',
    targetStatus: 'ACTIVE',
    requirements: {
      requireItems: true,
      requireAvailableSources: true,
    },
    fetchDetail: (act, id) => getPlatformCampaignDetail(act, id),
  });
}

export async function archiveOrganisationCampaign(
  actor: UserActorContext,
  organisationId: string,
  campaignId: string,
  precondition: CampaignMutationPreconditionDto,
): Promise<CampaignLifecycleActionResponseDto> {
  return performLifecycleTransition({
    actor,
    organisationId,
    campaignId,
    precondition,
    expectedStatus: 'ACTIVE',
    targetStatus: 'ARCHIVED',
    requirements: {
      requireItems: false,
      requireAvailableSources: false,
    },
    fetchDetail: (act, id, orgId) => getOrganisationCampaignDetail(act, orgId!, id),
  });
}

export async function archivePlatformCampaign(
  actor: UserActorContext,
  campaignId: string,
  precondition: CampaignMutationPreconditionDto,
): Promise<CampaignLifecycleActionResponseDto> {
  return performLifecycleTransition({
    actor,
    organisationId: null,
    campaignId,
    precondition,
    expectedStatus: 'ACTIVE',
    targetStatus: 'ARCHIVED',
    requirements: {
      requireItems: false,
      requireAvailableSources: false,
    },
    fetchDetail: (act, id) => getPlatformCampaignDetail(act, id),
  });
}

export async function reactivateOrganisationCampaign(
  actor: UserActorContext,
  organisationId: string,
  campaignId: string,
  precondition: CampaignMutationPreconditionDto,
): Promise<CampaignLifecycleActionResponseDto> {
  return performLifecycleTransition({
    actor,
    organisationId,
    campaignId,
    precondition,
    expectedStatus: 'ARCHIVED',
    targetStatus: 'ACTIVE',
    requirements: {
      requireItems: false,
      requireAvailableSources: true,
    },
    fetchDetail: (act, id, orgId) => getOrganisationCampaignDetail(act, orgId!, id),
  });
}

export async function reactivatePlatformCampaign(
  actor: UserActorContext,
  campaignId: string,
  precondition: CampaignMutationPreconditionDto,
): Promise<CampaignLifecycleActionResponseDto> {
  return performLifecycleTransition({
    actor,
    organisationId: null,
    campaignId,
    precondition,
    expectedStatus: 'ARCHIVED',
    targetStatus: 'ACTIVE',
    requirements: {
      requireItems: false,
      requireAvailableSources: true,
    },
    fetchDetail: (act, id) => getPlatformCampaignDetail(act, id),
  });
}

function buildAdaptiveStatistics(
  facts: readonly CampaignStatisticsRepository.CampaignAdaptiveResolutionFact[],
): CampaignStatisticsAdaptiveDto | undefined {
  if (facts.length === 0) {
    return undefined;
  }

  const byDifficulty = {
    EASY: 0,
    MEDIUM: 0,
    HARD: 0,
  };
  let insufficientEvidenceResolutionCount = 0;

  for (const fact of facts) {
    byDifficulty[fact.selectedDifficulty] += 1;
    if (fact.evidenceStatus === 'INSUFFICIENT') {
      insufficientEvidenceResolutionCount += 1;
    }
  }

  return {
    resolvedSlotCount: facts.length,
    byDifficulty,
    insufficientEvidenceResolutionCount,
  };
}

function buildRealEmailStatistics(
  facts: readonly PhishingSimulationRepository.CampaignPhishingSimulationFact[],
): CampaignStatisticsRealEmailDto | undefined {
  if (facts.length === 0) {
    return undefined;
  }

  return {
    simulations: facts.map((simulation) => {
      let providerAcceptedCount = 0;
      let failedMessageCount = 0;
      let cancelledMessageCount = 0;
      let linkEventCount = 0;
      const clickedRecipientIds = new Set<string>();

      for (const message of simulation.messages) {
        if (message.dispatchStatus === 'SUBMITTED') {
          providerAcceptedCount += 1;
        } else if (message.dispatchStatus === 'FAILED') {
          failedMessageCount += 1;
        } else if (message.dispatchStatus === 'CANCELLED') {
          cancelledMessageCount += 1;
        }

        linkEventCount += message._count.trackingEvents;
        if (message._count.trackingEvents > 0) {
          clickedRecipientIds.add(message.recipientId);
        }
      }

      return {
        phishingSimulationId: simulation.id,
        status: simulation.status,
        plannedMessageCount: simulation.messages.length,
        providerAcceptedCount,
        failedMessageCount,
        cancelledMessageCount,
        linkEventCount,
        uniqueRecipientClickCount: clickedRecipientIds.size,
      };
    }),
  };
}

function createEmptyPortalSummary(): PortalInsightSummary {
  return {
    managedLinkRequestCount: 0,
    distinctTraineeLinkRequestCount: 0,
    portalVisitCount: 0,
    distinctPortalVisitorCount: 0,
    identifierFieldInteractionCount: 0,
    credentialFieldInteractionCount: 0,
    credentialSubmissionAttemptCount: 0,
    distinctCredentialAttemptTraineeCount: 0,
    repeatCredentialAttemptCount: 0,
    educationalRevealViewCount: 0,
    distinctRevealTraineeCount: 0,
  };
}

function summarizePortalFacts(facts: readonly CampaignPortalReportingFact[]): PortalInsightSummary {
  const summary = createEmptyPortalSummary();
  const linkRequestTraineeIds = new Set<string>();
  const portalVisitorIds = new Set<string>();
  const credentialAttemptTraineeIds = new Set<string>();
  const revealTraineeIds = new Set<string>();
  const credentialAttemptCountByLinkId = new Map<string, number>();

  for (const fact of facts) {
    switch (fact.eventType) {
      case 'MANAGED_LINK_REQUESTED':
        summary.managedLinkRequestCount += 1;
        linkRequestTraineeIds.add(fact.traineeProfileId);
        break;
      case 'PORTAL_VISITED':
        summary.portalVisitCount += 1;
        portalVisitorIds.add(fact.traineeProfileId);
        break;
      case 'PORTAL_IDENTIFIER_FIELD_INTERACTED':
        summary.identifierFieldInteractionCount += 1;
        break;
      case 'PORTAL_CREDENTIAL_FIELD_INTERACTED':
        summary.credentialFieldInteractionCount += 1;
        break;
      case 'CREDENTIAL_SUBMISSION_ATTEMPTED':
        summary.credentialSubmissionAttemptCount += 1;
        credentialAttemptTraineeIds.add(fact.traineeProfileId);
        credentialAttemptCountByLinkId.set(
          fact.managedPortalLinkId,
          (credentialAttemptCountByLinkId.get(fact.managedPortalLinkId) ?? 0) + 1,
        );
        break;
      case 'PORTAL_EDUCATIONAL_REVEAL_VIEWED':
        summary.educationalRevealViewCount += 1;
        revealTraineeIds.add(fact.traineeProfileId);
        break;
    }
  }

  summary.distinctTraineeLinkRequestCount = linkRequestTraineeIds.size;
  summary.distinctPortalVisitorCount = portalVisitorIds.size;
  summary.distinctCredentialAttemptTraineeCount = credentialAttemptTraineeIds.size;
  summary.distinctRevealTraineeCount = revealTraineeIds.size;

  for (const attemptCount of credentialAttemptCountByLinkId.values()) {
    summary.repeatCredentialAttemptCount += Math.max(0, attemptCount - 1);
  }

  return summary;
}

function buildTraineePortalInsight(
  facts: readonly CampaignPortalReportingFact[],
): TraineePortalInsight {
  const summary = summarizePortalFacts(facts);

  return {
    managedLinkRequested: summary.managedLinkRequestCount > 0,
    portalVisited: summary.portalVisitCount > 0,
    identifierFieldInteracted: summary.identifierFieldInteractionCount > 0,
    credentialFieldInteracted: summary.credentialFieldInteractionCount > 0,
    credentialSubmissionAttemptCount: summary.credentialSubmissionAttemptCount,
    repeatCredentialAttemptCount: summary.repeatCredentialAttemptCount,
    educationalRevealViewed: summary.educationalRevealViewCount > 0,
  };
}

type PortalStatisticsResult = {
  portal: CampaignStatisticsPortalDto | undefined;
  traineeInsightsByTraineeProfileId: Map<string, TraineePortalInsight>;
};

function buildPortalStatistics(
  facts: readonly CampaignPortalReportingFact[],
): PortalStatisticsResult {
  const traineeFactsByTraineeProfileId = new Map<string, CampaignPortalReportingFact[]>();

  if (facts.length === 0) {
    return {
      portal: undefined,
      traineeInsightsByTraineeProfileId: new Map(),
    };
  }

  const channelFactsByChannel = new Map<PortalDeliveryChannel, CampaignPortalReportingFact[]>();

  for (const fact of facts) {
    const traineeFacts = traineeFactsByTraineeProfileId.get(fact.traineeProfileId) ?? [];
    traineeFacts.push(fact);
    traineeFactsByTraineeProfileId.set(fact.traineeProfileId, traineeFacts);

    const channelFacts = channelFactsByChannel.get(fact.context.channel) ?? [];
    channelFacts.push(fact);
    channelFactsByChannel.set(fact.context.channel, channelFacts);
  }

  const traineeInsightsByTraineeProfileId = new Map<string, TraineePortalInsight>();
  for (const [traineeProfileId, traineeFacts] of traineeFactsByTraineeProfileId) {
    traineeInsightsByTraineeProfileId.set(
      traineeProfileId,
      buildTraineePortalInsight(traineeFacts),
    );
  }

  return {
    portal: {
      summary: summarizePortalFacts(facts),
      channels: Array.from(channelFactsByChannel, ([channel, channelFacts]) => ({
        channel,
        summary: summarizePortalFacts(channelFacts),
      })),
    },
    traineeInsightsByTraineeProfileId,
  };
}

export async function getOrganisationCampaignStatistics(
  actor: UserActorContext,
  organisationId: string,
  campaignId: string,
  query: CampaignStatisticsQueryDto,
): Promise<GetCampaignStatisticsResponseDto> {
  const adminScope = await validateOrganisationAdminActor(actor, organisationId, 'VIEW_CAMPAIGNS');

  const hasAssignPermission = adminScope.permissionGrants.some(
    (grant) => grant.organisationPermission.key === 'ASSIGN_CAMPAIGNS',
  );

  const campaign = await CampaignStatisticsRepository.findCampaignWithItems(
    organisationId,
    campaignId,
  );

  if (!campaign) {
    throw new CampaignManagementServiceError(
      404,
      'CAMPAIGN_NOT_FOUND',
      'Campaign was not found in this organisation',
    );
  }

  const portalFactsPromise =
    campaign.campaignType === 'ORGANISATION_CUSTOM'
      ? getCampaignPortalReportingFacts(actor, organisationId, campaignId)
      : Promise.resolve<CampaignPortalReportingFact[]>([]);

  // Service defines consumable item reporting policy: only COMPONENT items with valid component types
  // count toward progress and quiz totals. Structural GROUP items are excluded.
  const consumableItems = campaign.items.filter(
    (
      item,
    ): item is typeof item & {
      componentType: 'TRAINING_DOCUMENT' | 'QUIZ' | 'SIMULATED_INBOX';
    } =>
      item.itemType === 'COMPONENT' &&
      (item.componentType === 'TRAINING_DOCUMENT' ||
        item.componentType === 'QUIZ' ||
        item.componentType === 'SIMULATED_INBOX'),
  );

  const itemCount = consumableItems.length;
  const quizItems = consumableItems.filter((i) => i.componentType === 'QUIZ');
  const quizCount = quizItems.length;
  const quizScorePolicyByItemId = new Map(quizItems.map((item) => [item.id, item.quizScorePolicy]));

  const [cohortAssignments, realEmailFacts, rawPortalFacts] = await Promise.all([
    CampaignStatisticsRepository.findCampaignCohortAssignments(organisationId, campaignId),
    PhishingSimulationRepository.findCampaignPhishingSimulationFacts({
      organisationId,
      campaignId,
    }),
    portalFactsPromise,
  ]);
  const realEmail = buildRealEmailStatistics(realEmailFacts);
  const { portal, traineeInsightsByTraineeProfileId } = buildPortalStatistics(rawPortalFacts);

  if (cohortAssignments.length === 0) {
    return getCampaignStatisticsResponseSchema.parse({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        campaignType: campaign.campaignType,
        status: campaign.status,
        startDate: campaign.startDate ? campaign.startDate.toISOString() : null,
        endDate: campaign.endDate ? campaign.endDate.toISOString() : null,
        itemCount,
        quizCount,
      },
      summary: {
        assignedTraineeCount: 0,
        startedTraineeCount: 0,
        completedTraineeCount: 0,
        overallProgressPercentage: null,
        averageQuizScorePercentage: null,
        classifiedEmailCount: 0,
        correctClassificationCount: 0,
        classificationAccuracyPercentage: null,
        safeClassificationCount: 0,
        suspiciousClassificationCount: 0,
        phishingClassificationCount: 0,
        identifiedRedFlagCount: 0,
        availableRedFlagCount: 0,
      },
      ...(realEmail === undefined ? {} : { realEmail }),
      ...(portal === undefined ? {} : { portal }),
      trainees: [],
      pagination: {
        page: query.page,
        limit: query.limit,
        total: 0,
        totalPages: 0,
      },
    });
  }

  const traineeProfileIds = cohortAssignments.map((a) => a.traineeProfileId);
  const assignmentIds = cohortAssignments.map((a) => a.assignmentId);
  const trainingItemIds = consumableItems
    .filter((i) => i.componentType === 'TRAINING_DOCUMENT')
    .map((i) => i.id);
  const quizItemIds = consumableItems.filter((i) => i.componentType === 'QUIZ').map((i) => i.id);
  const simulationItems = consumableItems
    .filter((i) => i.componentType === 'SIMULATED_INBOX')
    .map((i) => ({ campaignItemId: i.id, simulatedEmailIds: i.simulatedInboxEmailIds }));
  const simulationItemIds = simulationItems.map((item) => item.campaignItemId);

  const [progressFacts, classificationFacts, adaptiveFacts] = await Promise.all([
    CampaignStatisticsRepository.findCampaignProgressFacts({
      traineeProfileIds,
      assignmentIds,
      trainingItemIds,
      quizItemIds,
      simulationItemIds,
    }),
    CampaignStatisticsRepository.findCampaignClassificationFacts({
      traineeProfileIds,
      assignmentIds,
      simulationItems,
    }),
    CampaignStatisticsRepository.findCampaignAdaptiveResolutionFacts({
      organisationId,
      campaignId,
      assignmentIds,
    }),
  ]);

  const adaptive = buildAdaptiveStatistics(adaptiveFacts);

  const selectedClassificationCounts = { SAFE: 0, SUSPICIOUS: 0, PHISHING: 0 };
  let correctClassificationCount = 0;
  let identifiedRedFlagCount = 0;
  let availableRedFlagCount = 0;

  for (const fact of classificationFacts) {
    selectedClassificationCounts[fact.selectedClassification] += 1;
    if (fact.isCorrect === true) {
      correctClassificationCount += 1;
    }
    identifiedRedFlagCount += fact.selectedRedFlagCount;
    availableRedFlagCount += fact.availableRedFlagCount;
  }

  const classifiedEmailCount = classificationFacts.length;
  const classificationAccuracyPercentage =
    classifiedEmailCount === 0
      ? null
      : roundPercentageToInteger((correctClassificationCount / classifiedEmailCount) * 100);

  const trainingEventsByAssignment = new Map<
    string,
    CampaignStatisticsRepository.TrainingProgressFact[]
  >();
  for (const event of progressFacts.trainingEvents) {
    const list = trainingEventsByAssignment.get(event.campaignAssignmentId) ?? [];
    list.push(event);
    trainingEventsByAssignment.set(event.campaignAssignmentId, list);
  }

  const quizAttemptsByAssignment = new Map<
    string,
    CampaignStatisticsRepository.QuizProgressFact[]
  >();
  for (const attempt of progressFacts.quizAttempts) {
    const list = quizAttemptsByAssignment.get(attempt.campaignAssignmentId) ?? [];
    list.push(attempt);
    quizAttemptsByAssignment.set(attempt.campaignAssignmentId, list);
  }

  const simulationEventsByAssignment = new Map<
    string,
    CampaignStatisticsRepository.SimulationProgressFact[]
  >();
  for (const simEvent of progressFacts.simulatedEmailEvents) {
    const list = simulationEventsByAssignment.get(simEvent.campaignAssignmentId) ?? [];
    list.push(simEvent);
    simulationEventsByAssignment.set(simEvent.campaignAssignmentId, list);
  }

  const allTraineeRows: CampaignStatisticsTraineeRowDto[] = [];
  const allTraineeProgressPercentages: number[] = [];
  const contributingTraineeQuizAverages: number[] = [];

  let startedTraineeCount = 0;
  let completedTraineeCount = 0;

  for (const assignment of cohortAssignments) {
    const tTrainingEvents = trainingEventsByAssignment.get(assignment.assignmentId) ?? [];
    const tQuizAttempts = quizAttemptsByAssignment.get(assignment.assignmentId) ?? [];
    const tSimEvents = simulationEventsByAssignment.get(assignment.assignmentId) ?? [];

    const hasTrainingActivity = tTrainingEvents.some(
      (e) => e.eventType === 'TRAINING_VIEWED' || e.eventType === 'TRAINING_COMPLETED',
    );
    const hasQuizActivity = tQuizAttempts.some(
      (a) => a.status === 'IN_PROGRESS' || a.status === 'SUBMITTED',
    );
    const hasSimulationActivity = tSimEvents.length > 0;

    const isStarted = hasTrainingActivity || hasQuizActivity || hasSimulationActivity;
    if (isStarted) {
      startedTraineeCount++;
    }

    let completedItemCount = 0;
    let completedQuizCount = 0;

    for (const item of consumableItems) {
      if (item.componentType === 'TRAINING_DOCUMENT') {
        const hasCompletedTraining = tTrainingEvents.some(
          (e) => e.eventType === 'TRAINING_COMPLETED' && e.campaignItemId === item.id,
        );
        if (hasCompletedTraining) {
          completedItemCount++;
        }
      } else if (item.componentType === 'QUIZ') {
        // Quiz is complete ONLY with a SUBMITTED attempt AND an authoritative result (score 0 is valid)
        const hasSubmittedQuizWithResult = tQuizAttempts.some(
          (a) => a.status === 'SUBMITTED' && a.hasResult && a.campaignItemId === item.id,
        );
        if (hasSubmittedQuizWithResult) {
          completedItemCount++;
          completedQuizCount++;
        }
      } else if (item.componentType === 'SIMULATED_INBOX') {
        const requiredEmailIds = item.simulatedInboxEmailIds;
        const itemOpenedEmailIds = new Set(
          tSimEvents
            .filter((e) => e.campaignItemId === item.id)
            .map((e) => e.simulatedEmailId || e.targetId),
        );
        if (
          requiredEmailIds.length > 0 &&
          requiredEmailIds.every((emailId) => itemOpenedEmailIds.has(emailId))
        ) {
          completedItemCount++;
        }
      }
    }

    const progressPercentage = calculateItemProgressPercentage(completedItemCount, itemCount);
    allTraineeProgressPercentages.push(progressPercentage);

    const isTraineeCompleted = itemCount > 0 && completedItemCount === itemCount;
    if (isTraineeCompleted) {
      completedTraineeCount++;
    }

    const scoredAttemptsByItemId = new Map<
      string,
      { id: string; submittedAt: Date | null; scorePercentage: number }[]
    >();

    for (const attempt of tQuizAttempts) {
      if (
        attempt.status !== 'SUBMITTED' ||
        !attempt.hasResult ||
        typeof attempt.scorePercentage !== 'number' ||
        !quizScorePolicyByItemId.has(attempt.campaignItemId)
      ) {
        continue;
      }

      const scores = scoredAttemptsByItemId.get(attempt.campaignItemId) ?? [];
      scores.push({
        id: attempt.id,
        submittedAt: attempt.submittedAt,
        scorePercentage: attempt.scorePercentage,
      });
      scoredAttemptsByItemId.set(attempt.campaignItemId, scores);
    }

    const submittedQuizScores: number[] = [];
    for (const [itemId, scores] of scoredAttemptsByItemId) {
      const policy = quizScorePolicyByItemId.get(itemId);
      if (policy === undefined) {
        throw new Error(`Missing Quiz score policy for Campaign item ${itemId}`);
      }

      const effectiveScore = calculatedEffectiveQuizScore(policy, scores);
      if (effectiveScore !== null) {
        submittedQuizScores.push(effectiveScore);
      }
    }

    const averageQuizScorePercentage = calculateTraineeAverageQuizScore(submittedQuizScores);
    if (averageQuizScorePercentage !== null) {
      contributingTraineeQuizAverages.push(averageQuizScorePercentage);
    }

    const traineePortalInsight = traineeInsightsByTraineeProfileId.get(assignment.traineeProfileId);

    allTraineeRows.push({
      assignmentId: assignment.assignmentId,
      traineeProfileId: assignment.traineeProfileId,
      displayName: `${assignment.firstName} ${assignment.lastName}`.trim(),
      email: assignment.email,
      traineeStatus: assignment.traineeStatus,
      assignmentStatus: assignment.assignmentStatus,
      accessType: assignment.accessType,
      assignedAt: assignment.assignedAt.toISOString(),
      progress: {
        completedItemCount,
        totalItemCount: itemCount,
        progressPercentage,
      },
      completedQuizCount,
      totalQuizCount: quizCount,
      averageQuizScorePercentage,
      ...(traineePortalInsight === undefined ? {} : { portal: traineePortalInsight }),
      allowedActions: {
        canUnassign: hasAssignPermission && assignment.accessType === 'ASSIGNED',
      },
    });
  }

  const overallProgressPercentage = calculateCampaignOverallProgress(allTraineeProgressPercentages);
  const campaignAverageQuizScorePercentage = calculateCampaignAverageQuizScore(
    contributingTraineeQuizAverages,
  );

  const total = cohortAssignments.length;
  const totalPages = total > 0 ? Math.ceil(total / query.limit) : 0;
  const skip = (query.page - 1) * query.limit;
  const paginatedTrainees = allTraineeRows.slice(skip, skip + query.limit);

  return getCampaignStatisticsResponseSchema.parse({
    campaign: {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      campaignType: campaign.campaignType,
      status: campaign.status,
      startDate: campaign.startDate ? campaign.startDate.toISOString() : null,
      endDate: campaign.endDate ? campaign.endDate.toISOString() : null,
      itemCount,
      quizCount,
    },
    summary: {
      assignedTraineeCount: total,
      startedTraineeCount,
      completedTraineeCount,
      overallProgressPercentage,
      averageQuizScorePercentage: campaignAverageQuizScorePercentage,
      classifiedEmailCount,
      correctClassificationCount,
      classificationAccuracyPercentage,
      safeClassificationCount: selectedClassificationCounts.SAFE,
      suspiciousClassificationCount: selectedClassificationCounts.SUSPICIOUS,
      phishingClassificationCount: selectedClassificationCounts.PHISHING,
      identifiedRedFlagCount,
      availableRedFlagCount,
    },
    ...(adaptive === undefined ? {} : { adaptive }),
    ...(realEmail === undefined ? {} : { realEmail }),
    ...(portal === undefined ? {} : { portal }),
    trainees: paginatedTrainees,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
    },
  });
}

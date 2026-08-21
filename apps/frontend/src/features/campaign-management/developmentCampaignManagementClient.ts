import type {
  CampaignCatalogueItemDto,
  CampaignCatalogueQueryDto,
  CampaignDetailResponseDto,
  CampaignListQueryDto,
  CampaignListRowDto,
  CreateCampaignDraftRequestDto,
  GetCampaignCatalogueResponseDto,
  GetCampaignsResponseDto,
  UpdateCampaignDraftRequestDto,
  CampaignDetailComponentItemDto,
  CampaignDetailItemDto,
  CampaignDraftComponentItemInputDto,
  CampaignDraftItemInputDto,
  CampaignAllowedActionDto,
  CampaignLifecycleActionResponseDto,
  CampaignMutationPreconditionDto,
} from '@insightful-phish/shared';
import {
  CampaignManagementClientError,
  type CampaignManagementClient,
} from './campaignManagementClient';
import type { CampaignManagementContext } from './campaignManagement.types';
import { DEVELOPMENT_CAMPAIGN_CATALOGUE } from './developmentCampaignCatalogue';

type DevelopmentCampaignFixture = {
  scope: CampaignManagementContext;
  campaign: CampaignListRowDto;
  items?: CampaignDetailItemDto[];
};

const PRIMARY_ORGANISATION_ID = '11111111-1111-4111-8111-111111111111';
const SECONDARY_ORGANISATION_ID = '22222222-2222-4222-8222-222222222222';

const DEVELOPMENT_CAMPAIGN_FIXTURES: readonly DevelopmentCampaignFixture[] = [
  {
    scope: {
      kind: 'organisation',
      organisationId: PRIMARY_ORGANISATION_ID,
    },
    campaign: {
      id: '10000000-0000-4000-8000-000000000001',
      name: 'New starter security',
      description: 'Security awareness for new organisation employees.',
      accentColor: '#8400FF',
      campaignType: 'ORGANISATION_CUSTOM',
      status: 'DRAFT',
      itemCount: 3,
      startDate: '2026-09-01T08:00:00.000Z',
      endDate: '2026-10-01T17:00:00.000Z',
      createdBy: {
        id: '20000000-0000-4000-8000-000000000001',
        displayName: 'Organisation Administrator',
        email: 'admin@example.org',
      },
      createdAt: '2026-08-10T08:00:00.000Z',
      updatedAt: '2026-08-14T09:30:00.000Z',
      allowedActions: ['VIEW', 'EDIT', 'ACTIVATE'],
    },
  },
  {
    scope: {
      kind: 'organisation',
      organisationId: PRIMARY_ORGANISATION_ID,
    },
    campaign: {
      id: '10000000-0000-4000-8000-000000000005',
      name: 'View-only organisation draft',
      description: 'Draft without edit authority.',
      accentColor: '#837DC3',
      campaignType: 'ORGANISATION_CUSTOM',
      status: 'DRAFT',
      itemCount: 0,
      startDate: null,
      endDate: null,
      createdBy: {
        id: '20000000-0000-4000-8000-000000000001',
        displayName: 'Organisation Administrator',
        email: 'admin@example.org',
      },
      createdAt: '2026-08-10T08:00:00.000Z',
      updatedAt: '2026-08-14T09:30:00.000Z',
      allowedActions: ['VIEW'],
    },
  },
  {
    scope: {
      kind: 'organisation',
      organisationId: PRIMARY_ORGANISATION_ID,
    },
    campaign: {
      id: '10000000-0000-4000-8000-000000000002',
      name: 'Quarterly phishing awareness',
      description: 'Active quarterly awareness campaign.',
      accentColor: '#00D1FF',
      campaignType: 'ORGANISATION_CUSTOM',
      status: 'ACTIVE',
      itemCount: 5,
      startDate: '2026-07-01T08:00:00.000Z',
      endDate: '2026-09-30T17:00:00.000Z',
      createdBy: {
        id: '20000000-0000-4000-8000-000000000001',
        displayName: 'Organisation Administrator',
        email: 'admin@example.org',
      },
      createdAt: '2026-08-10T08:00:00.000Z',
      updatedAt: '2026-08-14T09:30:00.000Z',
      allowedActions: ['VIEW', 'ARCHIVE', 'ASSIGN'],
    },
  },
  {
    scope: {
      kind: 'organisation',
      organisationId: PRIMARY_ORGANISATION_ID,
    },
    campaign: {
      id: '10000000-0000-4000-8000-000000000003',
      name: 'Archived awareness campaign',
      description: 'Archived organisation awareness campaign.',
      accentColor: '#837DC3',
      campaignType: 'ORGANISATION_CUSTOM',
      status: 'ARCHIVED',
      itemCount: 4,
      startDate: '2026-04-01T08:00:00.000Z',
      endDate: '2026-05-30T17:00:00.000Z',
      createdBy: {
        id: '20000000-0000-4000-8000-000000000001',
        displayName: 'Organisation Administrator',
        email: 'admin@example.org',
      },
      createdAt: '2026-08-10T08:00:00.000Z',
      updatedAt: '2026-08-14T09:30:00.000Z',
      allowedActions: ['VIEW', 'REACTIVATE'],
    },
  },
  {
    scope: {
      kind: 'organisation',
      organisationId: SECONDARY_ORGANISATION_ID,
    },
    campaign: {
      id: '10000000-0000-4000-8000-000000000004',
      name: 'Secondary organisation draft',
      description: 'Draft awareness campaign for a secondary organisation.',
      accentColor: '#00D1FF',
      campaignType: 'ORGANISATION_CUSTOM',
      status: 'DRAFT',
      itemCount: 5,
      startDate: null,
      endDate: null,
      createdBy: {
        id: '20000000-0000-4000-8000-000000000001',
        displayName: 'Organisation Administrator',
        email: 'admin@example.org',
      },
      createdAt: '2026-08-10T08:00:00.000Z',
      updatedAt: '2026-08-14T09:30:00.000Z',
      allowedActions: ['VIEW', 'EDIT', 'ACTIVATE'],
    },
  },
  {
    scope: {
      kind: 'platform',
    },
    campaign: {
      id: '30000000-0000-4000-8000-000000000001',
      name: 'Platform draft campaign',
      description: 'Draft platform awareness campaign.',
      accentColor: '#00D1FF',
      campaignType: 'PREMADE_GENERAL',
      status: 'DRAFT',
      itemCount: 5,
      startDate: null,
      endDate: null,
      createdBy: {
        id: '20000000-0000-4000-8000-000000000001',
        displayName: 'Organisation Administrator',
        email: 'admin@example.org',
      },
      createdAt: '2026-08-10T08:00:00.000Z',
      updatedAt: '2026-08-14T09:30:00.000Z',
      allowedActions: ['VIEW', 'EDIT', 'ACTIVATE'],
    },
  },
  {
    scope: {
      kind: 'platform',
    },
    campaign: {
      id: '30000000-0000-4000-8000-000000000002',
      name: 'Archived platform campaign',
      description: 'Archived platform awareness campaign.',
      accentColor: '#837DC3',
      campaignType: 'PREMADE_GENERAL',
      status: 'ARCHIVED',
      itemCount: 5,
      startDate: null,
      endDate: null,
      createdBy: {
        id: '20000000-0000-4000-8000-000000000001',
        displayName: 'Organisation Administrator',
        email: 'admin@example.org',
      },
      createdAt: '2026-08-10T08:00:00.000Z',
      updatedAt: '2026-08-14T09:30:00.000Z',
      allowedActions: ['VIEW', 'REACTIVATE'],
    },
  },
];

function isInContext(
  fixture: DevelopmentCampaignFixture,
  context: CampaignManagementContext,
): boolean {
  if (fixture.scope.kind !== context.kind) {
    return false;
  }
  if (fixture.scope.kind === 'organisation' && context.kind === 'organisation') {
    return fixture.scope.organisationId === context.organisationId;
  }

  return true;
}

function toCampaignDetail(fixture: DevelopmentCampaignFixture): CampaignDetailResponseDto {
  const { campaign, scope } = fixture;

  return {
    id: campaign.id,
    organisationId: scope.kind === 'organisation' ? scope.organisationId : null,
    name: campaign.name,
    description: campaign.description,
    accentColor: campaign.accentColor,
    campaignType: campaign.campaignType,
    status: campaign.status,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    createdBy: campaign.createdBy
      ? {
          id: campaign.createdBy.id,
          displayName: campaign.createdBy.displayName,
        }
      : null,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
    allowedActions: campaign.allowedActions,
    items:
      fixture.items?.map((item) =>
        item.itemType === 'GROUP'
          ? { ...item, children: item.children.map((child) => ({ ...child })) }
          : { ...item },
      ) ?? [],
  };
}

function matchesQuery(campaign: CampaignListRowDto, query: CampaignListQueryDto): boolean {
  if (query.status && campaign.status !== query.status) {
    return false;
  }

  const search = query.search?.trim().toLowerCase();

  if (!search) {
    return true;
  }

  return [campaign.name, campaign.description ?? ''].join(' ').toLowerCase().includes(search);
}

function matchesCatalogueQuery(
  item: CampaignCatalogueItemDto,
  query: CampaignCatalogueQueryDto,
): boolean {
  if (query.type && item.type !== query.type) {
    return false;
  }

  const search = query.search?.trim().toLowerCase();

  return !search || [item.title, item.description ?? ''].join(' ').toLowerCase().includes(search);
}

type DevelopmentCampaignManagementClientOptions = Readonly<{
  generateCampaignId?: () => string;
  generateCampaignItemId?: () => string;
  now?: () => Date;
}>;

function getComponentSourceKey(
  componentType: CampaignDraftComponentItemInputDto['componentType'],
  contentId: string,
): string {
  return `${componentType}:${contentId}`;
}

function getExistingItemsById(
  items: readonly CampaignDetailItemDto[],
): ReadonlyMap<string, CampaignDetailItemDto | CampaignDetailComponentItemDto> {
  const itemsById = new Map<string, CampaignDetailItemDto | CampaignDetailComponentItemDto>();

  for (const item of items) {
    itemsById.set(item.campaignItemId, item);

    if (item.itemType === 'GROUP') {
      for (const child of item.children) {
        itemsById.set(child.campaignItemId, child);
      }
    }
  }

  return itemsById;
}

function validateDevelopmentCampaignItems(
  items: readonly CampaignDraftItemInputDto[],
  existingItems: readonly CampaignDetailItemDto[],
): void {
  const existingById = getExistingItemsById(existingItems);
  const seenIds = new Set<string>();
  const seenSources = new Set<string>();

  const validateId = (campaignItemId: string | undefined) => {
    if (!campaignItemId) {
      return;
    }
    if (seenIds.has(campaignItemId)) {
      throw new Error('The same Campaign Item ID cannot appear more than once.');
    }
    seenIds.add(campaignItemId);
  };

  const validateComponent = (item: CampaignDraftComponentItemInputDto) => {
    validateId(item.campaignItemId);

    const sourceKey = getComponentSourceKey(item.componentType, item.contentId);
    if (seenSources.has(sourceKey)) {
      throw new Error('The same reusable content cannot appear more than once in a Campaign.');
    }
    seenSources.add(sourceKey);

    if (!item.campaignItemId || existingItems.length === 0) {
      return;
    }

    const existing = existingById.get(item.campaignItemId);
    if (!existing) {
      throw new Error('One or more Campaign Item IDs do not belong to this Campaign.');
    }
    if (
      existing.itemType !== 'COMPONENT' ||
      existing.componentType !== item.componentType ||
      existing.contentId !== item.contentId
    ) {
      throw new Error(
        'An existing Campaign Item cannot be reassigned to different reusable content.',
      );
    }
  };

  for (const item of items) {
    if (item.itemType !== 'GROUP') {
      validateComponent(item);
      continue;
    }

    validateId(item.campaignItemId);

    if (item.campaignItemId && existingItems.length > 0) {
      const existing = existingById.get(item.campaignItemId);

      if (!existing) {
        throw new Error('One or more Campaign Item IDs do not belong to this Campaign.');
      }

      if (existing.itemType !== 'GROUP') {
        throw new Error('An existing Campaign Item cannot change its item type.');
      }
    }

    for (const child of item.children) {
      validateComponent(child);
    }
  }
}

function toDevelopmentComponentItem(
  item: CampaignDraftComponentItemInputDto,
  position: number,
  existingItemsById: ReadonlyMap<string, CampaignDetailItemDto | CampaignDetailComponentItemDto>,
  generateCampaignItemId: () => string,
): CampaignDetailComponentItemDto {
  const source = DEVELOPMENT_CAMPAIGN_CATALOGUE.find(
    (candidate) => candidate.type === item.componentType && candidate.id === item.contentId,
  );

  if (!source) {
    throw new Error('Campaign catalogue item not found.');
  }

  const existing = item.campaignItemId ? existingItemsById.get(item.campaignItemId) : undefined;

  return {
    itemType: 'COMPONENT',
    campaignItemId:
      existing?.itemType === 'COMPONENT' ? existing.campaignItemId : generateCampaignItemId(),
    componentType: item.componentType,
    contentId: item.contentId,
    title: source.title,
    description: source.description ?? null,
    position,
    isRequired: item.isRequired,
    sourceAvailable: true,
  };
}

function countDevelopmentCampaignItems(items: readonly CampaignDetailItemDto[]): number {
  return items.reduce(
    (count, item) => count + 1 + (item.itemType === 'GROUP' ? item.children.length : 0),
    0,
  );
}

function hasUnavailableCampaignContent(items: readonly CampaignDetailItemDto[]): boolean {
  return items.some((item) =>
    item.itemType === 'COMPONENT'
      ? !item.sourceAvailable
      : item.children.some((child) => !child.sourceAvailable),
  );
}

function getDevelopmentAllowedActions(
  fixture: DevelopmentCampaignFixture,
  currentTime: Date,
): CampaignAllowedActionDto[] {
  const items = fixture.items ?? [];
  const isExpired = fixture.campaign.endDate
    ? Date.parse(fixture.campaign.endDate) <= currentTime.getTime()
    : false;
  const canActivate = items.length > 0 && !hasUnavailableCampaignContent(items) && !isExpired;

  if (fixture.campaign.status === 'DRAFT') {
    return canActivate ? ['VIEW', 'EDIT', 'ACTIVATE'] : ['VIEW', 'EDIT'];
  }

  if (fixture.campaign.status === 'ACTIVE') {
    return ['VIEW', 'ARCHIVE'];
  }

  return fixture.campaign.allowedActions;
}

function toDevelopmentCampaignItems(
  items: readonly CampaignDraftItemInputDto[],
  existingItems: readonly CampaignDetailItemDto[],
  generateCampaignItemId: () => string,
): CampaignDetailItemDto[] {
  validateDevelopmentCampaignItems(items, existingItems);
  const existingById = getExistingItemsById(existingItems);

  return items.map((item, index) => {
    const position = (index + 1) * 10;

    if (item.itemType !== 'GROUP') {
      return toDevelopmentComponentItem(item, position, existingById, generateCampaignItemId);
    }

    const existing = item.campaignItemId ? existingById.get(item.campaignItemId) : undefined;

    return {
      itemType: 'GROUP',
      campaignItemId:
        existing?.itemType === 'GROUP' ? existing.campaignItemId : generateCampaignItemId(),
      title: item.title,
      description: item.description ?? null,
      groupType: item.groupType,
      completionRule: item.completionRule,
      position,
      isRequired: item.isRequired,
      children: item.children.map((child, childIndex) =>
        toDevelopmentComponentItem(
          child,
          (childIndex + 1) * 10,
          existingById,
          generateCampaignItemId,
        ),
      ),
    };
  });
}

export function createDevelopmentCampaignManagementClient(
  options: DevelopmentCampaignManagementClientOptions = {},
): CampaignManagementClient {
  const generateCampaignId = options.generateCampaignId ?? (() => crypto.randomUUID());
  const generatedCampaignItemId = options.generateCampaignItemId ?? (() => crypto.randomUUID());
  const now = options.now ?? (() => new Date());
  const campaigns = [...DEVELOPMENT_CAMPAIGN_FIXTURES];

  return {
    async listCampaigns(
      context: CampaignManagementContext,
      query: CampaignListQueryDto,
    ): Promise<GetCampaignsResponseDto> {
      const matchingCampaigns = campaigns
        .filter((fixture) => isInContext(fixture, context))
        .map((fixture) => fixture.campaign)
        .filter((campaign) => matchesQuery(campaign, query))
        .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));

      const startIndex = (query.page - 1) * query.limit;
      const items = matchingCampaigns.slice(startIndex, startIndex + query.limit);
      const totalPages =
        matchingCampaigns.length === 0 ? 0 : Math.ceil(matchingCampaigns.length / query.limit);

      return {
        items,
        pagination: {
          page: query.page,
          limit: query.limit,
          totalItems: matchingCampaigns.length,
          totalPages,
          hasNextPage: query.page < totalPages,
          hasPreviousPage: query.page > 1,
        },
      };
    },

    async getCampaignCatalogue(
      _context: CampaignManagementContext,
      query: CampaignCatalogueQueryDto,
    ): Promise<GetCampaignCatalogueResponseDto> {
      const matchingItems = DEVELOPMENT_CAMPAIGN_CATALOGUE.filter((item) =>
        matchesCatalogueQuery(item, query),
      );
      const startIndex = (query.page - 1) * query.limit;
      const items = matchingItems.slice(startIndex, startIndex + query.limit);
      const totalPages =
        matchingItems.length === 0 ? 0 : Math.ceil(matchingItems.length / query.limit);

      return {
        items,
        pagination: {
          page: query.page,
          limit: query.limit,
          totalItems: matchingItems.length,
          totalPages,
          hasNextPage: query.page < totalPages,
          hasPreviousPage: query.page > 1,
        },
      };
    },

    async getCampaignDetail(
      context: CampaignManagementContext,
      campaignId: string,
    ): Promise<CampaignDetailResponseDto> {
      const fixture = campaigns.find(
        (candidate) => candidate.campaign.id === campaignId && isInContext(candidate, context),
      );

      if (!fixture) {
        throw new Error('Campaign not found.');
      }
      return toCampaignDetail(fixture);
    },

    async createCampaignDraft(
      context: CampaignManagementContext,
      request: CreateCampaignDraftRequestDto,
    ): Promise<CampaignDetailResponseDto> {
      if (context.kind === 'platform' && (request.startDate || request.endDate)) {
        throw new Error('Platform campaigns cannot have dates.');
      }
      const items = toDevelopmentCampaignItems(request.items, [], generatedCampaignItemId);

      const timestamp = now().toISOString();
      const fixture: DevelopmentCampaignFixture = {
        scope: context,
        campaign: {
          id: generateCampaignId(),
          name: request.name,
          description: request.description ?? null,
          accentColor: request.accentColor,
          campaignType: context.kind === 'organisation' ? 'ORGANISATION_CUSTOM' : 'PREMADE_GENERAL',
          status: 'DRAFT',
          itemCount: countDevelopmentCampaignItems(items),
          startDate: context.kind === 'organisation' ? (request.startDate ?? null) : null,
          endDate: context.kind === 'organisation' ? (request.endDate ?? null) : null,
          createdBy: {
            id: '20000000-0000-4000-8000-000000000001',
            displayName: 'Organisation Administrator',
            email: 'admin@example.org',
          },
          createdAt: timestamp,
          updatedAt: timestamp,
          allowedActions: ['VIEW', 'EDIT'],
        },
        items,
      };

      fixture.campaign.allowedActions = getDevelopmentAllowedActions(fixture, now());
      campaigns.push(fixture);

      return toCampaignDetail(fixture);
    },

    async updateCampaignDraft(
      context: CampaignManagementContext,
      campaignId: string,
      request: UpdateCampaignDraftRequestDto,
    ): Promise<CampaignDetailResponseDto> {
      const fixture = campaigns.find(
        (candidate) => candidate.campaign.id === campaignId && isInContext(candidate, context),
      );

      if (!fixture) {
        throw new Error('CAMPAIGN_NOT_FOUND');
      }

      if (
        fixture.campaign.status !== 'DRAFT' ||
        !fixture.campaign.allowedActions.includes('EDIT')
      ) {
        throw new CampaignManagementClientError('CAMPAIGN_IMMUTABLE');
      }

      if (fixture.campaign.updatedAt !== request.expectedUpdatedAt) {
        throw new CampaignManagementClientError('CAMPAIGN_CHANGED');
      }

      if (context.kind === 'platform' && (request.startDate || request.endDate)) {
        throw new Error('Platform campaigns cannot have dates.');
      }

      const items = toDevelopmentCampaignItems(
        request.items,
        fixture.items ?? [],
        generatedCampaignItemId,
      );

      const requestedTimestamp = now().getTime();
      const currentTimestamp = Date.parse(fixture.campaign.updatedAt);
      const updatedAt = new Date(Math.max(requestedTimestamp, currentTimestamp + 1)).toISOString();

      fixture.campaign = {
        ...fixture.campaign,
        name: request.name,
        description: request.description ?? null,
        accentColor: request.accentColor,
        startDate: context.kind === 'organisation' ? (request.startDate ?? null) : null,
        endDate: context.kind === 'organisation' ? (request.endDate ?? null) : null,
        itemCount: countDevelopmentCampaignItems(items),
        updatedAt,
      };

      fixture.items = items;
      fixture.campaign.allowedActions = getDevelopmentAllowedActions(fixture, now());
      return toCampaignDetail(fixture);
    },

    async activateCampaign(
      context: CampaignManagementContext,
      campaignId: string,
      request: CampaignMutationPreconditionDto,
    ): Promise<CampaignLifecycleActionResponseDto> {
      const fixture = campaigns.find(
        (candidate) => candidate.campaign.id === campaignId && isInContext(candidate, context),
      );

      if (!fixture) {
        throw new Error('CAMPAIGN_NOT_FOUND');
      }

      if (fixture.campaign.status !== 'DRAFT') {
        throw new CampaignManagementClientError('LIFECYCLE_CONFLICT');
      }

      if (fixture.campaign.updatedAt !== request.expectedUpdatedAt) {
        throw new CampaignManagementClientError('CAMPAIGN_CHANGED');
      }

      const items = fixture.items ?? [];

      if (items.length === 0) {
        throw new CampaignManagementClientError('EMPTY_CAMPAIGN');
      }

      if (hasUnavailableCampaignContent(items)) {
        throw new CampaignManagementClientError('UNAVAILABLE_CAMPAIGN_CONTENT');
      }

      const requestedTimestamp = now().getTime();
      const currentTimestamp = Date.parse(fixture.campaign.updatedAt);
      const updatedAt = new Date(Math.max(requestedTimestamp, currentTimestamp + 1)).toISOString();

      fixture.campaign = {
        ...fixture.campaign,
        status: 'ACTIVE',
        updatedAt,
      };
      fixture.campaign.allowedActions = getDevelopmentAllowedActions(fixture, now());

      return {
        success: true,
        campaignId,
        status: fixture.campaign.status,
        updatedAt,
        allowedActions: fixture.campaign.allowedActions,
      };
    },
  };
}

export const developmentCampaignManagementClient = createDevelopmentCampaignManagementClient();

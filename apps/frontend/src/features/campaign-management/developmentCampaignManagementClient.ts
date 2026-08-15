import type {
  CampaignDetailResponseDto,
  CampaignListQueryDto,
  CampaignListRowDto,
  GetCampaignsResponseDto,
} from '@insightful-phish/shared';
import type { CampaignManagementClient } from './campaignManagementClient';
import type { CampaignManagementContext } from './campaignManagement.types';

type DevelopmentCampaignFixture = {
  scope: CampaignManagementContext;
  campaign: CampaignListRowDto;
};

const PRIMARY_ORGANISATION_ID = '11111111-1111-4111-8111-111111111111';
const SECONDARY_ORGANISATION_ID = '22222222-2222-4222-8222-222222222222';

const DEVELOPMENT_CAMPAIGNS: readonly DevelopmentCampaignFixture[] = [
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
    items: [],
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

export const developmentCampaignManagementClient: CampaignManagementClient = {
  async listCampaigns(
    context: CampaignManagementContext,
    query: CampaignListQueryDto,
  ): Promise<GetCampaignsResponseDto> {
    const matchingCampaigns = DEVELOPMENT_CAMPAIGNS.filter((fixture) =>
      isInContext(fixture, context),
    )
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
  async getCampaignDetail(
    context: CampaignManagementContext,
    campaignId: string,
  ): Promise<CampaignDetailResponseDto> {
    const fixture = DEVELOPMENT_CAMPAIGNS.find(
      (candidate) => candidate.campaign.id === campaignId && isInContext(candidate, context),
    );

    if (!fixture) {
      throw new Error('Campaign not found.');
    }

    return toCampaignDetail(fixture);
  },
};

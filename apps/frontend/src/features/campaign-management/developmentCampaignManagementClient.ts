import type {
  CampaignListQueryDto,
  CampaignListRowDto,
  GetCampaignResponseDto,
} from './campaignManagement.contract';
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
      endDate: '2026-10-01T17:00:00:00.000Z',
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
      id: '10000000-0000-4000-8000-000000000001',
      name: 'Qaurterly phishsing awareness',
      description: 'Active quarterly awareness campaign.',
      accentColor: '#00D1FF',
      campaignType: 'ORGANISATION_CUSTOM',
      status: 'ACTIVE',
      itemCount: 5,
      startDate: '2026-07-01T08:00:00.000Z',
      endDate: '2026-09-30T17:00:00:00.000Z',
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
      organisationId: SECONDARY_ORGANISATION_ID,
    },
    campaign: {
      id: '10000000-0000-4000-8000-000000000001',
      name: 'Secondary campaign',
      description: 'Active quarterly awareness campaign.',
      accentColor: '#00D1FF',
      campaignType: 'ORGANISATION_CUSTOM',
      status: 'ACTIVE',
      itemCount: 5,
      startDate: '2026-07-01T08:00:00.000Z',
      endDate: '2026-09-30T17:00:00:00.000Z',
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
      name: 'Secondary campaign',
      description: 'Active quarterly awareness campaign.',
      accentColor: '#00D1FF',
      campaignType: 'PREMADE_GENERAL',
      status: 'ACTIVE',
      itemCount: 5,
      startDate: '2026-07-01T08:00:00.000Z',
      endDate: '2026-09-30T17:00:00:00.000Z',
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
  ): Promise<GetCampaignResponseDto> {
    const matchingCampaigns = DEVELOPMENT_CAMPAIGNS.filter((fixture) =>
      isInContext(fixture, context),
    )
      .map((fixture) => fixture.campaign)
      .filter((campaign) => matchesQuery(campaign, query));

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
};

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type {
  CampaignListQueryDto,
  CampaignListRowDto,
  GetCampaignsResponseDto,
} from './campaignManagement.contract';
import type { CampaignManagementClient } from './campaignManagementClient';
import CampaignManagementListPage from './CampaignManagementListPage';
import { createDeferred, renderWithRouter } from '../../testing/render';

vi.mock('../../components/layout/AppLayout', () => ({
  default: ({ children }: { children: ReactNode }) => {
    return <div>{children}</div>;
  },
}));

const ORGANISATION_ROUTE = '/organisations/:organisationId/campaigns';
const ORGANISATION_PATH = '/organisations/11111111-1111-4111-8111-111111111111/campaigns';

const DRAFT_CAMPAIGN: CampaignListRowDto = {
  id: '10000000-0000-4000-8000-000000000001',
  name: 'Draft awareness campaign',
  description: 'Editable draft',
  accentColor: '#8400FF',
  campaignType: 'ORGANISATION_CUSTOM',
  status: 'DRAFT',
  itemCount: 2,
  startDate: null,
  endDate: null,
  createdBy: null,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-10T00:00:00.000Z',
  allowedActions: ['VIEW', 'EDIT'],
};

const ACTIVE_CAMPAIGN: CampaignListRowDto = {
  ...DRAFT_CAMPAIGN,
  id: '10000000-0000-4000-8000-000000000002',
  name: 'Active phishing campaign',
  description: 'Active campaign',
  status: 'ACTIVE',
  allowedActions: ['VIEW', 'ARCHIVE'],
};

function createResponse(items: CampaignListRowDto[]): GetCampaignsResponseDto {
  return {
    items,
    pagination: {
      page: 1,
      limit: 10,
      totalItems: items.length,
      totalPages: items.length === 0 ? 0 : 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };
}

function renderPage(client: CampaignManagementClient) {
  return renderWithRouter(
    <CampaignManagementListPage contextKind="organisation" client={client} />,
    {
      initialEntry: ORGANISATION_PATH,
      routePath: ORGANISATION_ROUTE,
      auth: {
        permissions: [],
      },
    },
  );
}

describe('CampaignManagementListPage', () => {
  it('passes search and status through the list query', async () => {
    const user = userEvent.setup();
    const queries: CampaignListQueryDto[] = [];

    renderPage({
      async listCampaigns(_context, query) {
        queries.push(query);

        const items = [DRAFT_CAMPAIGN, ACTIVE_CAMPAIGN].filter((campaign) => {
          const matchesSearch =
            !query.search || campaign.name.toLowerCase().includes(query.search.toLowerCase());
          const matchesStatus = !query.status || campaign.status === query.status;

          return matchesSearch && matchesStatus;
        });

        return createResponse(items);
      },
    });

    expect(await screen.findByText('Draft awareness campaign')).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: /search campaigns/i }), 'Active');
    expect(await screen.findByText('Active phishing campaign')).toBeInTheDocument();
    expect(screen.queryByText('Draft awareness campaign')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Campaign status'), 'DRAFT');
    expect(
      await screen.findByText('No campaigns match your search or filters.'),
    ).toBeInTheDocument();

    expect(queries.at(-1)).toMatchObject({
      page: 1,
      limit: 10,
      search: 'Active',
      status: 'DRAFT',
    });
  });

  it('distinguishes true empty and filtered empty copy', async () => {
    const user = userEvent.setup();

    renderPage({
      async listCampaigns(_context, query) {
        if (query.search) {
          return createResponse([]);
        }

        return createResponse([]);
      },
    });

    expect(await screen.findByText('No campaigns have been created yet.')).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: /search campaigns/i }), 'missing');
    expect(
      await screen.findByText('No campaigns match your search or filters.'),
    ).toBeInTheDocument();
  });

  it('ignores an older response after a newer search completes', async () => {
    const user = userEvent.setup();
    const initialRequest = createDeferred<GetCampaignsResponseDto>();
    let requestCount = 0;

    renderPage({
      async listCampaigns(_context, query) {
        requestCount += 1;

        if (requestCount === 1) {
          return initialRequest.promise;
        }

        if (query.search === 'Active') {
          return createResponse([ACTIVE_CAMPAIGN]);
        }

        return createResponse([]);
      },
    });

    await user.type(screen.getByRole('searchbox', { name: /search campaigns/i }), 'Active');

    expect(await screen.findByText('Active phishing campaign')).toBeInTheDocument();

    initialRequest.resolve(createResponse([DRAFT_CAMPAIGN]));

    expect(await screen.findByText('Active phishing campaign')).toBeInTheDocument();
    expect(screen.queryByText('Draft awareness campaign')).not.toBeInTheDocument();
  });
});

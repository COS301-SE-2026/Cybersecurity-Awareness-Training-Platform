import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type {
  CampaignListQueryDto,
  CampaignListRowDto,
  GetCampaignsResponseDto,
} from '@insightful-phish/shared';
import {
  CampaignManagementClientError,
  type CampaignManagementClient,
} from './campaignManagementClient';
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

const ARCHIVED_CAMPAIGN: CampaignListRowDto = {
  ...DRAFT_CAMPAIGN,
  id: '10000000-0000-4000-8000-000000000003',
  name: 'Archived phishing campaign',
  description: 'Archived campaign',
  status: 'ARCHIVED',
  allowedActions: ['VIEW', 'REACTIVATE'],
};

const ACTIVE_CAMPAIGN: CampaignListRowDto = {
  ...DRAFT_CAMPAIGN,
  id: '10000000-0000-4000-8000-000000000002',
  name: 'Active phishing campaign',
  description: 'Active campaign',
  status: 'ACTIVE',
  allowedActions: ['VIEW', 'ARCHIVE'],
};

function createResponse(
  items: CampaignListRowDto[],
  pagination: Partial<GetCampaignsResponseDto['pagination']> = {},
): GetCampaignsResponseDto {
  return {
    items,
    pagination: {
      page: 1,
      limit: 10,
      totalItems: items.length,
      totalPages: items.length === 0 ? 0 : 1,
      hasNextPage: false,
      hasPreviousPage: false,
      ...pagination,
    },
  };
}

function renderPage(
  client: Pick<CampaignManagementClient, 'listCampaigns'>,
  permissions: string[] = ['MANAGE_CAMPAIGNS'],
) {
  return renderWithRouter(
    <CampaignManagementListPage contextKind="organisation" client={client} />,
    {
      initialEntry: ORGANISATION_PATH,
      routePath: ORGANISATION_ROUTE,
      auth: {
        permissions,
      },
    },
  );
}

describe('CampaignManagementListPage', () => {
  it.each([
    [401, 'Your session is no longer valid. Sign in again.'],
    [403, 'You no longer have permission to view Campaigns.'],
  ])('shows a meaningful message for a structured %i list error', async (status, message) => {
    renderPage({
      async listCampaigns() {
        throw new CampaignManagementClientError(status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN', {
          status,
          message: 'Backend transport message',
        });
      },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
  });

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

  it('uses authoritative pagination metadata for Previous and Next', async () => {
    const user = userEvent.setup();
    const queries: CampaignListQueryDto[] = [];

    renderPage({
      async listCampaigns(_context, query) {
        queries.push(query);
        const page = query.page;

        return createResponse([page === 1 ? DRAFT_CAMPAIGN : ACTIVE_CAMPAIGN], {
          page,
          totalItems: 11,
          totalPages: 2,
          hasNextPage: page === 1,
          hasPreviousPage: page === 2,
        });
      },
    });

    expect(await screen.findByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument();
    expect(queries.at(-1)).toMatchObject({ page: 2, limit: 10 });
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Previous' }));

    expect(await screen.findByText('Page 1 of 2')).toBeInTheDocument();
    expect(queries.at(-1)).toMatchObject({ page: 1, limit: 10 });
  });

  it('resets pagination when search or status changes', async () => {
    const user = userEvent.setup();
    const queries: CampaignListQueryDto[] = [];

    renderPage({
      async listCampaigns(_context, query) {
        queries.push(query);
        const page = query.page;

        return createResponse([DRAFT_CAMPAIGN], {
          page,
          totalItems: 11,
          totalPages: 2,
          hasNextPage: page === 1,
          hasPreviousPage: page === 2,
        });
      },
    });

    expect(await screen.findByText('Page 1 of 2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument();

    await user.type(screen.getByRole('searchbox', { name: /search campaigns/i }), 'draft');

    await waitFor(() => {
      expect(queries.at(-1)).toMatchObject({
        page: 1,
        limit: 10,
        search: 'draft',
      });
    });

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Campaign status'), 'DRAFT');

    await waitFor(() => {
      expect(queries.at(-1)).toMatchObject({
        page: 1,
        limit: 10,
        search: 'draft',
        status: 'DRAFT',
      });
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

  it('shows Create and editable Draft actions to an organisation manager', async () => {
    renderPage({
      async listCampaigns() {
        return createResponse([DRAFT_CAMPAIGN]);
      },
    });

    expect(await screen.findByText('Draft awareness campaign')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create Campaign' })).toHaveAttribute(
      'href',
      '/organisations/11111111-1111-4111-8111-111111111111/campaigns/new',
    );
    expect(screen.getByRole('link', { name: 'Continue Editing' })).toHaveAttribute(
      'href',
      '/organisations/11111111-1111-4111-8111-111111111111/campaigns/10000000-0000-4000-8000-000000000001',
    );
    expect(screen.queryByRole('link', { name: 'View Campaign' })).not.toBeInTheDocument();
  });

  it('shows View Draft but not Create or Continue Editing to an organisation viewer', async () => {
    renderPage(
      {
        async listCampaigns() {
          return createResponse([DRAFT_CAMPAIGN]);
        },
      },
      ['VIEW_CAMPAIGNS'],
    );

    expect(await screen.findByText('Draft awareness campaign')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Create Campaign' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Continue Editing' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View Draft' })).toHaveAttribute(
      'href',
      `${ORGANISATION_PATH}/${DRAFT_CAMPAIGN.id}`,
    );
  });

  it.each([
    ['ACTIVE', ACTIVE_CAMPAIGN],
    ['ARCHIVED', ARCHIVED_CAMPAIGN],
  ] as const)('shows View Campaign for a viewable %s Campaign', async (_status, campaign) => {
    renderPage({
      async listCampaigns() {
        return createResponse([campaign]);
      },
    });

    expect(await screen.findByText(campaign.name)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View Campaign' })).toHaveAttribute(
      'href',
      `${ORGANISATION_PATH}/${campaign.id}`,
    );
  });
});

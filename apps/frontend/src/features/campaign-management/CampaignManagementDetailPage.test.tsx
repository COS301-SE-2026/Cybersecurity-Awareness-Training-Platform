import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createMemoryRouter,
  MemoryRouter,
  Route,
  RouterProvider,
  Routes,
  useNavigate,
} from 'react-router-dom';
import type { CampaignDetailResponseDto } from '@insightful-phish/shared';
import { useMemo, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { createDeferred, renderWithRouter } from '../../testing/render';
import {
  CampaignManagementClientError,
  type CampaignManagementClient,
} from './campaignManagementClient';
import CampaignManagementDetailPage from './CampaignManagementDetailPage';

vi.mock('../../components/layout/AppLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

type DetailClient = Pick<
  CampaignManagementClient,
  'getCampaignCatalogue' | 'getCampaignDetail' | 'createCampaignDraft' | 'updateCampaignDraft'
>;

type DetailClientFixture = Pick<CampaignManagementClient, 'getCampaignDetail'>;

const ORGANISATION_ID = '11111111-1111-4111-8111-111111111111';
const CAMPAIGN_ID = '10000000-0000-4000-8000-000000000001';
const NEW_ROUTE = '/organisations/:organisationId/campaigns/new';
const DETAIL_ROUTE = '/organisations/:organisationId/campaigns/:campaignId';
const NEW_PATH = `/organisations/${ORGANISATION_ID}/campaigns/new`;
const DETAIL_PATH = `/organisations/${ORGANISATION_ID}/campaigns/${CAMPAIGN_ID}`;
const SECOND_CAMPAIGN_ID = '10000000-0000-4000-8000-000000000002';
const SECOND_DETAIL_PATH = `/organisations/${ORGANISATION_ID}/campaigns/${SECOND_CAMPAIGN_ID}`;

const DRAFT_DETAIL: CampaignDetailResponseDto = {
  id: CAMPAIGN_ID,
  organisationId: ORGANISATION_ID,
  name: 'Authoritative Draft Campaign',
  description: 'Draft detail from the client.',
  accentColor: '#8400FF',
  campaignType: 'ORGANISATION_CUSTOM',
  status: 'DRAFT',
  startDate: null,
  endDate: null,
  createdBy: {
    id: '20000000-0000-4000-8000-000000000001',
    displayName: 'Organisation Administrator',
  },
  createdAt: '2026-08-10T08:00:00.000Z',
  updatedAt: '2026-08-14T09:30:00.000Z',
  allowedActions: ['VIEW', 'EDIT'],
  items: [],
};

const EMPTY_CATALOGUE = {
  items: [],
  pagination: {
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

function withCreateClient(fixture: DetailClientFixture): DetailClient {
  return {
    ...fixture,
    getCampaignCatalogue: vi.fn().mockResolvedValue(EMPTY_CATALOGUE),
    createCampaignDraft: vi.fn(),
    updateCampaignDraft: vi.fn(),
  };
}

function renderPage(path: string, routePath: string, client: DetailClientFixture) {
  const detailClient = withCreateClient(client);
  return renderWithRouter(
    <CampaignManagementDetailPage contextKind="organisation" client={detailClient} />,
    {
      initialEntry: path,
      routePath,
    },
  );
}

function renderNavigatePage(path: string, routePath: string, client: DetailClientFixture) {
  const detailClient = withCreateClient(client);
  const router = createMemoryRouter(
    [
      {
        path: routePath,
        element: (
          <CampaignManagementDetailPage
            contextKind="organisation"
            client={detailClient}
            blockUnsavedNavigation
          />
        ),
      },
      {
        path: '/organisations/:organisationId/campaigns',
        element: <div>Campaign list destination</div>,
      },
    ],
    {
      initialEntries: [path],
    },
  );

  return render(<RouterProvider router={router} />);
}

function DetailRouteHarness({ client }: { client: DetailClientFixture }) {
  const navigate = useNavigate();
  const detailClient = useMemo(() => withCreateClient(client), [client]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          navigate(SECOND_DETAIL_PATH);
        }}
      >
        Load second Campaign
      </button>

      <Routes>
        <Route
          path={DETAIL_ROUTE}
          element={
            <CampaignManagementDetailPage contextKind="organisation" client={detailClient} />
          }
        />
      </Routes>
    </>
  );
}

describe('CampaignManagementDetailPage', () => {
  it('does not load detail for a new Campaign route', () => {
    const getCampaignDetail = vi.fn();

    renderPage(NEW_PATH, NEW_ROUTE, { getCampaignDetail });

    expect(screen.getByRole('heading', { level: 1, name: 'Create Campaign' })).toBeInTheDocument();
    expect(getCampaignDetail).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: 'Campaign name' })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: 'Description' })).toHaveValue('');
  });

  it('shows authoritative editable Draft detail', async () => {
    const getCampaignDetail = vi.fn().mockResolvedValue(DRAFT_DETAIL);

    renderPage(DETAIL_PATH, DETAIL_ROUTE, { getCampaignDetail });

    expect(screen.getByText('Loading campaign…')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Edit Draft Campaign' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Campaign name' })).toHaveValue(DRAFT_DETAIL.name);
    expect(screen.getByRole('textbox', { name: 'Description' })).toHaveValue(
      DRAFT_DETAIL.description,
    );
  });

  it('shows a not-found state without rendering an editable builder', async () => {
    renderPage(DETAIL_PATH, DETAIL_ROUTE, {
      getCampaignDetail: vi.fn().mockRejectedValue(
        new CampaignManagementClientError('CAMPAIGN_NOT_FOUND', {
          status: 404,
          message: 'Campaign does not exist.',
        }),
      ),
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('Campaign not found.');
    expect(screen.queryByRole('form', { name: 'Campaign details' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save Changes' })).not.toBeInTheDocument();
  });

  it('renders a Draft without EDIT authority as complete read-only Detail', async () => {
    const viewOnlyDraft: CampaignDetailResponseDto = {
      ...DRAFT_DETAIL,
      allowedActions: ['VIEW'],
    };

    renderPage(DETAIL_PATH, DETAIL_ROUTE, {
      getCampaignDetail: vi.fn().mockResolvedValue(viewOnlyDraft),
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Draft Campaign' }),
    ).toBeInTheDocument();

    const readOnlyDetail = screen.getByRole('region', { name: viewOnlyDraft.name });

    expect(within(readOnlyDetail).getByText('Draft')).toBeInTheDocument();
    expect(within(readOnlyDetail).getByText('Organisation Campaign')).toBeInTheDocument();
    expect(within(readOnlyDetail).getByText('0 items')).toBeInTheDocument();
    expect(within(readOnlyDetail).getByText('No Campaign items added.')).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Campaign details' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save Changes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Discard Changes' })).not.toBeInTheDocument();
  });

  it('renders complete ordered Active Campaign Detail including unavailable content', async () => {
    const activeDetail: CampaignDetailResponseDto = {
      ...DRAFT_DETAIL,
      name: 'Authoritative Active Campaign',
      description: null,
      accentColor: '#3100E4',
      status: 'ACTIVE',
      startDate: '2026-09-01T08:00:00.000Z',
      endDate: '2026-09-30T17:00:00.000Z',
      allowedActions: ['VIEW', 'ARCHIVE'],
      items: [
        {
          itemType: 'COMPONENT',
          campaignItemId: '30000000-0000-4000-8000-000000000003',
          componentType: 'QUIZ',
          contentId: '50000000-0000-4000-8000-000000000003',
          title: 'Final Quiz',
          description: null,
          position: 1,
          isRequired: false,
          sourceAvailable: false,
        },
        {
          itemType: 'GROUP',
          campaignItemId: '30000000-0000-4000-8000-000000000001',
          title: 'Security Essentials',
          description: 'Core security material.',
          groupType: 'MODULE',
          completionRule: 'COMPLETE_ALL',
          position: 0,
          isRequired: true,
          children: [
            {
              itemType: 'COMPONENT',
              campaignItemId: '30000000-0000-4000-8000-000000000002',
              componentType: 'TRAINING_DOCUMENT',
              contentId: '50000000-0000-4000-8000-000000000002',
              title: 'Unavailable Guide',
              description: null,
              position: 1,
              isRequired: false,
              sourceAvailable: false,
            },
            {
              itemType: 'COMPONENT',
              campaignItemId: '30000000-0000-4000-8000-000000000004',
              componentType: 'SIMULATED_INBOX',
              contentId: '50000000-0000-4000-8000-000000000004',
              title: 'Inbox Simulation',
              description: null,
              position: 0,
              isRequired: false,
              sourceAvailable: true,
            },
          ],
        },
      ],
    };

    renderPage(DETAIL_PATH, DETAIL_ROUTE, {
      getCampaignDetail: vi.fn().mockResolvedValue(activeDetail),
    });

    const readOnlyDetail = await screen.findByRole('region', { name: activeDetail.name });

    expect(within(readOnlyDetail).getByText('Active')).toBeInTheDocument();
    expect(within(readOnlyDetail).getByText('No description provided.')).toBeInTheDocument();
    expect(within(readOnlyDetail).getByText('#3100E4')).toBeInTheDocument();
    expect(within(readOnlyDetail).getByText('Organisation Campaign')).toBeInTheDocument();
    expect(within(readOnlyDetail).getByText('Organisation Administrator')).toBeInTheDocument();
    expect(within(readOnlyDetail).getByText('2 items')).toBeInTheDocument();

    expect(
      Array.from(readOnlyDetail.querySelectorAll('time'), (time) => time.getAttribute('datetime')),
    ).toEqual([
      activeDetail.createdAt,
      activeDetail.updatedAt,
      activeDetail.startDate,
      activeDetail.endDate,
    ]);

    const itemHeadings = within(readOnlyDetail).getAllByRole('heading', { level: 4 });

    expect(itemHeadings.map((heading) => heading.textContent)).toEqual([
      'Security Essentials',
      'Final Quiz',
    ]);

    const group = within(readOnlyDetail)
      .getByRole('heading', { name: 'Security Essentials' })
      .closest('article');
    const component = within(readOnlyDetail)
      .getByRole('heading', { name: 'Final Quiz' })
      .closest('article');

    expect(group).not.toBeNull();
    expect(component).not.toBeNull();
    expect(within(group as HTMLElement).getByText('Module Group')).toBeInTheDocument();
    expect(within(group as HTMLElement).getByText('Required')).toBeInTheDocument();

    const childHeadings = within(group as HTMLElement).getAllByRole('heading', { level: 6 });

    expect(childHeadings.map((heading) => heading.textContent)).toEqual([
      'Inbox Simulation',
      'Unavailable Guide',
    ]);
    expect(within(group as HTMLElement).getByText('Source unavailable')).toBeInTheDocument();

    expect(within(component as HTMLElement).getByText('Quiz')).toBeInTheDocument();
    expect(within(component as HTMLElement).getByText('Optional')).toBeInTheDocument();
    expect(within(component as HTMLElement).getByText('Source unavailable')).toBeInTheDocument();

    expect(screen.queryByRole('form', { name: 'Campaign details' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /Requirement for/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Move .* up/ })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Remove .* from Campaign/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archive Campaign' })).not.toBeInTheDocument();
  });

  it('renders an Archived platform Campaign read-only without Reactivate', async () => {
    const archivedDetail: CampaignDetailResponseDto = {
      ...DRAFT_DETAIL,
      id: '30000000-0000-4000-8000-000000000002',
      organisationId: null,
      name: 'Authoritative Archived Platform Campaign',
      campaignType: 'PREMADE_GENERAL',
      status: 'ARCHIVED',
      startDate: null,
      endDate: null,
      allowedActions: ['VIEW', 'REACTIVATE'],
    };
    const client = withCreateClient({
      getCampaignDetail: vi.fn().mockResolvedValue(archivedDetail),
    });

    renderWithRouter(<CampaignManagementDetailPage contextKind="platform" client={client} />, {
      initialEntry: `/platform/campaigns/${archivedDetail.id}`,
      routePath: '/platform/campaigns/:campaignId',
    });

    const readOnlyDetail = await screen.findByRole('region', { name: archivedDetail.name });

    expect(within(readOnlyDetail).getByText('Platform Campaign')).toBeInTheDocument();
    expect(within(readOnlyDetail).getByText('Archived')).toBeInTheDocument();
    expect(within(readOnlyDetail).queryByText('Start date')).not.toBeInTheDocument();
    expect(within(readOnlyDetail).queryByText('End date')).not.toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Campaign details' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reactivate Campaign' })).not.toBeInTheDocument();
  });

  it('retries a failed detail request through the same client boundary', async () => {
    const user = userEvent.setup();
    const getCampaignDetail = vi
      .fn()
      .mockRejectedValueOnce(new Error('Unavailable'))
      .mockResolvedValueOnce(DRAFT_DETAIL);

    renderPage(DETAIL_PATH, DETAIL_ROUTE, { getCampaignDetail });

    expect(await screen.findByText('Campaign could not be loaded. Try again.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByRole('textbox', { name: 'Campaign name' })).toHaveValue(
      DRAFT_DETAIL.name,
    );
    expect(getCampaignDetail).toHaveBeenCalledTimes(2);
  });

  it('ignores an older response after the route changes', async () => {
    const user = userEvent.setup();
    const firstRequest = createDeferred<CampaignDetailResponseDto>();
    const secondRequest = createDeferred<CampaignDetailResponseDto>();

    const secondDetail: CampaignDetailResponseDto = {
      ...DRAFT_DETAIL,
      id: SECOND_CAMPAIGN_ID,
      name: 'Second authoritative Campaign',
    };

    const getCampaignDetail = vi.fn(async (_context, campaignId: string) =>
      campaignId === CAMPAIGN_ID ? firstRequest.promise : secondRequest.promise,
    );

    render(
      <MemoryRouter initialEntries={[DETAIL_PATH]}>
        <DetailRouteHarness client={{ getCampaignDetail }} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(getCampaignDetail).toHaveBeenCalledWith(expect.anything(), CAMPAIGN_ID);
    });

    await user.click(screen.getByRole('button', { name: 'Load second Campaign' }));

    await waitFor(() => {
      expect(getCampaignDetail).toHaveBeenCalledWith(expect.anything(), SECOND_CAMPAIGN_ID);
    });

    await act(async () => {
      secondRequest.resolve(secondDetail);
      await secondRequest.promise;
    });

    expect(
      await screen.findByRole('textbox', {
        name: 'Campaign name',
      }),
    ).toHaveValue(secondDetail.name);

    await act(async () => {
      firstRequest.resolve(DRAFT_DETAIL);
      await firstRequest.promise;
    });

    expect(screen.getByRole('textbox', { name: 'Campaign name' })).toHaveValue(secondDetail.name);
  });

  it('starts a new Campaign clean with Discard disabled', () => {
    renderPage(NEW_PATH, NEW_ROUTE, {
      getCampaignDetail: vi.fn(),
    });

    expect(
      screen.getByRole('button', {
        name: 'Discard Changes',
      }),
    ).toBeDisabled();
  });

  it('preserves local changes when Discard is cancelled', async () => {
    const user = userEvent.setup();

    renderPage(DETAIL_PATH, DETAIL_ROUTE, {
      getCampaignDetail: vi.fn().mockResolvedValue(DRAFT_DETAIL),
    });

    const name = await screen.findByRole('textbox', { name: 'Campaign name' });

    await user.clear(name);
    await user.type(name, 'Changed Campaign');

    await user.click(screen.getByRole('button', { name: 'Discard Changes' }));

    const title = screen.getByText('Discard unsaved changes?');
    const modal = title.closest('#popup-modal');

    expect(modal).not.toBeNull();

    await user.click(within(modal as HTMLElement).getByText('Cancel'));

    expect(screen.queryByText('Discard unsaved changes?')).not.toBeInTheDocument();
    expect(name).toHaveValue('Changed Campaign');
  });

  it('restores authoritative values when Discard is confirmed', async () => {
    const user = userEvent.setup();

    renderNavigatePage(DETAIL_PATH, DETAIL_ROUTE, {
      getCampaignDetail: vi.fn().mockResolvedValue(DRAFT_DETAIL),
    });

    const name = await screen.findByRole('textbox', { name: 'Campaign name' });

    await user.clear(name);
    await user.type(name, 'Changed Campaign');

    await user.click(screen.getByRole('button', { name: 'Discard Changes' }));

    const title = screen.getByText('Discard unsaved changes?');
    const modal = title.closest('#popup-modal');

    expect(modal).not.toBeNull();

    await user.click(within(modal as HTMLElement).getByText('Discard'));

    expect(
      screen.getByRole('heading', { level: 1, name: 'Edit Draft Campaign' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Campaign list destination')).not.toBeInTheDocument();

    expect(screen.queryByText('Discard unsaved changes?')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Campaign name' })).toHaveValue(DRAFT_DETAIL.name);
    expect(screen.getByRole('button', { name: 'Discard Changes' })).toBeDisabled();
  });

  it('returns to the Campaign list when unsaved new-Campaign Discard is confirmed', async () => {
    const user = userEvent.setup();

    renderNavigatePage(NEW_PATH, NEW_ROUTE, {
      getCampaignDetail: vi.fn(),
    });

    await user.type(screen.getByRole('textbox', { name: 'Campaign name' }), 'Unsaved Campaign');

    await user.click(screen.getByRole('button', { name: 'Discard Changes' }));

    const dialog = screen.getByRole('dialog', { name: 'Discard unsaved changes?' });

    await user.click(within(dialog).getByRole('button', { name: 'Discard' }));

    expect(screen.getByText('Campaign list destination')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { level: 1, name: 'Create Campaign' }),
    ).not.toBeInTheDocument();
  });

  it('navigates back immediately when the editor is clean', async () => {
    const user = userEvent.setup();

    renderNavigatePage(NEW_PATH, NEW_ROUTE, {
      getCampaignDetail: vi.fn(),
    });

    await user.click(screen.getByRole('link', { name: 'Back to Campaigns' }));

    expect(screen.getByText('Campaign list destination')).toBeInTheDocument();
    expect(screen.queryByText('Leave without saving?')).not.toBeInTheDocument();
  });

  it('asks for confirmation instead of navigating back when dirty', async () => {
    const user = userEvent.setup();

    renderNavigatePage(NEW_PATH, NEW_ROUTE, {
      getCampaignDetail: vi.fn(),
    });

    const name = await screen.findByRole('textbox', { name: 'Campaign name' });

    await user.clear(name);
    await user.type(name, 'Changed Campaign');

    await user.click(screen.getByRole('link', { name: 'Back to Campaigns' }));

    expect(screen.getByText('Leave without saving?')).toBeInTheDocument();
    expect(screen.queryByText('Campaign list destination')).not.toBeInTheDocument();
    expect(name).toHaveValue('Changed Campaign');
  });

  it('preserves changes when leaving is cancelled', async () => {
    const user = userEvent.setup();

    renderNavigatePage(NEW_PATH, NEW_ROUTE, {
      getCampaignDetail: vi.fn().mockResolvedValue(DRAFT_DETAIL),
    });

    const name = await screen.findByRole('textbox', { name: 'Campaign name' });

    await user.clear(name);
    await user.type(name, 'Changed Campaign');

    await user.click(screen.getByRole('link', { name: 'Back to Campaigns' }));

    const title = screen.getByText('Leave without saving?');
    const modal = title.closest('#popup-modal');

    expect(modal).not.toBeNull();

    await user.click(within(modal as HTMLElement).getByText('Cancel'));

    expect(screen.queryByText('Leave without saving?')).not.toBeInTheDocument();
    expect(screen.queryByText('Campaign list destination')).not.toBeInTheDocument();
    expect(name).toHaveValue('Changed Campaign');
  });

  it('navigates to the Campaign list when leaving is confirmed', async () => {
    const user = userEvent.setup();

    renderNavigatePage(NEW_PATH, NEW_ROUTE, {
      getCampaignDetail: vi.fn().mockResolvedValue(DRAFT_DETAIL),
    });

    const name = await screen.findByRole('textbox', { name: 'Campaign name' });

    await user.clear(name);
    await user.type(name, 'Changed Campaign');

    await user.click(screen.getByRole('link', { name: 'Back to Campaigns' }));

    const title = screen.getByText('Leave without saving?');
    const modal = title.closest('#popup-modal');

    expect(modal).not.toBeNull();

    await user.click(within(modal as HTMLElement).getByText('Leave without saving'));

    expect(screen.getByText('Campaign list destination')).toBeInTheDocument();
    expect(screen.queryByText('Leave without saving?')).not.toBeInTheDocument();
  });

  it('does not prevent browser unload while clean', () => {
    renderPage(NEW_PATH, NEW_ROUTE, {
      getCampaignDetail: vi.fn(),
    });

    const event = new Event('beforeunload', {
      bubbles: false,
      cancelable: true,
    });

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it('prevents browser unload while dirty', async () => {
    const user = userEvent.setup();

    renderPage(NEW_PATH, NEW_ROUTE, {
      getCampaignDetail: vi.fn().mockResolvedValue(DRAFT_DETAIL),
    });

    const name = await screen.findByRole('textbox', { name: 'Campaign name' });

    await user.clear(name);
    await user.type(name, 'Changed Campaign');

    const event = new Event('beforeunload', {
      bubbles: false,
      cancelable: true,
    });

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });
});

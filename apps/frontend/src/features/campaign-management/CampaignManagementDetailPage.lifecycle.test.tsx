import type {
  CampaignDetailResponseDto,
  CampaignLifecycleActionResponseDto,
  DeleteCampaignAssignmentResponseDto,
  GetOrganisationCampaignStatisticsResponseDto,
} from '@insightful-phish/shared';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ComponentProps, type ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { createDeferred } from '../../testing/render';
import CampaignInsightsPage from '../../pages/CampaignInsightsPage';
import CampaignManagementDetailPage from './CampaignManagementDetailPage';
import {
  CampaignManagementClientError,
  type CampaignManagementClient,
} from './campaignManagementClient';

vi.mock('../../components/layout/AppLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const ORGANISATION_ID = '11111111-1111-4111-8111-111111111111';
const CAMPAIGN_ID = '10000000-0000-4000-8000-000000000001';
const DETAIL_PATH = `/organisations/${ORGANISATION_ID}/campaigns/${CAMPAIGN_ID}`;

type LifecycleClient = Pick<
  CampaignManagementClient,
  | 'getCampaignCatalogue'
  | 'getCampaignDetail'
  | 'createCampaignDraft'
  | 'updateCampaignDraft'
  | 'activateCampaign'
> &
  Partial<
    Pick<CampaignManagementClient, 'activateCampaign' | 'archiveCampaign' | 'reactivateCampaign'>
  >;

type LifecycleMethods = Partial<
  Pick<CampaignManagementClient, 'activateCampaign' | 'archiveCampaign' | 'reactivateCampaign'>
>;

type StatisticsClient = NonNullable<
  ComponentProps<typeof CampaignInsightsPage>['statisticsClient']
>;

type UnassignClient = NonNullable<ComponentProps<typeof CampaignInsightsPage>['unassignClient']>;

const PERSISTED_ITEM = {
  itemType: 'COMPONENT',
  campaignItemId: '90000000-0000-4000-8000-000000000001',
  componentType: 'QUIZ',
  contentId: '50000000-0000-4000-8000-000000000002',
  title: 'Password safety quiz',
  description: 'Check understanding of password security practices.',
  position: 10,
  isRequired: true,
  sourceAvailable: true,
} as const;

const VALID_DRAFT: CampaignDetailResponseDto = {
  id: CAMPAIGN_ID,
  organisationId: ORGANISATION_ID,
  name: 'Activation Draft',
  description: null,
  accentColor: '#8400FF',
  campaignType: 'ORGANISATION_CUSTOM',
  status: 'DRAFT',
  startDate: null,
  endDate: null,
  createdBy: null,
  createdAt: '2026-08-10T08:00:00.000Z',
  updatedAt: '2026-08-14T09:30:00.000Z',
  allowedActions: ['VIEW', 'EDIT', 'ACTIVATE'],
  items: [PERSISTED_ITEM],
};

const EMPTY_DRAFT: CampaignDetailResponseDto = {
  ...VALID_DRAFT,
  allowedActions: ['VIEW', 'EDIT'],
  items: [],
};

const ACTIVE_CAMPAIGN_DESCRIPTION =
  'A detailed security awareness campaign for every member of the organisation.';

const ACTIVE_CAMPAIGN: CampaignDetailResponseDto = {
  ...VALID_DRAFT,
  name: 'Active Awareness Campaign',
  description: ACTIVE_CAMPAIGN_DESCRIPTION,
  status: 'ACTIVE',
  startDate: '2026-08-12T08:00:00.000Z',
  endDate: '2026-09-30T17:00:00.000Z',
  allowedActions: ['VIEW', 'ARCHIVE'],
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

const ACTIVE_TRAINEE: GetOrganisationCampaignStatisticsResponseDto['trainees'][number] = {
  assignmentId: '30000000-0000-4000-8000-000000000001',
  traineeProfileId: '40000000-0000-4000-8000-000000000001',
  displayName: 'Sipho Ndlovu',
  email: 'sipho.ndlovu@example.com',
  traineeStatus: 'ACTIVE',
  assignmentStatus: 'IN_PROGRESS',
  accessType: 'ASSIGNED',
  assignedAt: '2026-08-12T09:00:00.000Z',
  progress: {
    completedItemCount: 3,
    totalItemCount: 8,
    progressPercentage: 38,
  },
  completedQuizCount: 1,
  totalQuizCount: 2,
  averageQuizScorePercentage: 79,
  allowedActions: {
    canUnassign: true,
  },
};

const DISABLED_TRAINEE: GetOrganisationCampaignStatisticsResponseDto['trainees'][number] = {
  assignmentId: '30000000-0000-4000-8000-000000000002',
  traineeProfileId: '40000000-0000-4000-8000-000000000002',
  displayName: 'Naledi Molefe',
  email: 'naledi.molefe@example.com',
  traineeStatus: 'DISABLED',
  assignmentStatus: 'COMPLETED',
  accessType: 'ASSIGNED',
  assignedAt: '2026-08-12T10:00:00.000Z',
  progress: {
    completedItemCount: 8,
    totalItemCount: 8,
    progressPercentage: 100,
  },
  completedQuizCount: 0,
  totalQuizCount: 2,
  averageQuizScorePercentage: null,
  allowedActions: {
    canUnassign: false,
  },
};

const THIRD_TRAINEE: GetOrganisationCampaignStatisticsResponseDto['trainees'][number] = {
  ...DISABLED_TRAINEE,
  assignmentId: '30000000-0000-4000-8000-000000000003',
  traineeProfileId: '40000000-0000-4000-8000-000000000003',
  displayName: 'Zinhle Dlamini',
  email: 'zinhle.dlamini@example.com',
};

const FOURTH_TRAINEE: GetOrganisationCampaignStatisticsResponseDto['trainees'][number] = {
  ...ACTIVE_TRAINEE,
  assignmentId: '30000000-0000-4000-8000-000000000004',
  traineeProfileId: '40000000-0000-4000-8000-000000000004',
  displayName: 'Thabo Mokoena',
  email: 'thabo.mokoena@example.com',
};

const STATISTICS_RESPONSE: GetOrganisationCampaignStatisticsResponseDto = {
  campaign: {
    id: CAMPAIGN_ID,
    name: ACTIVE_CAMPAIGN.name,
    description: ACTIVE_CAMPAIGN.description,
    campaignType: ACTIVE_CAMPAIGN.campaignType,
    status: ACTIVE_CAMPAIGN.status,
    startDate: ACTIVE_CAMPAIGN.startDate,
    endDate: ACTIVE_CAMPAIGN.endDate,
    itemCount: 8,
    quizCount: 2,
  },
  summary: {
    assignedTraineeCount: 2,
    startedTraineeCount: 2,
    completedTraineeCount: 1,
    overallProgressPercentage: 63,
    averageQuizScorePercentage: 87,
  },
  trainees: [ACTIVE_TRAINEE, DISABLED_TRAINEE],
  pagination: {
    page: 1,
    limit: 3,
    total: 2,
    totalPages: 1,
  },
};

function renderPage(
  detail: CampaignDetailResponseDto,
  lifecycleMethods: LifecycleMethods = {},
  statisticsResponse: GetOrganisationCampaignStatisticsResponseDto = STATISTICS_RESPONSE,
  statisticsClient: StatisticsClient = vi.fn().mockResolvedValue(statisticsResponse),
  unassignClient: UnassignClient = vi.fn(),
) {
  const client: LifecycleClient = {
    getCampaignCatalogue: vi.fn().mockResolvedValue(EMPTY_CATALOGUE),
    getCampaignDetail: vi.fn().mockResolvedValue(detail),
    createCampaignDraft: vi.fn(),
    updateCampaignDraft: vi.fn(),
    activateCampaign: lifecycleMethods.activateCampaign ?? vi.fn(),
    ...lifecycleMethods,
  };

  render(
    <MemoryRouter initialEntries={[DETAIL_PATH]}>
      <Routes>
        <Route
          path="/organisations/:organisationId/campaigns/:campaignId"
          element={<CampaignManagementDetailPage contextKind="organisation" client={client} />}
        />
        <Route
          path="/organisations/:organisationId/campaigns/:campaignId/statistics"
          element={
            <CampaignInsightsPage
              statisticsClient={statisticsClient}
              unassignClient={unassignClient}
            />
          }
        />
      </Routes>
    </MemoryRouter>,
  );

  return client;
}

describe('CampaignManagementDetailPage activation', () => {
  it('opens the selected Organisation Campaign statistics page with list navigation', async () => {
    const user = userEvent.setup();

    renderPage(ACTIVE_CAMPAIGN, { archiveCampaign: vi.fn() });

    await user.click(
      await screen.findByRole('button', { name: 'View Assigned Trainees & Insights' }),
    );

    expect(
      screen.getByRole('heading', { level: 1, name: ACTIVE_CAMPAIGN.name }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Campaign' })).toHaveAttribute(
      'href',
      DETAIL_PATH,
    );
    expect(screen.getByText('12 Aug 2026 to 30 Sept 2026')).toBeInTheDocument();
    expect(screen.getByText('Organisation Campaign')).toBeInTheDocument();
    expect(screen.getByText('Organisation')).toBeInTheDocument();

    const statusField = screen.getByText('Status', { selector: 'p' }).parentElement;

    if (statusField === null) {
      throw new Error('Expected the Campaign status field to be rendered.');
    }

    expect(within(statusField).getByText('Active')).toBeInTheDocument();

    const description = screen.getByText(ACTIVE_CAMPAIGN_DESCRIPTION);
    expect(description).toHaveClass('max-h-[3.3rem]', 'overflow-y-auto');

    const statistics = await screen.findByLabelText('Campaign summary statistics');
    expect(within(statistics).getAllByText('2')).toHaveLength(2);
    expect(within(statistics).getByText('1')).toBeInTheDocument();
    expect(within(statistics).getByText('63%')).toBeInTheDocument();
    expect(within(statistics).getByText('87%')).toBeInTheDocument();

    const activeTraineeRow = screen.getByRole('row', { name: /Sipho Ndlovu/ });
    expect(within(activeTraineeRow).getByText('sipho.ndlovu@example.com')).toHaveAttribute(
      'href',
      'mailto:sipho.ndlovu@example.com',
    );
    expect(within(activeTraineeRow).getByText('38%')).toBeInTheDocument();
    expect(within(activeTraineeRow).getByText('3/8')).toBeInTheDocument();
    expect(within(activeTraineeRow).getByText('79%')).toBeInTheDocument();
    expect(within(activeTraineeRow).getByText('Active')).toBeInTheDocument();

    const disabledTraineeRow = screen.getByRole('row', { name: /Naledi Molefe/ });
    expect(within(disabledTraineeRow).getByText('100%')).toBeInTheDocument();
    expect(within(disabledTraineeRow).getByText('8/8')).toBeInTheDocument();
    expect(within(disabledTraineeRow).getByTitle('No submitted Quiz score')).toHaveTextContent('—');
    expect(within(disabledTraineeRow).getByText('Disabled')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Unassign' })).toHaveLength(1);
    expect(within(disabledTraineeRow).getByLabelText('Unassign unavailable')).toHaveTextContent(
      '—',
    );
  });

  it('confirms a permitted unassignment and refreshes authoritative statistics', async () => {
    const user = userEvent.setup();
    const unassignRequest = createDeferred<DeleteCampaignAssignmentResponseDto>();
    const unassignClient: UnassignClient = vi.fn(() => unassignRequest.promise);
    const refreshedStatistics: GetOrganisationCampaignStatisticsResponseDto = {
      ...STATISTICS_RESPONSE,
      summary: {
        assignedTraineeCount: 1,
        startedTraineeCount: 1,
        completedTraineeCount: 1,
        overallProgressPercentage: 100,
        averageQuizScorePercentage: null,
      },
      trainees: [DISABLED_TRAINEE],
      pagination: {
        page: 1,
        limit: 3,
        total: 1,
        totalPages: 1,
      },
    };
    const statisticsClient: StatisticsClient = vi
      .fn()
      .mockResolvedValueOnce(STATISTICS_RESPONSE)
      .mockResolvedValueOnce(refreshedStatistics);

    renderPage(
      ACTIVE_CAMPAIGN,
      { archiveCampaign: vi.fn() },
      STATISTICS_RESPONSE,
      statisticsClient,
      unassignClient,
    );

    await user.click(
      await screen.findByRole('button', { name: 'View Assigned Trainees & Insights' }),
    );
    await user.click(await screen.findByRole('button', { name: 'Unassign' }));

    const dialog = screen.getByRole('dialog', { name: 'Unassign Trainee from Campaign' });
    expect(
      within(dialog).getByText(
        `Are you sure that you want to unassign ${ACTIVE_TRAINEE.displayName} from ${ACTIVE_CAMPAIGN.name}? Their campaign progress will be permanently removed.`,
      ),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Unassign' }));

    expect(unassignClient).toHaveBeenCalledTimes(1);
    expect(unassignClient).toHaveBeenCalledWith(ORGANISATION_ID, ACTIVE_TRAINEE.assignmentId);
    expect(within(dialog).getByRole('button', { name: 'Processing...' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Keep Assigned' })).toBeDisabled();

    await act(async () => {
      unassignRequest.resolve({
        assignmentId: ACTIVE_TRAINEE.assignmentId,
        campaignId: CAMPAIGN_ID,
        traineeProfileId: ACTIVE_TRAINEE.traineeProfileId,
        unassigned: true,
        deletedProgress: {
          quizAttempts: 1,
          emailClassificationResponses: 0,
          interactionEvents: 2,
        },
      });
      await unassignRequest.promise;
    });

    expect(await screen.findByText(DISABLED_TRAINEE.displayName)).toBeInTheDocument();
    expect(screen.queryByText(ACTIVE_TRAINEE.displayName)).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(statisticsClient).toHaveBeenCalledTimes(2);
    expect(statisticsClient).toHaveBeenLastCalledWith(ORGANISATION_ID, CAMPAIGN_ID, {
      page: 1,
      limit: 3,
    });
  });

  it('shows an em dash when the selected Campaign has no duration', async () => {
    const user = userEvent.setup();
    const campaignWithoutDuration: CampaignDetailResponseDto = {
      ...ACTIVE_CAMPAIGN,
      startDate: null,
      endDate: null,
    };
    const statisticsWithoutDuration: GetOrganisationCampaignStatisticsResponseDto = {
      ...STATISTICS_RESPONSE,
      campaign: {
        ...STATISTICS_RESPONSE.campaign,
        startDate: null,
        endDate: null,
      },
    };

    renderPage(campaignWithoutDuration, { archiveCampaign: vi.fn() }, statisticsWithoutDuration);

    await user.click(
      await screen.findByRole('button', { name: 'View Assigned Trainees & Insights' }),
    );

    const durationLabel = screen.getByText('Duration');
    const durationField = durationLabel.parentElement;

    if (durationField === null) {
      throw new Error('Expected the Campaign duration field to be rendered.');
    }

    expect(within(durationField).getByText('—')).toBeInTheDocument();
  });

  it('shows no-cohort percentage values as em dashes rather than zero scores', async () => {
    const user = userEvent.setup();
    const emptyStatisticsResponse: GetOrganisationCampaignStatisticsResponseDto = {
      ...STATISTICS_RESPONSE,
      summary: {
        assignedTraineeCount: 0,
        startedTraineeCount: 0,
        completedTraineeCount: 0,
        overallProgressPercentage: null,
        averageQuizScorePercentage: null,
      },
      trainees: [],
      pagination: {
        page: 1,
        limit: 3,
        total: 0,
        totalPages: 0,
      },
    };

    renderPage(ACTIVE_CAMPAIGN, { archiveCampaign: vi.fn() }, emptyStatisticsResponse);

    await user.click(
      await screen.findByRole('button', { name: 'View Assigned Trainees & Insights' }),
    );

    const statistics = await screen.findByLabelText('Campaign summary statistics');
    expect(within(statistics).getAllByText('0')).toHaveLength(3);
    expect(within(statistics).getAllByText('—')).toHaveLength(2);
    expect(within(statistics).queryByText('0%')).not.toBeInTheDocument();
    expect(screen.getByText('No Assigned Trainees')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Assign Trainees' })).toHaveAttribute(
      'href',
      `/organisations/${ORGANISATION_ID}/campaign-assignments/new`,
    );
  });

  it('shows exactly three Trainees per backend-driven page', async () => {
    const user = userEvent.setup();
    const firstResponse: GetOrganisationCampaignStatisticsResponseDto = {
      ...STATISTICS_RESPONSE,
      summary: {
        ...STATISTICS_RESPONSE.summary,
        assignedTraineeCount: 4,
      },
      trainees: [ACTIVE_TRAINEE, DISABLED_TRAINEE, THIRD_TRAINEE],
      pagination: {
        page: 1,
        limit: 3,
        total: 4,
        totalPages: 2,
      },
    };
    const secondResponse: GetOrganisationCampaignStatisticsResponseDto = {
      ...firstResponse,
      trainees: [FOURTH_TRAINEE],
      pagination: {
        page: 2,
        limit: 3,
        total: 4,
        totalPages: 2,
      },
    };
    const statisticsClient: StatisticsClient = vi.fn(async (_organisationId, _campaignId, query) =>
      query?.page === 2 ? secondResponse : firstResponse,
    );

    renderPage(ACTIVE_CAMPAIGN, { archiveCampaign: vi.fn() }, firstResponse, statisticsClient);

    await user.click(
      await screen.findByRole('button', { name: 'View Assigned Trainees & Insights' }),
    );

    expect(await screen.findByText(ACTIVE_TRAINEE.displayName)).toBeInTheDocument();
    expect(screen.getByText(DISABLED_TRAINEE.displayName)).toBeInTheDocument();
    expect(screen.getByText(THIRD_TRAINEE.displayName)).toBeInTheDocument();
    expect(screen.queryByText(FOURTH_TRAINEE.displayName)).not.toBeInTheDocument();
    expect(statisticsClient).toHaveBeenNthCalledWith(1, ORGANISATION_ID, CAMPAIGN_ID, {
      page: 1,
      limit: 3,
    });

    const pagination = screen.getByRole('navigation', {
      name: 'Assigned Trainees Table Pagination',
    });
    expect(within(pagination).getByRole('button', { name: '1' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await user.click(within(pagination).getByRole('button', { name: '2' }));

    expect(await screen.findByText(FOURTH_TRAINEE.displayName)).toBeInTheDocument();
    expect(screen.queryByText(ACTIVE_TRAINEE.displayName)).not.toBeInTheDocument();
    expect(screen.queryByText(DISABLED_TRAINEE.displayName)).not.toBeInTheDocument();
    expect(screen.queryByText(THIRD_TRAINEE.displayName)).not.toBeInTheDocument();
    expect(statisticsClient).toHaveBeenNthCalledWith(2, ORGANISATION_ID, CAMPAIGN_ID, {
      page: 2,
      limit: 3,
    });
    expect(within(pagination).getByRole('button', { name: '2' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('returns to the nearest valid page when unassignment empties the current page', async () => {
    const user = userEvent.setup();
    const firstPage: GetOrganisationCampaignStatisticsResponseDto = {
      ...STATISTICS_RESPONSE,
      summary: {
        ...STATISTICS_RESPONSE.summary,
        assignedTraineeCount: 4,
      },
      trainees: [ACTIVE_TRAINEE, DISABLED_TRAINEE, THIRD_TRAINEE],
      pagination: {
        page: 1,
        limit: 3,
        total: 4,
        totalPages: 2,
      },
    };
    const secondPage: GetOrganisationCampaignStatisticsResponseDto = {
      ...firstPage,
      trainees: [FOURTH_TRAINEE],
      pagination: {
        page: 2,
        limit: 3,
        total: 4,
        totalPages: 2,
      },
    };
    const emptyRemovedPage: GetOrganisationCampaignStatisticsResponseDto = {
      ...firstPage,
      summary: {
        ...firstPage.summary,
        assignedTraineeCount: 3,
      },
      trainees: [],
      pagination: {
        page: 2,
        limit: 3,
        total: 3,
        totalPages: 1,
      },
    };
    const correctedFirstPage: GetOrganisationCampaignStatisticsResponseDto = {
      ...emptyRemovedPage,
      trainees: [ACTIVE_TRAINEE, DISABLED_TRAINEE, THIRD_TRAINEE],
      pagination: {
        page: 1,
        limit: 3,
        total: 3,
        totalPages: 1,
      },
    };
    const statisticsClient: StatisticsClient = vi
      .fn()
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce(secondPage)
      .mockResolvedValueOnce(emptyRemovedPage)
      .mockResolvedValueOnce(correctedFirstPage);
    const unassignClient: UnassignClient = vi.fn().mockResolvedValue({
      assignmentId: FOURTH_TRAINEE.assignmentId,
      campaignId: CAMPAIGN_ID,
      traineeProfileId: FOURTH_TRAINEE.traineeProfileId,
      unassigned: true,
      deletedProgress: {
        quizAttempts: 1,
        emailClassificationResponses: 0,
        interactionEvents: 2,
      },
    });

    renderPage(
      ACTIVE_CAMPAIGN,
      { archiveCampaign: vi.fn() },
      firstPage,
      statisticsClient,
      unassignClient,
    );

    await user.click(
      await screen.findByRole('button', { name: 'View Assigned Trainees & Insights' }),
    );

    const pagination = await screen.findByRole('navigation', {
      name: 'Assigned Trainees Table Pagination',
    });
    await user.click(within(pagination).getByRole('button', { name: '2' }));
    expect(await screen.findByText(FOURTH_TRAINEE.displayName)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Unassign' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Unassign' }));

    expect(await screen.findByText(ACTIVE_TRAINEE.displayName)).toBeInTheDocument();
    expect(screen.queryByText(FOURTH_TRAINEE.displayName)).not.toBeInTheDocument();
    expect(within(pagination).getByRole('button', { name: '1' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(statisticsClient).toHaveBeenNthCalledWith(3, ORGANISATION_ID, CAMPAIGN_ID, {
      page: 2,
      limit: 3,
    });
    expect(statisticsClient).toHaveBeenNthCalledWith(4, ORGANISATION_ID, CAMPAIGN_ID, {
      page: 1,
      limit: 3,
    });
  });

  it('explains why an empty saved Draft cannot be activated', async () => {
    const activateCampaign = vi.fn();

    renderPage(EMPTY_DRAFT, { activateCampaign });

    const activate = await screen.findByRole('button', { name: 'Activate Campaign' });

    expect(activate).toBeDisabled();
    expect(
      screen.getByText('Add at least one Campaign item before activation.'),
    ).toBeInTheDocument();
    expect(activateCampaign).not.toHaveBeenCalled();
  });

  it('requires local Draft changes to be saved before activation', async () => {
    const user = userEvent.setup();

    renderPage(VALID_DRAFT);

    const name = await screen.findByRole('textbox', { name: 'Campaign name' });
    await user.clear(name);
    await user.type(name, 'Locally changed Draft');

    expect(screen.getByRole('button', { name: 'Activate Campaign' })).toBeDisabled();
    expect(screen.getByText('Save changes before activation.')).toBeInTheDocument();
  });

  it('blocks activation when a group contains unavailable content', async () => {
    const groupedDraft: CampaignDetailResponseDto = {
      ...VALID_DRAFT,
      allowedActions: ['VIEW', 'EDIT'],
      items: [
        {
          itemType: 'GROUP',
          campaignItemId: '90000000-0000-4000-8000-000000000010',
          title: 'Security module',
          description: null,
          groupType: 'MODULE',
          completionRule: 'COMPLETE_REQUIRED_ONLY',
          position: 10,
          isRequired: true,
          children: [
            {
              ...PERSISTED_ITEM,
              campaignItemId: '90000000-0000-4000-8000-000000000011',
              sourceAvailable: false,
            },
            {
              ...PERSISTED_ITEM,
              campaignItemId: '90000000-0000-4000-8000-000000000012',
              contentId: '50000000-0000-4000-8000-000000000003',
              title: 'Follow-up quiz',
              position: 20,
            },
          ],
        },
      ],
    };

    renderPage(groupedDraft);

    expect(await screen.findByRole('button', { name: 'Activate Campaign' })).toBeDisabled();
    expect(
      screen.getByText('Remove unavailable Campaign content before activation.'),
    ).toBeInTheDocument();
  });

  it('confirms activation before locking Draft mutations and adopting the response', async () => {
    const user = userEvent.setup();
    const activationRequest = createDeferred<CampaignLifecycleActionResponseDto>();
    const activateCampaign = vi.fn(() => activationRequest.promise);

    renderPage(VALID_DRAFT, { activateCampaign });

    await user.click(await screen.findByRole('button', { name: 'Activate Campaign' }));

    const dialog = screen.getByRole('dialog', { name: `Activate ${VALID_DRAFT.name}?` });

    expect(
      within(dialog).getByText(
        'Activating this Campaign will make its details and items read-only.',
      ),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Keep Editing' })).toBeEnabled();
    expect(within(dialog).getByRole('button', { name: 'Activate Campaign' })).toBeEnabled();
    expect(activateCampaign).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: 'Activate Campaign' }));

    expect(activateCampaign).toHaveBeenCalledWith(
      {
        kind: 'organisation',
        organisationId: ORGANISATION_ID,
      },
      CAMPAIGN_ID,
      {
        expectedUpdatedAt: VALID_DRAFT.updatedAt,
      },
    );

    expect(within(dialog).getByRole('button', { name: 'Processing...' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Keep Editing' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled();

    await act(async () => {
      activationRequest.resolve({
        success: true,
        campaignId: CAMPAIGN_ID,
        status: 'ACTIVE',
        updatedAt: '2026-08-14T10:00:00.000Z',
        allowedActions: ['VIEW', 'ARCHIVE'],
      });
      await activationRequest.promise;
    });

    const readOnlyDetail = screen.getByRole('region', { name: VALID_DRAFT.name });
    expect(within(readOnlyDetail).getByText('Active')).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Campaign details' })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps the saved Draft editable when activation is cancelled', async () => {
    const user = userEvent.setup();
    const activateCampaign = vi.fn();

    renderPage(VALID_DRAFT, { activateCampaign });

    await user.click(await screen.findByRole('button', { name: 'Activate Campaign' }));

    const dialog = screen.getByRole('dialog', { name: `Activate ${VALID_DRAFT.name}?` });

    expect(activateCampaign).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: 'Keep Editing' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(activateCampaign).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: 'Campaign name' })).toHaveValue(VALID_DRAFT.name);
  });

  it('closes confirmation and offers authoritative reload for a changed Draft', async () => {
    const user = userEvent.setup();
    const activateCampaign = vi
      .fn()
      .mockRejectedValue(new CampaignManagementClientError('CAMPAIGN_CHANGED'));

    renderPage(VALID_DRAFT, { activateCampaign });

    await user.click(await screen.findByRole('button', { name: 'Activate Campaign' }));

    const dialog = screen.getByRole('dialog', { name: `Activate ${VALID_DRAFT.name}?` });

    await user.click(within(dialog).getByRole('button', { name: 'Activate Campaign' }));

    expect(
      await screen.findByText('This Draft has changed since you opened it.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload Draft' })).toBeEnabled();
  });

  it('offers authoritative reload after an Archive conflict', async () => {
    const user = userEvent.setup();
    const archiveCampaign = vi
      .fn()
      .mockRejectedValue(new CampaignManagementClientError('CAMPAIGN_CHANGED'));

    renderPage(ACTIVE_CAMPAIGN, { archiveCampaign });

    await user.click(await screen.findByRole('button', { name: 'Archive Campaign' }));

    const dialog = screen.getByRole('dialog', { name: `Archive ${ACTIVE_CAMPAIGN.name}?` });

    await user.click(within(dialog).getByRole('button', { name: 'Archive Campaign' }));

    expect(
      await screen.findByText('This Campaign has changed since you opened it.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload Campaign' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Archive Campaign' })).toBeEnabled();
  });

  it('locks Campaign mutation controls after a forbidden lifecycle response', async () => {
    const user = userEvent.setup();
    const activateCampaign = vi.fn().mockRejectedValue(
      new CampaignManagementClientError('FORBIDDEN', {
        status: 403,
        message: 'Missing required permission: MANAGE_CAMPAIGNS',
      }),
    );

    renderPage(VALID_DRAFT, { activateCampaign });

    await user.click(await screen.findByRole('button', { name: 'Activate Campaign' }));
    await user.click(
      within(screen.getByRole('dialog', { name: `Activate ${VALID_DRAFT.name}?` })).getByRole(
        'button',
        { name: 'Activate Campaign' },
      ),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your Campaign permissions have changed. You no longer have permission to make changes.',
    );
    expect(screen.getByRole('textbox', { name: 'Campaign name' })).toBeDisabled();
    expect(
      screen.getByRole('combobox', { name: 'Requirement for Password safety quiz' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Remove Password safety quiz from Campaign' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Activate Campaign' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Activate Campaign' }));
    expect(activateCampaign).toHaveBeenCalledOnce();
  });
});

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  GetPlatformCampaignsResponseDto,
  PlatformCampaignSummaryDto,
  TraineeCampaignSummaryDto,
} from '@insightful-phish/shared';
import CampaignsPage from '../CampaignsPage';
import {
  discoverPlatformCampaigns,
  enrolPlatformCampaign,
  getTraineeCampaignDetail,
  getTraineeCampaigns,
} from '../../lib/campaignsApi';
import { createDeferred } from '../../testing/render';

const navigateMock = vi.fn();
const authState = vi.hoisted(() => ({
  role: 'ORGANISATION_TRAINEE' as 'ORGANISATION_TRAINEE' | 'GENERAL_TRAINEE',
}));

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({
    authContext: { role: authState.role },
    user: null,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../components/layout/AppLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../components/ui/CampaignAccordion', () => ({
  default: ({
    subtitle,
    status,
    nextAction,
    accentColor,
    children,
    isOpen,
    onToggle,
  }: {
    subtitle: string;
    status: string;
    nextAction: string;
    accentColor: string;
    children?: ReactNode;
    isOpen: boolean;
    onToggle: () => void;
  }) => (
    <section
      data-testid={`campaign-${subtitle}`}
      data-accent-color={accentColor}
      data-status={status}
      data-open={String(isOpen)}
    >
      <button type="button" onClick={onToggle}>
        {subtitle}
      </button>
      <span data-testid={`status-${subtitle}`}>{status}</span>
      <span data-testid={`next-action-${subtitle}`}>{nextAction}</span>
      {isOpen ? <div>{children}</div> : null}
    </section>
  ),
}));

vi.mock('../../components/ui/TrainingPartAccordion', () => ({
  default: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../components/ui/TrainingActionRow', () => ({
  default: ({
    label,
    onClick,
    disabled,
  }: {
    label: string;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {label}
    </button>
  ),
}));

vi.mock('../../lib/campaignsApi', () => ({
  getTraineeCampaigns: vi.fn(),
  getTraineeCampaignDetail: vi.fn(),
  discoverPlatformCampaigns: vi.fn(),
  enrolPlatformCampaign: vi.fn(),
}));

const mockedGetTraineeCampaigns = vi.mocked(getTraineeCampaigns);
const mockedGetTraineeCampaignDetail = vi.mocked(getTraineeCampaignDetail);
const mockedDiscoverPlatformCampaigns = vi.mocked(discoverPlatformCampaigns);
const mockedEnrolPlatformCampaign = vi.mocked(enrolPlatformCampaign);

function buildMockCampaign(
  campaignId: string,
  name: string,
  progressStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CLASSIFIED' | 'SUBMITTED',
  accentColor?: string,
  nextItem?: TraineeCampaignSummaryDto['nextItem'],
): TraineeCampaignSummaryDto {
  return {
    campaignId,
    name,
    campaignType: 'PREMADE_GENERAL',
    difficultyLevel: 'BEGINNER',
    status: 'ACTIVE',
    progressStatus,
    accentColor,
    nextItem,
    eligibility: {
      canView: true,
      canProgress: true,
      reason: 'AVAILABLE',
    },
  };
}

function buildPlatformCampaign(
  overrides: Partial<PlatformCampaignSummaryDto> = {},
): PlatformCampaignSummaryDto {
  return {
    campaignId: '77777777-7777-4777-8777-777777777777',
    name: 'Platform Safety Basics',
    campaignType: 'PREMADE_GENERAL',
    difficultyLevel: 'BEGINNER',
    status: 'ACTIVE',
    isEnrolled: false,
    progressStatus: null,
    eligibility: {
      canView: true,
      canProgress: true,
      reason: 'AVAILABLE',
    },
    ...overrides,
  };
}

function buildDiscoveryResponse(
  items: PlatformCampaignSummaryDto[],
): GetPlatformCampaignsResponseDto {
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

describe('CampaignsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.role = 'ORGANISATION_TRAINEE';
    mockedDiscoverPlatformCampaigns.mockResolvedValue(buildDiscoveryResponse([]));

    mockedGetTraineeCampaigns.mockResolvedValue({
      campaigns: [
        buildMockCampaign(
          '11111111-1111-4111-8111-111111111111',
          'Quarterly Awareness',
          'IN_PROGRESS',
          '#2563EB',
          {
            campaignItemId: '33333333-3333-4333-8333-333333333334',
            title: 'Phishing Basics Quiz',
            componentType: 'QUIZ',
            progressStatus: 'NOT_STARTED',
          },
        ),
      ],
    });

    mockedGetTraineeCampaignDetail.mockResolvedValue({
      campaignId: '11111111-1111-4111-8111-111111111111',
      name: 'Quarterly Awareness',
      campaignType: 'PREMADE_GENERAL',
      difficultyLevel: 'BEGINNER',
      status: 'ACTIVE',
      progressStatus: 'IN_PROGRESS',
      eligibility: {
        canView: true,
        canProgress: true,
        reason: 'AVAILABLE',
      },
      items: [
        {
          campaignItemId: '33333333-3333-4333-8333-333333333333',
          campaignId: '11111111-1111-4111-8111-111111111111',
          itemType: 'COMPONENT',
          title: 'Read phishing warning signs',
          position: 0,
          isRequired: true,
          availabilityStatus: 'AVAILABLE',
          isOpenable: true,
          progressStatus: 'NOT_STARTED',
          componentType: 'TRAINING_DOCUMENT',
          activityApiPath:
            '/trainee/campaign-items/33333333-3333-4333-8333-333333333333/training-document',
          eligibility: {
            canView: true,
            canProgress: true,
            reason: 'AVAILABLE',
          },
          trainingDocument: {
            id: '44444444-4444-4444-8444-444444444441',
            title: 'Phishing warning signs',
            contentSummary: 'Learn how to spot suspicious messages.',
            estimatedReadTimeMinutes: 4,
            difficultyLevel: 'BEGINNER',
            status: 'AVAILABLE',
          },
        },
        {
          campaignItemId: '33333333-3333-4333-8333-333333333334',
          campaignId: '11111111-1111-4111-8111-111111111111',
          itemType: 'COMPONENT',
          title: 'Phishing basics quiz',
          position: 1,
          isRequired: true,
          availabilityStatus: 'AVAILABLE',
          isOpenable: true,
          progressStatus: 'NOT_STARTED',
          componentType: 'QUIZ',
          activityApiPath: '/trainee/campaign-items/33333333-3333-4333-8333-333333333334/quiz',
          eligibility: {
            canView: true,
            canProgress: true,
            reason: 'AVAILABLE',
          },
          quiz: {
            id: '55555555-5555-4555-8555-555555555551',
            title: 'Phishing basics quiz',
            passThresholdPercentage: 70,
            difficultyLevel: 'BEGINNER',
            status: 'PUBLISHED',
          },
        },
        {
          campaignItemId: '33333333-3333-4333-8333-333333333335',
          campaignId: '11111111-1111-4111-8111-111111111111',
          itemType: 'COMPONENT',
          title: 'Classify simulated emails',
          position: 2,
          isRequired: true,
          availabilityStatus: 'AVAILABLE',
          isOpenable: true,
          progressStatus: 'NOT_STARTED',
          componentType: 'SIMULATED_INBOX',
          activityApiPath:
            '/trainee/campaign-items/33333333-3333-4333-8333-333333333335/simulated-inbox',
          eligibility: {
            canView: true,
            canProgress: true,
            reason: 'AVAILABLE',
          },
          simulation: {
            id: '66666666-6666-4666-8666-666666666661',
            title: 'Inbox simulation',
            description: 'Review the seeded simulated inbox activity.',
            difficultyLevel: 'BEGINNER',
          },
        },
      ],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('uses campaign accent colour from the API when present', async () => {
    render(<CampaignsPage />);
    const campaign = await screen.findByTestId('campaign-Quarterly Awareness');
    expect(campaign).toHaveAttribute('data-accent-color', '#2563EB');
  });

  it('shows the specific next campaign item', async () => {
    render(<CampaignsPage />);

    expect(await screen.findByTestId('next-action-Quarterly Awareness')).toHaveTextContent(
      'Start Phishing Basics Quiz',
    );
  });

  it('falls back to the local accent colour palette when the API omits accent colour', async () => {
    mockedGetTraineeCampaigns.mockResolvedValue({
      campaigns: [
        buildMockCampaign(
          '11111111-1111-4111-8111-111111111111',
          'Quarterly Awareness',
          'IN_PROGRESS',
        ),
      ],
    });

    render(<CampaignsPage />);

    const campaign = await screen.findByTestId('campaign-Quarterly Awareness');

    expect(campaign).toHaveAttribute('data-accent-color', '#00FFA6');
  });

  it('routes training document campaign items to the frontend training page', async () => {
    render(<CampaignsPage />);

    const campaignToggle = await screen.findByRole('button', {
      name: /quarterly awareness/i,
    });

    fireEvent.click(campaignToggle);

    const trainingRow = await screen.findByRole('button', {
      name: /learn: "read phishing warning signs"/i,
    });

    fireEvent.click(trainingRow);

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/training/33333333-3333-4333-8333-333333333333');
    });
  });

  it('routes quiz campaign items to the frontend quiz page', async () => {
    render(<CampaignsPage />);

    const campaignToggle = await screen.findByRole('button', {
      name: /quarterly awareness/i,
    });

    fireEvent.click(campaignToggle);

    const quizRow = await screen.findByRole('button', {
      name: /quiz: "phishing basics quiz"/i,
    });

    fireEvent.click(quizRow);

    await waitFor(() => {
      expect(mockedGetTraineeCampaigns).toHaveBeenCalled();

      expect(mockedGetTraineeCampaignDetail).toHaveBeenCalledWith(
        '11111111-1111-4111-8111-111111111111',
      );

      expect(navigateMock).toHaveBeenCalledWith('/quizzes/33333333-3333-4333-8333-333333333334');
    });
  });

  it('routes simulated inbox campaign items to the trainee simulated inbox page', async () => {
    render(<CampaignsPage />);

    const campaignToggle = await screen.findByRole('button', {
      name: /quarterly awareness/i,
    });

    fireEvent.click(campaignToggle);

    const simulationRow = await screen.findByRole('button', {
      name: /simulation: classify simulated emails/i,
    });

    expect(simulationRow).not.toBeDisabled();

    fireEvent.click(simulationRow);

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(
        '/trainee/campaign-items/33333333-3333-4333-8333-333333333335/simulated-inbox',
      );
    });
  });

  it('formats campaign progress statuses in readable Title Case', async () => {
    mockedGetTraineeCampaigns.mockResolvedValue({
      campaigns: [
        buildMockCampaign(
          '11111111-1111-4111-8111-111111111111',
          'Completed Campaign',
          'COMPLETED',
        ),
        buildMockCampaign(
          '22222222-2222-4222-8222-222222222222',
          'Not Started Campaign',
          'NOT_STARTED',
        ),
        buildMockCampaign(
          '33333333-3333-4333-8333-333333333333',
          'In Progress Campaign',
          'IN_PROGRESS',
        ),
        buildMockCampaign(
          '44444444-4444-4444-8444-444444444444',
          'Classified Campaign',
          'CLASSIFIED',
        ),
        buildMockCampaign(
          '55555555-5555-4555-8555-555555555555',
          'Submitted Campaign',
          'SUBMITTED',
        ),
        buildMockCampaign(
          '66666666-6666-4666-8666-666666666666',
          'Unknown Progress Campaign',
          'SOMETHING_ELSE' as unknown as 'NOT_STARTED',
        ),
      ],
    });

    render(<CampaignsPage />);

    expect(await screen.findByTestId('status-Completed Campaign')).toHaveTextContent('Completed');
    expect(await screen.findByTestId('status-Not Started Campaign')).toHaveTextContent(
      'Not Started',
    );
    expect(await screen.findByTestId('status-In Progress Campaign')).toHaveTextContent(
      'In Progress',
    );
    expect(await screen.findByTestId('status-Classified Campaign')).toHaveTextContent('Classified');
    expect(await screen.findByTestId('status-Submitted Campaign')).toHaveTextContent('Submitted');
    expect(await screen.findByTestId('status-Unknown Progress Campaign')).toHaveTextContent(
      'Unknown',
    );
  });

  it('shows platform campaign discovery to a general trainee', async () => {
    authState.role = 'GENERAL_TRAINEE';
    mockedGetTraineeCampaigns.mockResolvedValue({ campaigns: [] });

    render(<CampaignsPage />);

    expect(
      await screen.findByRole('region', { name: /discover platform campaigns/i }),
    ).toBeInTheDocument();
    expect(mockedDiscoverPlatformCampaigns).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
    });
    expect(
      await screen.findByText('NO PLATFORM CAMPAIGNS ARE AVAILABLE RIGHT NOW.'),
    ).toBeInTheDocument();
  });

  it('does not request platform discovery for an organisation trainee', async () => {
    render(<CampaignsPage />);

    await screen.findByTestId('campaign-Quarterly Awareness');

    expect(
      screen.queryByRole('region', {
        name: /discover platform campaigns/i,
      }),
    ).not.toBeInTheDocument();
    expect(mockedDiscoverPlatformCampaigns).not.toHaveBeenCalled();
  });

  it('shows a platform discovery error to a general trainee', async () => {
    authState.role = 'GENERAL_TRAINEE';
    mockedDiscoverPlatformCampaigns.mockRejectedValueOnce(new Error('network unavailable'));

    render(<CampaignsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'FAILED TO LOAD PLATFORM CAMPAIGNS. TRY AGAIN.',
    );
  });

  it('enrols once during rapid interaction and opens the normal campaign journey', async () => {
    authState.role = 'GENERAL_TRAINEE';
    const campaignId = '77777777-7777-4777-8777-777777777777';
    const platformCampaign = buildPlatformCampaign();
    const enrolment = createDeferred<TraineeCampaignSummaryDto>();

    mockedDiscoverPlatformCampaigns.mockResolvedValue(buildDiscoveryResponse([platformCampaign]));
    mockedGetTraineeCampaigns.mockResolvedValueOnce({ campaigns: [] }).mockResolvedValueOnce({
      campaigns: [buildMockCampaign(campaignId, 'Platform Safety Basics', 'NOT_STARTED')],
    });
    mockedEnrolPlatformCampaign.mockReturnValueOnce(enrolment.promise);

    render(<CampaignsPage />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Platform Safety Basics',
      }),
    );

    const enrolButton = screen.getByRole('button', {
      name: /enrol: platform safety basics/i,
    });

    fireEvent.click(enrolButton);

    expect(enrolButton).toBeDisabled();

    fireEvent.click(enrolButton);

    expect(mockedEnrolPlatformCampaign).toHaveBeenCalledTimes(1);
    expect(mockedEnrolPlatformCampaign).toHaveBeenCalledWith({
      campaignId,
    });

    enrolment.resolve(buildMockCampaign(campaignId, 'Platform Safety Basics', 'NOT_STARTED'));

    await waitFor(() => {
      expect(mockedGetTraineeCampaignDetail).toHaveBeenCalledTimes(1);
      expect(mockedGetTraineeCampaignDetail).toHaveBeenCalledWith(campaignId);
      expect(
        screen
          .getAllByTestId('campaign-Platform Safety Basics')
          .some(
            (campaign) =>
              campaign.getAttribute('data-status') === 'Not Started' &&
              campaign.getAttribute('data-open') === 'true',
          ),
      ).toBe(true);
    });
  });

  it('opens an already-enrolled campaign without posting another enrolment', async () => {
    authState.role = 'GENERAL_TRAINEE';
    const campaignId = '77777777-7777-4777-8777-777777777777';

    mockedDiscoverPlatformCampaigns.mockResolvedValue(
      buildDiscoveryResponse([
        buildPlatformCampaign({
          isEnrolled: true,
        }),
      ]),
    );
    mockedGetTraineeCampaigns.mockResolvedValueOnce({ campaigns: [] }).mockResolvedValueOnce({
      campaigns: [buildMockCampaign(campaignId, 'Platform Safety Basics', 'IN_PROGRESS')],
    });

    render(<CampaignsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Platform Safety Basics' }));

    const continueButton = screen.getByRole('button', {
      name: /continue: platform safety basics/i,
    });

    expect(continueButton).toBeEnabled();

    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(mockedGetTraineeCampaignDetail).toHaveBeenCalledWith(campaignId);
      expect(
        screen
          .getAllByTestId('campaign-Platform Safety Basics')
          .some(
            (campaign) =>
              campaign.getAttribute('data-status') === 'In Progress' &&
              campaign.getAttribute('data-open') === 'true',
          ),
      ).toBe(true);
    });
    expect(mockedEnrolPlatformCampaign).not.toHaveBeenCalled();
  });

  it('does not enrol in an unavailable future campaign', async () => {
    authState.role = 'GENERAL_TRAINEE';

    mockedDiscoverPlatformCampaigns.mockResolvedValue(
      buildDiscoveryResponse([
        buildPlatformCampaign({
          startDate: '2999-01-01T00:00:00.000Z',
        }),
      ]),
    );

    render(<CampaignsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Platform Safety Basics' }));

    const enrolButton = screen.getByRole('button', {
      name: /enrol: platform safety basics/i,
    });

    expect(screen.getByTestId('status-Platform Safety Basics')).toHaveTextContent('UNAVAILABLE');
    expect(enrolButton).toBeDisabled();

    fireEvent.click(enrolButton);

    expect(mockedEnrolPlatformCampaign).not.toHaveBeenCalled();
  });
});

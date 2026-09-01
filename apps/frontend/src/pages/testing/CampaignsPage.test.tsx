import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CampaignsPage from '../CampaignsPage';
import { getTraineeCampaignDetail, getTraineeCampaigns } from '../../lib/campaignsApi';

const navigateMock = vi.fn();

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
    accentColor,
    children,
    isOpen,
    onToggle,
  }: {
    subtitle: string;
    status: string;
    accentColor: string;
    children?: ReactNode;
    isOpen: boolean;
    onToggle: () => void;
  }) => (
    <section
      data-testid={`campaign-${subtitle}`}
      data-accent-color={accentColor}
      data-status={status}
    >
      <button type="button" onClick={onToggle}>
        {subtitle}
      </button>
      <span data-testid={`status-${subtitle}`}>{status}</span>
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
}));

const mockedGetTraineeCampaigns = vi.mocked(getTraineeCampaigns);
const mockedGetTraineeCampaignDetail = vi.mocked(getTraineeCampaignDetail);

describe('CampaignsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedGetTraineeCampaigns.mockResolvedValue({
      campaigns: [
        {
          campaignId: '11111111-1111-4111-8111-111111111111',
          name: 'Quarterly Awareness',
          accentColor: '#2563EB',
          campaignType: 'PREMADE_GENERAL',
          difficultyLevel: 'BEGINNER',
          status: 'ACTIVE',
          progressStatus: 'IN_PROGRESS',
          eligibility: {
            canView: true,
            canProgress: true,
            reason: 'AVAILABLE',
          },
        },
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

  it('falls back to the local accent colour palette when the API omits accent colour', async () => {
    mockedGetTraineeCampaigns.mockResolvedValue({
      campaigns: [
        {
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
        },
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

  it('formats every shared progress status value correctly and defaults unknown values to UNKNOWN', async () => {
    mockedGetTraineeCampaigns.mockResolvedValue({
      campaigns: [
        {
          campaignId: '11111111-1111-4111-8111-111111111111',
          name: 'Completed Campaign',
          campaignType: 'PREMADE_GENERAL',
          difficultyLevel: 'BEGINNER',
          status: 'ACTIVE',
          progressStatus: 'COMPLETED',
          eligibility: { canView: true, canProgress: true, reason: 'AVAILABLE' },
        },
        {
          campaignId: '22222222-2222-4222-8222-222222222222',
          name: 'Not Started Campaign',
          campaignType: 'PREMADE_GENERAL',
          difficultyLevel: 'BEGINNER',
          status: 'ACTIVE',
          progressStatus: 'NOT_STARTED',
          eligibility: { canView: true, canProgress: true, reason: 'AVAILABLE' },
        },
        {
          campaignId: '33333333-3333-4333-8333-333333333333',
          name: 'In Progress Campaign',
          campaignType: 'PREMADE_GENERAL',
          difficultyLevel: 'BEGINNER',
          status: 'ACTIVE',
          progressStatus: 'IN_PROGRESS',
          eligibility: { canView: true, canProgress: true, reason: 'AVAILABLE' },
        },
        {
          campaignId: '44444444-4444-4444-8444-444444444444',
          name: 'Classified Campaign',
          campaignType: 'PREMADE_GENERAL',
          difficultyLevel: 'BEGINNER',
          status: 'ACTIVE',
          progressStatus: 'CLASSIFIED',
          eligibility: { canView: true, canProgress: true, reason: 'AVAILABLE' },
        },
        {
          campaignId: '55555555-5555-4555-8555-555555555555',
          name: 'Submitted Campaign',
          campaignType: 'PREMADE_GENERAL',
          difficultyLevel: 'BEGINNER',
          status: 'ACTIVE',
          progressStatus: 'SUBMITTED',
          eligibility: { canView: true, canProgress: true, reason: 'AVAILABLE' },
        },
        {
          campaignId: '66666666-6666-4666-8666-666666666666',
          name: 'Unknown Progress Campaign',
          campaignType: 'PREMADE_GENERAL',
          difficultyLevel: 'BEGINNER',
          status: 'ACTIVE',
          progressStatus: 'SOMETHING_ELSE' as unknown as 'NOT_STARTED',
          eligibility: { canView: true, canProgress: true, reason: 'AVAILABLE' },
        },
      ],
    });

    render(<CampaignsPage />);

    expect(await screen.findByTestId('status-Completed Campaign')).toHaveTextContent('COMPLETED');
    expect(await screen.findByTestId('status-Not Started Campaign')).toHaveTextContent('NOT STARTED');
    expect(await screen.findByTestId('status-In Progress Campaign')).toHaveTextContent('STARTED');
    expect(await screen.findByTestId('status-Classified Campaign')).toHaveTextContent('STARTED');
    expect(await screen.findByTestId('status-Submitted Campaign')).toHaveTextContent('STARTED');
    expect(await screen.findByTestId('status-Unknown Progress Campaign')).toHaveTextContent('UNKNOWN');
  });
});

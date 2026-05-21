import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
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
    children,
    isOpen,
    onToggle,
  }: {
    subtitle: string;
    children?: ReactNode;
    isOpen: boolean;
    onToggle: () => void;
  }) => (
    <section>
      <button type="button" onClick={onToggle}>
        {subtitle}
      </button>
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
          campaignType: 'PREMADE_GENERAL',
          difficultyLevel: 'BEGINNER',
          status: 'ACTIVE',
          progressStatus: 'IN_PROGRESS',
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
      items: [
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
          quiz: {
            id: '55555555-5555-4555-8555-555555555551',
            title: 'Phishing basics quiz',
            passThresholdPercentage: 70,
            difficultyLevel: 'BEGINNER',
            status: 'PUBLISHED',
          },
        },
      ],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('routes quiz campaign items to the frontend quiz page', async () => {
    render(<CampaignsPage />);

    const campaignToggle = await screen.findByRole('button', { name: /quarterly awareness/i });
    fireEvent.click(campaignToggle);

    const quizRow = await screen.findByRole('button', { name: /quiz: "phishing basics quiz"/i });
    fireEvent.click(quizRow);

    await waitFor(() => {
      expect(mockedGetTraineeCampaigns).toHaveBeenCalled();
      expect(mockedGetTraineeCampaignDetail).toHaveBeenCalledWith(
        '11111111-1111-4111-8111-111111111111',
      );
      expect(navigateMock).toHaveBeenCalledWith('/quizzes/33333333-3333-4333-8333-333333333334');
    });
  });
});

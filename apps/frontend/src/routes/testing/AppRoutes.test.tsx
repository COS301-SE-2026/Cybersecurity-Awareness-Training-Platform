import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithRouter } from '../../testing/render';

vi.mock('../../App', () => ({
  StatusPage: () => <h1>Status Page</h1>,
  default: () => null,
}));

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

vi.mock('../../pages/InboxPage', () => ({
  default: () => <h1>Simulated Email Inbox</h1>,
}));

vi.mock('../../pages/EmailDetailPage', () => ({
  default: () => <h1>Simulated Email</h1>,
}));

vi.mock('../../pages/TrainingDocumentPage', () => ({
  default: () => <h1>Training Document Page</h1>,
}));

vi.mock('../../pages/QuizPage', () => ({
  default: () => <h1>Quiz Page</h1>,
}));

vi.mock('../../pages/ResultsPage', () => ({
  default: () => <h1>Quiz Results</h1>,
}));

vi.mock('../../lib/campaignsApi', () => ({
  getTraineeCampaigns: vi.fn(),
  getTraineeCampaignDetail: vi.fn(),
}));

import AppRoutes from '../AppRoutes';
import { getTraineeCampaignDetail, getTraineeCampaigns } from '../../lib/campaignsApi';

const mockedGetTraineeCampaigns = vi.mocked(getTraineeCampaigns);
const mockedGetTraineeCampaignDetail = vi.mocked(getTraineeCampaignDetail);

const CAMPAIGN_ID = '11111111-1111-4111-8111-111111111111';
const TRAINING_CAMPAIGN_ITEM_ID = '33333333-3333-4333-8333-333333333333';
const QUIZ_CAMPAIGN_ITEM_ID = '33333333-3333-4333-8333-333333333334';
const ATTEMPT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function LocationDisplay() {
  const location = useLocation();

  return <div data-testid="location-path">{location.pathname}</div>;
}

function renderAppRoutes({
  initialEntry,
  isAuthenticated = true,
}: {
  initialEntry: string;
  isAuthenticated?: boolean;
}) {
  return renderWithRouter(
    <>
      <LocationDisplay />
      <AppRoutes />
    </>,
    {
      initialEntry,
      auth: {
        isAuthenticated,
        token: isAuthenticated ? 'demo-token' : null,
        user: isAuthenticated
          ? {
              firstName: 'Jane',
              lastName: 'Doe',
              email: 'trainee@example.com',
            }
          : null,
      },
    },
  );
}

describe('AppRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedGetTraineeCampaigns.mockResolvedValue({
      campaigns: [
        {
          campaignId: CAMPAIGN_ID,
          name: 'Quarterly Awareness',
          campaignType: 'PREMADE_GENERAL',
          difficultyLevel: 'BEGINNER',
          status: 'ACTIVE',
          progressStatus: 'IN_PROGRESS',
        },
      ],
    });

    mockedGetTraineeCampaignDetail.mockResolvedValue({
      campaignId: CAMPAIGN_ID,
      name: 'Quarterly Awareness',
      campaignType: 'PREMADE_GENERAL',
      difficultyLevel: 'BEGINNER',
      status: 'ACTIVE',
      progressStatus: 'IN_PROGRESS',
      items: [],
    });
  });

  it('renders the login screen at /login', async () => {
    renderAppRoutes({
      initialEntry: '/login',
      isAuthenticated: false,
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: /welcome back/i }),
    ).toBeInTheDocument();
  });

  it('renders the register screen at /register', async () => {
    renderAppRoutes({
      initialEntry: '/register',
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: /^welcome$/i }),
    ).toBeInTheDocument();
  });

  it('renders the campaigns screen at /campaigns', async () => {
    renderAppRoutes({
      initialEntry: '/campaigns',
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: /campaigns/i }),
    ).toBeInTheDocument();
  });

  it('renders the simulated inbox at the mounted inbox route', async () => {
    renderAppRoutes({
      initialEntry: `/trainee/campaign-items/${TRAINING_CAMPAIGN_ITEM_ID}/simulated-inbox`,
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: /simulated email inbox/i }),
    ).toBeInTheDocument();
  });

  it('renders the simulated email detail at the mounted email detail route', async () => {
    renderAppRoutes({
      initialEntry: `/trainee/campaign-items/${TRAINING_CAMPAIGN_ITEM_ID}/simulated-emails/email-123`,
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: /simulated email/i }),
    ).toBeInTheDocument();
  });

  it('renders the training document page at the mounted training route', async () => {
    renderAppRoutes({
      initialEntry: `/training/${TRAINING_CAMPAIGN_ITEM_ID}`,
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: /training document page/i }),
    ).toBeInTheDocument();
  });

  it('renders the quiz page at /quizzes/:quizId', async () => {
    renderAppRoutes({
      initialEntry: `/quizzes/${QUIZ_CAMPAIGN_ITEM_ID}`,
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: /quiz page/i }),
    ).toBeInTheDocument();
  });

  it('renders the quiz results page at /quiz-attempts/:attemptId/results', async () => {
    renderAppRoutes({
      initialEntry: `/quiz-attempts/${ATTEMPT_ID}/results`,
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: /quiz results/i }),
    ).toBeInTheDocument();
  });

  it('navigates from a campaign training item to the mounted frontend training route, not the backend activity path', async () => {
    const user = userEvent.setup();
    const backendTrainingApiPath = `/trainee/campaign-items/${TRAINING_CAMPAIGN_ITEM_ID}/training-document`;
    const frontendTrainingPath = `/training/${TRAINING_CAMPAIGN_ITEM_ID}`;

    mockedGetTraineeCampaignDetail.mockResolvedValueOnce({
      campaignId: CAMPAIGN_ID,
      name: 'Quarterly Awareness',
      campaignType: 'PREMADE_GENERAL',
      difficultyLevel: 'BEGINNER',
      status: 'ACTIVE',
      progressStatus: 'IN_PROGRESS',
      items: [
        {
          campaignItemId: TRAINING_CAMPAIGN_ITEM_ID,
          campaignId: CAMPAIGN_ID,
          itemType: 'COMPONENT',
          title: 'Read phishing warning signs',
          position: 0,
          isRequired: true,
          availabilityStatus: 'AVAILABLE',
          isOpenable: true,
          progressStatus: 'NOT_STARTED',
          componentType: 'TRAINING_DOCUMENT',
          activityApiPath: backendTrainingApiPath,
          trainingDocument: {
            id: '44444444-4444-4444-8444-444444444441',
            title: 'Phishing warning signs',
            contentSummary: 'Learn how to spot suspicious messages.',
            estimatedReadTimeMinutes: 4,
            difficultyLevel: 'BEGINNER',
            status: 'AVAILABLE',
          },
        },
      ],
    });

    renderAppRoutes({
      initialEntry: '/campaigns',
    });

    await user.click(
      await screen.findByRole('button', {
        name: /quarterly awareness/i,
      }),
    );

    await user.click(
      await screen.findByRole('button', {
        name: /learn: "read phishing warning signs"/i,
      }),
    );

    await waitFor(() => {
      expect(screen.getByTestId('location-path')).toHaveTextContent(frontendTrainingPath);
    });

    expect(screen.getByTestId('location-path')).not.toHaveTextContent(backendTrainingApiPath);
    expect(
      await screen.findByRole('heading', { level: 1, name: /training document page/i }),
    ).toBeInTheDocument();
  });

  // unknown route redirects to '/'
  it('redirects unknown routes to /', async () => {
    renderAppRoutes({
      initialEntry: '/not-a-real-route',
    });

    await waitFor(() => {
      expect(screen.getByTestId('location-path')).toHaveTextContent('/');
    });

    expect(await screen.findByText(/DON'T TAKE THE BAIT/i)).toBeInTheDocument();
  });

  // unauthenticated users redirected to '/'
  it('redirects unauthenticated users to the landing page', async () => {
    renderAppRoutes({
      initialEntry: '/campaigns',
      isAuthenticated: false,
    });

    await waitFor(() => {
      expect(screen.getByTestId('location-path')).toHaveTextContent('/');
    });
  });

  it('redirects authenticated users away from the login page', async () => {
    renderAppRoutes({
      initialEntry: '/login',
      isAuthenticated: true,
    });

    await waitFor(() => {
      expect(screen.getByTestId('location-path')).toHaveTextContent('/campaigns');
    });
  });
});

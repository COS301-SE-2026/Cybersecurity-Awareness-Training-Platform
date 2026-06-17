import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type {
  GetTrainingDocumentResponseDto,
  GetTraineeCampaignDetailResponseDto,
  GetTraineeCampaignsResponseDto,
  TraineeCampaignComponentItemSummaryDto,
} from '@insightful-phish/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TrainingDocumentPage from '../TrainingDocumentPage';

const getTrainingMock = vi.fn();
const viewedMock = vi.fn();
const completedMock = vi.fn();
const getCampaignsMock = vi.fn();
const getCampaignDetailMock = vi.fn();

const CAMPAIGN_ITEM_ID = '33333333-3333-4333-8333-333333333333';
const CAMPAIGN_ID = 'campaign-001';
const CAMPAIGN_ASSIGNMENT_ID = 'assignment-001';
const ASSIGNED_AT = '2026-05-20T08:00:00.000Z';
const BACKEND_MARKDOWN_CONTENT = `# Backend phishing content

Backend markdown should take priority over the demo fallback.

## Verify before you act

- Slow down before you click.
- Confirm the sender and destination.
`;

function createAssignmentSummary() {
  return {
    assignmentId: CAMPAIGN_ASSIGNMENT_ID,
    assignmentStatus: 'ASSIGNED',
    accessType: 'ASSIGNED',
    currentCampaignItemId: CAMPAIGN_ITEM_ID,
    assignedAt: ASSIGNED_AT,
    dueDate: null,
    startedAt: null,
    completedAt: null,
  } as const;
}

function createTrainingCampaignItem(
  overrides: Partial<TraineeCampaignComponentItemSummaryDto> = {},
): TraineeCampaignComponentItemSummaryDto {
  return {
    campaignItemId: CAMPAIGN_ITEM_ID,
    campaignId: CAMPAIGN_ID,
    itemType: 'COMPONENT',
    componentType: 'TRAINING_DOCUMENT',
    groupType: null,
    completionRule: null,
    title: 'Read phishing warning signs',
    description: 'Training document',
    position: 1000,
    isRequired: true,
    availabilityStatus: 'AVAILABLE',
    isOpenable: true,
    activityApiPath: `/trainee/campaign-items/${CAMPAIGN_ITEM_ID}/training-document`,
    progressStatus: 'NOT_STARTED',
    trainingDocument: null,
    quiz: null,
    simulation: null,
    ...overrides,
  };
}

function createCampaignsResponse(): GetTraineeCampaignsResponseDto {
  return {
    campaigns: [
      {
        campaignId: CAMPAIGN_ID,
        name: 'Demo campaign',
        campaignType: 'PREMADE_GENERAL',
        difficultyLevel: 'BEGINNER',
        status: 'ACTIVE',
        assignment: createAssignmentSummary(),
        progressStatus: 'NOT_STARTED',
      },
    ],
  };
}

function createCampaignDetailResponse(
  overrides: Partial<GetTraineeCampaignDetailResponseDto> = {},
): GetTraineeCampaignDetailResponseDto {
  return {
    campaignId: CAMPAIGN_ID,
    name: 'Demo campaign',
    campaignType: 'PREMADE_GENERAL',
    difficultyLevel: 'BEGINNER',
    status: 'ACTIVE',
    assignment: createAssignmentSummary(),
    items: [createTrainingCampaignItem()],
    ...overrides,
  };
}

function createTrainingDocumentResponse(
  overrides: Partial<GetTrainingDocumentResponseDto> = {},
): GetTrainingDocumentResponseDto {
  return {
    campaignItemId: CAMPAIGN_ITEM_ID,
    campaignAssignmentId: CAMPAIGN_ASSIGNMENT_ID,
    trainingDocument: {
      id: 'training-doc-001',
      title: 'Phishing warning signs',
      contentType: 'HTML',
      contentRef: 'demo://training/phishing-warning-signs',
      content: null,
      contentSummary: 'Learn how to spot suspicious messages.',
      difficultyLevel: 'BEGINNER',
      status: 'AVAILABLE',
    },
    campaignItem: {
      title: 'Read phishing warning signs',
      description: 'Training document',
      position: 1000,
      isRequired: true,
      availabilityStatus: 'AVAILABLE',
    },
    ...overrides,
  };
}

vi.mock('../../components/layout/AppLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../lib/trainingApi', () => ({
  getCampaignItemTrainingDocument: (...args: unknown[]) => getTrainingMock(...args),
  recordTrainingDocumentViewed: (...args: unknown[]) => viewedMock(...args),
  recordTrainingDocumentCompleted: (...args: unknown[]) => completedMock(...args),
}));

vi.mock('../../lib/campaignsApi', () => ({
  getTraineeCampaigns: (...args: unknown[]) => getCampaignsMock(...args),
  getTraineeCampaignDetail: (...args: unknown[]) => getCampaignDetailMock(...args),
}));

describe('TrainingDocumentPage', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    getTrainingMock.mockReset();
    viewedMock.mockReset();
    completedMock.mockReset();
    getCampaignsMock.mockReset();
    getCampaignDetailMock.mockReset();

    getTrainingMock.mockResolvedValue(createTrainingDocumentResponse());

    viewedMock.mockResolvedValue(undefined);
    completedMock.mockResolvedValue(undefined);
    getCampaignsMock.mockResolvedValue(createCampaignsResponse());
    getCampaignDetailMock.mockResolvedValue(createCampaignDetailResponse());
  });

  function renderTrainingDocumentPage() {
    return render(
      <MemoryRouter initialEntries={[`/training/${CAMPAIGN_ITEM_ID}`]}>
        <Routes>
          <Route path="/training/:campaignItemId" element={<TrainingDocumentPage />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('falls back to seeded content when backend content is null', async () => {
    renderTrainingDocumentPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Phishing warning signs' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Phishing messages often try to pressure you/i)).toBeInTheDocument();

    expect(getTrainingMock).toHaveBeenCalledWith(CAMPAIGN_ITEM_ID);

    await waitFor(() => {
      expect(viewedMock).toHaveBeenCalledWith(CAMPAIGN_ITEM_ID);
    });
  });

  it('prefers backend-provided markdown content over the demo fallback', async () => {
    getTrainingMock.mockResolvedValueOnce(
      createTrainingDocumentResponse({
        trainingDocument: {
          id: 'training-doc-001',
          title: 'Phishing warning signs',
          contentType: 'MARKDOWN',
          contentRef: 'demo://training/phishing-warning-signs',
          content: BACKEND_MARKDOWN_CONTENT,
          contentSummary: 'Learn how to spot suspicious messages.',
          difficultyLevel: 'BEGINNER',
          status: 'AVAILABLE',
        },
      }),
    );

    renderTrainingDocumentPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Phishing warning signs' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Backend markdown should take priority/i)).toBeInTheDocument();
    expect(screen.getByText(/Slow down before you click/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/Phishing messages often try to pressure you/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Reference:/i)).not.toBeInTheDocument();
  });

  it('records completion when the trainee marks the document complete', async () => {
    const user = userEvent.setup();

    renderTrainingDocumentPage();

    const button = await screen.findByRole('button', {
      name: /mark as completed/i,
    });

    await user.click(button);

    await waitFor(() => {
      expect(completedMock).toHaveBeenCalledWith(CAMPAIGN_ITEM_ID);
    });

    expect(await screen.findByText(/training completion recorded/i)).toBeInTheDocument();
  });

  it('shows completed state when backend campaign progress already marks the item completed', async () => {
    getCampaignDetailMock.mockResolvedValueOnce({
      ...createCampaignDetailResponse(),
      items: [createTrainingCampaignItem({ progressStatus: 'COMPLETED' })],
    });

    renderTrainingDocumentPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Phishing warning signs' }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Completed' })).toBeDisabled();
    });
  });

  it('still renders content if viewed tracking fails', async () => {
    viewedMock.mockRejectedValueOnce(new Error('tracking failed'));

    renderTrainingDocumentPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Phishing warning signs' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Phishing messages often try to pressure you/i)).toBeInTheDocument();
  });

  it('does not require linked quiz or legacy progress data to render seeded password training content', async () => {
    getTrainingMock.mockResolvedValueOnce(
      createTrainingDocumentResponse({
        trainingDocument: {
          id: 'training-doc-002',
          title: 'Password Security Basics',
          contentType: 'HTML',
          contentRef: 'demo://training/password-security-basics',
          content: null,
          contentSummary: 'Review core password safety habits.',
          difficultyLevel: 'BEGINNER',
          status: 'AVAILABLE',
        },
        campaignItem: {
          title: 'Read password security basics',
          description: 'Training document',
          position: 1000,
          isRequired: true,
          availabilityStatus: 'AVAILABLE',
        },
      }),
    );

    renderTrainingDocumentPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Password Security Basics' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Strong password habits reduce the impact of phishing/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /quiz/i })).not.toBeInTheDocument();
  });
});

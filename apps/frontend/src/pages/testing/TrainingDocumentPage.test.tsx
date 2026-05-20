import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TrainingDocumentPage from '../TrainingDocumentPage';

const getTrainingMock = vi.fn();
const viewedMock = vi.fn();
const completedMock = vi.fn();
const getCampaignsMock = vi.fn();
const getCampaignDetailMock = vi.fn();

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

    getTrainingMock.mockResolvedValue({
      campaignItemId: '33333333-3333-4333-8333-333333333333',
      campaignAssignmentId: 'assignment-001',
      trainingDocument: {
        id: 'training-doc-001',
        title: 'Phishing warning signs',
        contentType: 'HTML',
        contentRef: 'demo://training/phishing-warning-signs',
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
    });

    viewedMock.mockResolvedValue(undefined);
    completedMock.mockResolvedValue(undefined);
    getCampaignsMock.mockResolvedValue({
      campaigns: [
        {
          campaignId: 'campaign-001',
          name: 'Demo campaign',
          campaignType: 'PREMADE_GENERAL',
          difficultyLevel: 'BEGINNER',
          status: 'ACTIVE',
          assignment: {
            assignmentId: 'assignment-001',
            assignmentStatus: 'ASSIGNED',
            accessType: 'DIRECT',
            currentCampaignItemId: '33333333-3333-4333-8333-333333333333',
            assignedAt: '2026-05-20T08:00:00.000Z',
            dueDate: null,
            startedAt: null,
            completedAt: null,
          },
          progressStatus: 'NOT_STARTED',
        },
      ],
    });
    getCampaignDetailMock.mockResolvedValue({
      campaignId: 'campaign-001',
      name: 'Demo campaign',
      campaignType: 'PREMADE_GENERAL',
      difficultyLevel: 'BEGINNER',
      status: 'ACTIVE',
      assignment: {
        assignmentId: 'assignment-001',
        assignmentStatus: 'ASSIGNED',
        accessType: 'DIRECT',
        currentCampaignItemId: '33333333-3333-4333-8333-333333333333',
        assignedAt: '2026-05-20T08:00:00.000Z',
        dueDate: null,
        startedAt: null,
        completedAt: null,
      },
      items: [
        {
          campaignItemId: '33333333-3333-4333-8333-333333333333',
          campaignId: 'campaign-001',
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
          activityApiPath:
            '/trainee/campaign-items/33333333-3333-4333-8333-333333333333/training-document',
          progressStatus: 'NOT_STARTED',
          trainingDocument: null,
          quiz: null,
          simulation: null,
        },
      ],
    });
  });

  function renderTrainingDocumentPage() {
    return render(
      <MemoryRouter initialEntries={['/training/33333333-3333-4333-8333-333333333333']}>
        <Routes>
          <Route path="/training/:campaignItemId" element={<TrainingDocumentPage />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('fetches and displays a campaign item training document', async () => {
    renderTrainingDocumentPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Phishing warning signs' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Phishing messages often try to pressure you/i)).toBeInTheDocument();

    expect(getTrainingMock).toHaveBeenCalledWith('33333333-3333-4333-8333-333333333333');

    await waitFor(() => {
      expect(viewedMock).toHaveBeenCalledWith('33333333-3333-4333-8333-333333333333');
    });
  });

  it('records completion when the learner marks the document complete', async () => {
    const user = userEvent.setup();

    renderTrainingDocumentPage();

    const button = await screen.findByRole('button', {
      name: /mark as completed/i,
    });

    await user.click(button);

    await waitFor(() => {
      expect(completedMock).toHaveBeenCalledWith('33333333-3333-4333-8333-333333333333');
    });

    expect(await screen.findByText(/training completion recorded/i)).toBeInTheDocument();
  });

  it('shows completed state when backend campaign progress already marks the item completed', async () => {
    getCampaignDetailMock.mockResolvedValueOnce({
      campaignId: 'campaign-001',
      name: 'Demo campaign',
      campaignType: 'PREMADE_GENERAL',
      difficultyLevel: 'BEGINNER',
      status: 'ACTIVE',
      assignment: {
        assignmentId: 'assignment-001',
        assignmentStatus: 'ASSIGNED',
        accessType: 'DIRECT',
        currentCampaignItemId: '33333333-3333-4333-8333-333333333333',
        assignedAt: '2026-05-20T08:00:00.000Z',
        dueDate: null,
        startedAt: null,
        completedAt: null,
      },
      items: [
        {
          campaignItemId: '33333333-3333-4333-8333-333333333333',
          campaignId: 'campaign-001',
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
          activityApiPath:
            '/trainee/campaign-items/33333333-3333-4333-8333-333333333333/training-document',
          progressStatus: 'COMPLETED',
          trainingDocument: null,
          quiz: null,
          simulation: null,
        },
      ],
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
    getTrainingMock.mockResolvedValueOnce({
      campaignItemId: '33333333-3333-4333-8333-333333333333',
      campaignAssignmentId: 'assignment-001',
      trainingDocument: {
        id: 'training-doc-002',
        title: 'Password Security Basics',
        contentType: 'HTML',
        contentRef: 'demo://training/password-security-basics',
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
    });

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

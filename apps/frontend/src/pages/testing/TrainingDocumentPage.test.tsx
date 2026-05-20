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

vi.mock('../../components/layout/AppLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../lib/trainingApi', () => ({
  getCampaignItemTrainingDocument: (...args: unknown[]) => getTrainingMock(...args),
  recordTrainingDocumentViewed: (...args: unknown[]) => viewedMock(...args),
  recordTrainingDocumentCompleted: (...args: unknown[]) => completedMock(...args),
}));

describe('TrainingDocumentPage', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    getTrainingMock.mockReset();
    viewedMock.mockReset();
    completedMock.mockReset();

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

  it('still renders content if viewed tracking fails', async () => {
    viewedMock.mockRejectedValueOnce(new Error('tracking failed'));

    renderTrainingDocumentPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Phishing warning signs' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Phishing messages often try to pressure you/i)).toBeInTheDocument();
  });

  it('does not require linked quiz or legacy progress data to render demo content', async () => {
    getTrainingMock.mockResolvedValueOnce({
      campaignItemId: '33333333-3333-4333-8333-333333333333',
      campaignAssignmentId: 'assignment-001',
      trainingDocument: {
        id: 'training-doc-002',
        title: 'Safe link handling',
        contentType: 'HTML',
        contentRef: 'demo://training/safe-link-handling',
        contentSummary: 'Review safe link handling.',
        difficultyLevel: 'BEGINNER',
        status: 'AVAILABLE',
      },
      campaignItem: {
        title: 'Read safe link handling',
        description: 'Training document',
        position: 1000,
        isRequired: true,
        availabilityStatus: 'AVAILABLE',
      },
    });

    renderTrainingDocumentPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Safe link handling' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Before opening a link, confirm that the destination matches/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /quiz/i })).not.toBeInTheDocument();
  });
});

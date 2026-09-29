import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ResultsPage from '../ResultsPage';
import { ApiError } from '../../lib/apiClient';
import { getQuiz, getQuizResult, startQuizAttempt } from '../../lib/quizApi';
import type { CampaignItemQuiz, QuizResult } from '../../lib/quizApi';
import { renderWithRouter, createDeferred } from '../../testing/render';

vi.mock('../../components/layout/AppLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../lib/quizApi', () => ({
  getQuiz: vi.fn(),
  getQuizResult: vi.fn(),
  startQuizAttempt: vi.fn(),
}));

const mockedGetQuiz = vi.mocked(getQuiz);
const mockedGetQuizResult = vi.mocked(getQuizResult);
const mockedStartQuizAttempt = vi.mocked(startQuizAttempt);
const attemptId = 'attempt-123';
const campaignItemId = '33333333-3333-4333-8333-333333333334';

const resultFixture: QuizResult = {
  attemptId,
  quizId: 'quiz-1',
  campaignAssignmentId: 'assignment-1',
  campaignItemId,
  scorePercentage: 83.6,
  passed: true,
  summary: 'Great job identifying the suspicious message and unsafe link.',
  quizTitle: 'Phishing basics quiz',
  attemptHistory: [
    {
      attemptId,
      attemptNumber: 1,
      submittedAt: '2026-09-18T09:00:00.000Z',
      scorePercentage: 83.6,
      passed: true,
    },
  ],
  pointsEarned: 5,
  pointsAvailable: 6,
  feedbackAvailable: true,
  answers: [
    {
      questionId: 'question-1',
      questionPrompt: 'Which message is suspicious?',
      isCorrect: true,
      awardedPoints: 5,
      feedbackShown: 'You correctly identified the phishing indicator.',
      options: [
        {
          optionId: 'option-1',
          label: 'A',
          text: 'Urgent password reset email.',
          isCorrect: true,
          feedbackText: 'This was the suspicious option.',
          selected: true,
        },
      ],
    },
  ],
};

const occurrenceFixture: CampaignItemQuiz = {
  id: resultFixture.quizId,
  campaignItemId,
  title: 'Phishing basics quiz',
  questions: [],
  maxAttempts: 3,
  attemptsRemaining: 1,
  scorePolicy: 'BEST',
  effectiveScorePercentage: 84,
};

function renderResultsPage() {
  return renderWithRouter(<ResultsPage />, {
    initialEntry: `/quiz-attempts/${attemptId}/results`,
    routePath: '/quiz-attempts/:attemptId/results',
  });
}

describe('ResultsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetQuizResult.mockResolvedValue(resultFixture);
    mockedGetQuiz.mockResolvedValue(occurrenceFixture);
  });

  it('shows a loading state before quiz results resolve', async () => {
    const deferred = createDeferred<typeof resultFixture>();

    mockedGetQuizResult.mockReturnValueOnce(deferred.promise);

    renderResultsPage();

    expect(screen.getByRole('heading', { level: 2, name: /loading results/i })).toBeInTheDocument();
    expect(screen.getByText(/your quiz result feedback is being loaded/i)).toBeInTheDocument();

    deferred.resolve(resultFixture);

    expect(
      await screen.findByRole('heading', { level: 1, name: /phishing basics quiz/i }),
    ).toBeInTheDocument();
  });

  it('renders the trainee score, feedback, and navigation back to the campaign', async () => {
    mockedGetQuizResult.mockResolvedValue(resultFixture);

    renderResultsPage();

    expect(await screen.findByText('5/6 (84%)')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /answer feedback/i })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: /question 1: which message is suspicious/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('This was the suspicious option.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to campaign/i })).toHaveAttribute(
      'href',
      '/campaigns',
    );
  });

  it('loads retake availability from the result campaign item on a direct result link', async () => {
    renderResultsPage();

    expect(await screen.findByText('5/6 (84%)')).toBeInTheDocument();
    expect(mockedGetQuizResult).toHaveBeenCalledWith(attemptId);
    await waitFor(() => expect(mockedGetQuiz).toHaveBeenCalledWith(campaignItemId));
    expect(await screen.findByRole('button', { name: 'Retake Quiz' })).toBeInTheDocument();
  });

  it('hides Retake when no attempts remain', async () => {
    mockedGetQuiz.mockResolvedValue({ ...occurrenceFixture, attemptsRemaining: 0 });
    renderResultsPage();

    expect(await screen.findByText('5/6 (84%)')).toBeInTheDocument();
    await waitFor(() => expect(mockedGetQuiz).toHaveBeenCalledWith(campaignItemId));
    expect(screen.queryByRole('button', { name: 'Retake Quiz' })).not.toBeInTheDocument();
  });

  it('starts a retake once and navigates to the occurrence Quiz page', async () => {
    const user = userEvent.setup();
    mockedStartQuizAttempt.mockResolvedValue({
      attemptId: 'next-attempt-id',
      quizId: resultFixture.quizId,
      campaignItemId,
      status: 'IN_PROGRESS',
      startedAt: '2026-09-18T10:00:00.000Z',
    });

    render(
      <MemoryRouter initialEntries={[`/quiz-attempts/${attemptId}/results`]}>
        <Routes>
          <Route path="/quiz-attempts/:attemptId/results" element={<ResultsPage />} />
          <Route path="/quizzes/:quizId" element={<p>Quiz page destination</p>} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: 'Retake Quiz' }));
    expect(await screen.findByText('Quiz page destination')).toBeInTheDocument();
    expect(mockedStartQuizAttempt).toHaveBeenCalledTimes(1);
    expect(mockedStartQuizAttempt).toHaveBeenCalledWith(campaignItemId);
  });

  it('keeps the old result visible and refreshes allowance after a 409', async () => {
    const user = userEvent.setup();
    mockedStartQuizAttempt.mockRejectedValueOnce(
      new ApiError('Maximum quiz attempts reached', {
        status: 409,
        statusText: 'Conflict',
        method: 'POST',
        url: `/trainee/campaign-items/${campaignItemId}/quiz/attempts`,
      }),
    );
    mockedGetQuiz
      .mockResolvedValueOnce(occurrenceFixture)
      .mockResolvedValueOnce({ ...occurrenceFixture, attemptsRemaining: 0 });

    renderResultsPage();
    await user.click(await screen.findByRole('button', { name: 'Retake Quiz' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Maximum quiz attempts reached');
    expect(screen.getByText('5/6 (84%)')).toBeInTheDocument();
    await waitFor(() => expect(mockedGetQuiz).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('button', { name: 'Retake Quiz' })).not.toBeInTheDocument();
  });

  it('shows an error state and retries loading when requested', async () => {
    const user = userEvent.setup();

    mockedGetQuizResult.mockRejectedValueOnce(new Error('Results are temporarily unavailable.'));
    mockedGetQuizResult.mockResolvedValueOnce(resultFixture);

    renderResultsPage();

    expect(
      await screen.findByRole('heading', { level: 2, name: /unable to load results/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Results are temporarily unavailable.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /try again/i }));

    await waitFor(() => {
      expect(mockedGetQuizResult).toHaveBeenCalledTimes(2);
    });

    expect(await screen.findByText('5/6 (84%)')).toBeInTheDocument();
  });
});

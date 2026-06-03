import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ResultsPage from '../ResultsPage';
import { getQuizResult } from '../../lib/quizApi';
import type { QuizResult } from '../../lib/quizApi';
import { renderWithRouter } from '../../testing/render';

vi.mock('../../components/layout/AppLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../lib/quizApi', () => ({
  getQuizResult: vi.fn(),
}));

const mockedGetQuizResult = vi.mocked(getQuizResult);
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
  answers: [
    {
      questionId: 'question-1',
      isCorrect: true,
      awardedPoints: 5,
      feedbackShown: 'You correctly identified the phishing indicator.',
      selectedOptions: [
        {
          optionId: 'option-1',
          label: 'A',
          text: 'Urgent password reset email.',
          isCorrect: true,
          feedbackText: 'This was the suspicious option.',
        },
      ],
    },
  ],
};

function createDeferred<T>() {
  let resolve: ((value: T) => void) | undefined;
  let reject: ((reason?: unknown) => void) | undefined;

  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  if (!resolve || !reject) {
    throw new Error('Deferred promise handlers were not initialised');
  }

  return {
    promise,
    resolve,
    reject,
  };
}

function renderResultsPage() {
  return renderWithRouter(<ResultsPage />, {
    initialEntry: `/quiz-attempts/${attemptId}/results`,
    routePath: '/quiz-attempts/:attemptId/results',
  });
}

describe('ResultsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading state before quiz results resolve', async () => {
    const deferred = createDeferred<typeof resultFixture>();

    mockedGetQuizResult.mockReturnValueOnce(deferred.promise);

    renderResultsPage();

    expect(screen.getByRole('heading', { level: 2, name: /loading results/i })).toBeInTheDocument();
    expect(screen.getByText(/your quiz result feedback is being loaded/i)).toBeInTheDocument();

    deferred.resolve(resultFixture);

    expect(await screen.findByRole('heading', { level: 1, name: /passed/i })).toBeInTheDocument();
  });

  it('renders the learner score, feedback, and navigation back to the quiz', async () => {
    mockedGetQuizResult.mockResolvedValue(resultFixture);

    renderResultsPage();

    expect(await screen.findByText('84%')).toBeInTheDocument();
    expect(
      screen.getByText('Great job identifying the suspicious message and unsafe link.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /answer feedback/i })).toBeInTheDocument();
    expect(screen.getByText('Selected correct option')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to quiz/i })).toHaveAttribute(
      'href',
      `/quizzes/${campaignItemId}`,
    );
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

    expect(await screen.findByText('84%')).toBeInTheDocument();
  });
});

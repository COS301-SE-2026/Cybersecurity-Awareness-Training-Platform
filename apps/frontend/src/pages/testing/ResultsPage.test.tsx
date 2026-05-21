import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ResultsPage from '../ResultsPage';
import { getQuizResult } from '../../lib/quizApi';

vi.mock('../../components/layout/AppLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../lib/quizApi', () => ({
  getQuizResult: vi.fn(),
}));

const mockedGetQuizResult = vi.mocked(getQuizResult);
const attemptId = 'attempt-123';
const campaignItemId = '33333333-3333-4333-8333-333333333334';

const resultFixture = {
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
} as const;

function createDeferred<T>() {
  let resolve: (value: T) => void;
  let reject: (reason?: unknown) => void;

  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return {
    promise,
    resolve: resolve!,
    reject: reject!,
  };
}

function renderResultsPage() {
  return render(
    <MemoryRouter initialEntries={[`/quiz-attempts/${attemptId}/results`]}>
      <Routes>
        <Route path="/quiz-attempts/:attemptId/results" element={<ResultsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ResultsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
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
    expect(screen.getByText(resultFixture.summary)).toBeInTheDocument();
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

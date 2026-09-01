import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import QuizPage from '../QuizPage';
import { AuthProvider } from '../../context/AuthContext';
import { getQuiz, startQuizAttempt, submitQuizAttempt } from '../../lib/quizApi';

vi.mock('../../lib/quizApi', () => ({
  getQuiz: vi.fn(),
  startQuizAttempt: vi.fn(),
  submitQuizAttempt: vi.fn(),
}));

const mockedGetQuiz = vi.mocked(getQuiz);
const mockedStartQuizAttempt = vi.mocked(startQuizAttempt);
const mockedSubmitQuizAttempt = vi.mocked(submitQuizAttempt);

const campaignItemId = '33333333-3333-4333-8333-333333333334';
const attemptId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

import { createDeferred } from '../../testing/render';

const quizFixture = {
  id: '55555555-5555-4555-8555-555555555551',
  campaignItemId,
  campaignAssignmentId: '22222222-2222-4222-8222-222222222222',
  title: 'Phishing basics quiz',
  description: 'Check your phishing awareness.',
  passThresholdPercentage: 70,
  difficultyLevel: 'BEGINNER',
  status: 'AVAILABLE',
  questions: [
    {
      id: 'question-1',
      text: 'Which email is suspicious?',
      options: [
        {
          id: 'option-1',
          label: 'A',
          text: 'A message asking you to verify your password urgently.',
        },
        {
          id: 'option-2',
          label: 'B',
          text: 'A normal team update from a known address.',
        },
      ],
    },
    {
      id: 'question-2',
      text: 'What should you check before clicking a link?',
      options: [
        {
          id: 'option-3',
          label: 'A',
          text: 'The sender and link destination.',
        },
        {
          id: 'option-4',
          label: 'B',
          text: 'Only the email logo.',
        },
      ],
    },
  ],
};

function renderQuizPage() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[`/quizzes/${campaignItemId}`]}>
        <Routes>
          <Route path="/quizzes/:quizId" element={<QuizPage />} />
          <Route path="/quiz-attempts/:attemptId/results" element={<p>Results page</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();

  mockedGetQuiz.mockResolvedValue(quizFixture);

  mockedStartQuizAttempt.mockResolvedValue({
    attemptId,
    traineeProfileId: 'trainee-profile-id',
    quizId: quizFixture.id,
    campaignAssignmentId: quizFixture.campaignAssignmentId,
    campaignItemId,
    status: 'IN_PROGRESS',
    startedAt: '2026-05-19T10:00:00.000Z',
  });

  mockedSubmitQuizAttempt.mockResolvedValue({
    success: true,
    attemptId,
    status: 'SUBMITTED',
  });
});

afterEach(() => {
  cleanup();
});

describe('QuizPage', () => {
  it('shows a loading state before the quiz content resolves', async () => {
    const deferred = createDeferred<typeof quizFixture>();

    mockedGetQuiz.mockReturnValueOnce(deferred.promise);

    renderQuizPage();

    expect(screen.getByRole('heading', { level: 2, name: /loading quiz/i })).toBeInTheDocument();
    expect(screen.getByText(/your quiz questions are being loaded/i)).toBeInTheDocument();

    deferred.resolve(quizFixture);

    expect(
      await screen.findByRole('heading', { name: /phishing basics quiz/i }),
    ).toBeInTheDocument();
  });

  it('loads quiz content through the campaign item id', async () => {
    renderQuizPage();

    expect(
      await screen.findByRole('heading', { name: /phishing basics quiz/i }),
    ).toBeInTheDocument();

    expect(mockedGetQuiz).toHaveBeenCalledWith(campaignItemId);
    expect(screen.getByRole('group', { name: /which email is suspicious\?/i })).toBeInTheDocument();
    expect(
      screen.getByLabelText(/A\. A message asking you to verify your password urgently\./i),
    ).toBeInTheDocument();
  });

  it('does not render correct answers or feedback before submission', async () => {
    renderQuizPage();

    expect(
      await screen.findByRole('heading', { name: /phishing basics quiz/i }),
    ).toBeInTheDocument();

    expect(screen.queryByText(/correct option/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/incorrect option/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/answer feedback/i)).not.toBeInTheDocument();
  });

  it('shows validation when submitting with unanswered questions', async () => {
    renderQuizPage();

    expect(
      await screen.findByRole('heading', { name: /phishing basics quiz/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /submit quiz/i }));

    expect(
      screen.getByText('Please answer every question before submitting the quiz.'),
    ).toBeInTheDocument();

    expect(mockedStartQuizAttempt).not.toHaveBeenCalled();
    expect(mockedSubmitQuizAttempt).not.toHaveBeenCalled();
  });

  it('allows trainees to select answers and updates progress text', async () => {
    const user = userEvent.setup();

    renderQuizPage();

    expect(
      await screen.findByRole('heading', { name: /phishing basics quiz/i }),
    ).toBeInTheDocument();

    const firstAnswer = screen.getByLabelText(
      /A\. A message asking you to verify your password urgently\./i,
    );
    const secondAnswer = screen.getByLabelText(/A\. The sender and link destination\./i);

    await user.click(firstAnswer);

    expect(firstAnswer).toBeChecked();
    expect(screen.getByText(/question 1 of 2 answered/i)).toBeInTheDocument();

    await user.click(secondAnswer);

    expect(secondAnswer).toBeChecked();
    expect(screen.getByText(/question 2 of 2 answered/i)).toBeInTheDocument();
  });

  it('starts an attempt and submits selected single-choice answers', async () => {
    renderQuizPage();

    expect(
      await screen.findByRole('heading', { name: /phishing basics quiz/i }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByLabelText(/A\. A message asking you to verify your password urgently\./i),
    );

    fireEvent.click(screen.getByLabelText(/A\. The sender and link destination\./i));

    fireEvent.click(screen.getByRole('button', { name: /submit quiz/i }));

    await waitFor(() => {
      expect(mockedStartQuizAttempt).toHaveBeenCalledWith(campaignItemId);
    });

    await waitFor(() => {
      expect(mockedSubmitQuizAttempt).toHaveBeenCalledWith(attemptId, [
        {
          questionId: 'question-1',
          selectedOptionIds: ['option-1'],
        },
        {
          questionId: 'question-2',
          selectedOptionIds: ['option-3'],
        },
      ]);
    });

    expect(await screen.findByText('Results page')).toBeInTheDocument();
  });

  it('prevents duplicate submit while submission is in progress', async () => {
    let resolveSubmit:
      | ((value: { success: boolean; attemptId: string; status: string }) => void)
      | undefined;

    mockedSubmitQuizAttempt.mockReturnValue(
      new Promise((resolve) => {
        resolveSubmit = resolve;
      }),
    );

    renderQuizPage();

    expect(
      await screen.findByRole('heading', { name: /phishing basics quiz/i }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByLabelText(/A\. A message asking you to verify your password urgently\./i),
    );

    fireEvent.click(screen.getByLabelText(/A\. The sender and link destination\./i));

    const submitButton = screen.getByRole('button', { name: /submit quiz/i });

    fireEvent.click(submitButton);

    expect(await screen.findByRole('button', { name: /submitting/i })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /submitting/i }));

    await waitFor(() => {
      expect(mockedSubmitQuizAttempt).toHaveBeenCalledTimes(1);
    });

    resolveSubmit?.({
      success: true,
      attemptId,
      status: 'SUBMITTED',
    });
  });

  it('resumes an in-progress attempt without creating a new attempt', async () => {
    mockedGetQuiz.mockResolvedValueOnce({
      ...quizFixture,
      currentAttempt: {
        attemptId: 'in-progress-attempt-id',
        status: 'IN_PROGRESS',
        hasResult: false,
      },
    });

    renderQuizPage();

    expect(
      await screen.findByRole('heading', { name: /phishing basics quiz/i }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByLabelText(/A\. A message asking you to verify your password urgently\./i),
    );
    fireEvent.click(screen.getByLabelText(/A\. The sender and link destination\./i));
    fireEvent.click(screen.getByRole('button', { name: /submit quiz/i }));

    await waitFor(() => {
      expect(mockedStartQuizAttempt).not.toHaveBeenCalled();
      expect(mockedSubmitQuizAttempt).toHaveBeenCalledWith('in-progress-attempt-id', [
        {
          questionId: 'question-1',
          selectedOptionIds: ['option-1'],
        },
        {
          questionId: 'question-2',
          selectedOptionIds: ['option-3'],
        },
      ]);
    });

    expect(await screen.findByText('Results page')).toBeInTheDocument();
  });

  it('redirects to results when a submitted attempt exists', async () => {
    mockedGetQuiz.mockResolvedValueOnce({
      ...quizFixture,
      currentAttempt: {
        attemptId: 'submitted-attempt-id',
        status: 'SUBMITTED',
        hasResult: true,
      },
    });

    renderQuizPage();

    expect(await screen.findByText('Results page')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /phishing basics quiz/i })).not.toBeInTheDocument();
    expect(mockedStartQuizAttempt).not.toHaveBeenCalled();
    expect(mockedSubmitQuizAttempt).not.toHaveBeenCalled();
  });
});

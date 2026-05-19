import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as quizApi from '../../lib/quizApi';
import QuizPage from '../QuizPage';

const quizFixture: quizApi.CampaignItemQuiz = {
  id: 'phishing-basics-quiz',
  campaignItemId: 'campaign-item-phishing-basics-quiz',
  campaignAssignmentId: 'campaign-assignment-demo',
  title: 'Phishing Basics Quiz',
  description: 'Check your phishing awareness knowledge.',
  passThresholdPercentage: 70,
  difficultyLevel: 'BEGINNER',
  status: 'AVAILABLE',
  questions: [
    {
      id: 'question-sender',
      text: 'Which email detail is most suspicious?',
      options: [
        {
          id: 'option-sender-a',
          label: 'A',
          text: 'A strange sender address',
        },
        {
          id: 'option-sender-b',
          label: 'B',
          text: 'A normal company footer',
        },
      ],
    },
  ],
};

function renderQuizPage() {
  return render(
    <MemoryRouter initialEntries={['/quizzes/phishing-basics-quiz']}>
      <Routes>
        <Route path="/quizzes/:quizId" element={<QuizPage />} />
        <Route path="/quiz-attempts/:attemptId/results" element={<div>Results route</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('QuizPage', () => {
  beforeEach(() => {
    vi.spyOn(quizApi, 'getQuiz').mockResolvedValue(quizFixture);
    vi.spyOn(quizApi, 'startQuizAttempt').mockResolvedValue({
      attemptId: 'attempt-phishing-basics-quiz',
      traineeProfileId: 'trainee-demo-profile',
      quizId: 'phishing-basics-quiz',
      campaignAssignmentId: 'campaign-assignment-demo',
      campaignItemId: 'campaign-item-phishing-basics-quiz',
      status: 'IN_PROGRESS',
      startedAt: '2026-05-17T10:00:00.000Z',
    });
    vi.spyOn(quizApi, 'submitQuizAttempt').mockResolvedValue({
      success: true,
      attemptId: 'attempt-phishing-basics-quiz',
      status: 'SUBMITTED',
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('fetches and renders quiz questions and answer options', async () => {
    renderQuizPage();

    expect(await screen.findByText('Phishing Basics Quiz')).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: /which email detail is most suspicious/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/a strange sender address/i)).toBeInTheDocument();

    expect(quizApi.getQuiz).toHaveBeenCalledWith('phishing-basics-quiz');
  });

  it('does not render correct answers or feedback before submission', async () => {
    vi.spyOn(quizApi, 'getQuiz').mockResolvedValueOnce({
      ...quizFixture,
      questions: [
        {
          ...quizFixture.questions[0],
          options: [
            {
              ...quizFixture.questions[0].options[0],
              isCorrect: true,
              feedbackText: 'Hidden feedback before submit',
            } as unknown as quizApi.QuizOption,
          ],
        },
      ],
    });

    renderQuizPage();

    expect(await screen.findByText('Phishing Basics Quiz')).toBeInTheDocument();
    expect(screen.queryByText('Hidden feedback before submit')).not.toBeInTheDocument();
    expect(screen.queryByText(/selected correct option/i)).not.toBeInTheDocument();
  });

  it('shows validation when submitting without answering required questions', async () => {
    renderQuizPage();

    const submitButton = await screen.findByRole('button', { name: /submit quiz/i });
    submitButton.click();

    expect(
      await screen.findByText('Please answer every question before submitting the quiz.'),
    ).toBeInTheDocument();

    expect(quizApi.startQuizAttempt).not.toHaveBeenCalled();
    expect(quizApi.submitQuizAttempt).not.toHaveBeenCalled();
  });

  it('submits selected answers and navigates to the result page', async () => {
    renderQuizPage();

    const option = await screen.findByLabelText(/a strange sender address/i);
    option.click();

    const submitButton = screen.getByRole('button', { name: /submit quiz/i });
    submitButton.click();

    await waitFor(() => {
      expect(quizApi.startQuizAttempt).toHaveBeenCalledWith('phishing-basics-quiz');
    });

    expect(quizApi.submitQuizAttempt).toHaveBeenCalledWith('attempt-phishing-basics-quiz', [
      {
        questionId: 'question-sender',
        selectedOptionIds: ['option-sender-a'],
      },
    ]);

    expect(await screen.findByText('Results route')).toBeInTheDocument();
  });

  it('prevents duplicate submissions while submitting', async () => {
    let resolveSubmit: ((value: quizApi.SubmitQuizAttemptResponse) => void) | undefined;

    vi.spyOn(quizApi, 'submitQuizAttempt').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSubmit = resolve;
        }),
    );

    renderQuizPage();

    const option = await screen.findByLabelText(/a strange sender address/i);
    option.click();

    const submitButton = screen.getByRole('button', { name: /submit quiz/i });
    submitButton.click();
    submitButton.click();

    await waitFor(() => {
      expect(quizApi.startQuizAttempt).toHaveBeenCalledTimes(1);
      expect(quizApi.submitQuizAttempt).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByRole('button', { name: /submitting/i })).toBeDisabled();

    resolveSubmit?.({
      success: true,
      attemptId: 'attempt-phishing-basics-quiz',
      status: 'SUBMITTED',
    });
  });
});

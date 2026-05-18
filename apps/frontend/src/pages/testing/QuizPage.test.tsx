import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as quizApi from '../../lib/quizApi';
import QuizPage from '../QuizPage';

vi.mock('../../components/layout/AppLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const quizFixture: quizApi.GetQuizResponseDto = {
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
      prompt: 'Which email detail is most suspicious?',
      questionType: 'SINGLE_CHOICE',
      position: 1,
      points: 1,
      options: [
        {
          id: 'option-sender-a',
          label: 'A',
          text: 'A strange sender address',
          position: 1,
        },
        {
          id: 'option-sender-b',
          label: 'B',
          text: 'A normal company footer',
          position: 2,
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
    vi.restoreAllMocks();
  });

  it('fetches and renders quiz questions and answer options', async () => {
    renderQuizPage();

    expect(await screen.findByText('Phishing Basics Quiz')).toBeInTheDocument();
    expect(screen.getByText('Which email detail is most suspicious?')).toBeInTheDocument();
    expect(screen.getByText('A strange sender address')).toBeInTheDocument();

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
            } as unknown as quizApi.SafeQuizAnswerOptionDto,
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
      await screen.findByText('Please answer all questions before submitting the quiz.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Please select an answer for this question.')).toBeInTheDocument();

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

    expect(quizApi.submitQuizAttempt).toHaveBeenCalledWith('attempt-phishing-basics-quiz', {
      answers: [
        {
          questionId: 'question-sender',
          selectedOptionIds: ['option-sender-a'],
        },
      ],
    });

    expect(await screen.findByText('Results route')).toBeInTheDocument();
  });

  it('prevents duplicate submissions while submitting', async () => {
    let resolveSubmit: ((value: quizApi.SubmitQuizAttemptResponseDto) => void) | undefined;

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

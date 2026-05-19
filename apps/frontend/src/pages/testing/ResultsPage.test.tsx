import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as quizApi from '../../lib/quizApi';
import ResultsPage from '../ResultsPage';

vi.mock('../../components/layout/AppLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const resultFixture: quizApi.QuizResult = {
  attemptId: 'attempt-phishing-basics-quiz',
  quizId: 'phishing-basics-quiz',
  campaignAssignmentId: 'campaign-assignment-demo',
  campaignItemId: 'campaign-item-phishing-basics-quiz',
  scorePercentage: 80,
  passed: true,
  summary: 'Good work. You recognised the phishing indicator.',
  answers: [
    {
      questionId: 'question-sender',
      isCorrect: true,
      awardedPoints: 1,
      feedbackShown: 'Sender address mismatches are suspicious.',
      selectedOptions: [
        {
          optionId: 'option-sender-a',
          label: 'A',
          text: 'A strange sender address',
          isCorrect: true,
          feedbackText: 'Correct. Sender address mismatches are a common phishing warning sign.',
        },
      ],
    },
  ],
};

function renderResultsPage() {
  return render(
    <MemoryRouter initialEntries={['/quiz-attempts/attempt-phishing-basics-quiz/results']}>
      <Routes>
        <Route path="/quiz-attempts/:attemptId/results" element={<ResultsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ResultsPage', () => {
  beforeEach(() => {
    vi.spyOn(quizApi, 'getQuizResult').mockResolvedValue(resultFixture);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('fetches results using the attempt id from the route', async () => {
    renderResultsPage();

    expect(await screen.findByText('Passed')).toBeInTheDocument();

    expect(quizApi.getQuizResult).toHaveBeenCalledWith('attempt-phishing-basics-quiz');
  });

  it('renders the backend-shaped score and pass status', async () => {
    renderResultsPage();

    expect(await screen.findByText('Passed')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(
      screen.getByText('Good work. You recognised the phishing indicator.'),
    ).toBeInTheDocument();
  });

  it('renders answer-level feedback after submission', async () => {
    renderResultsPage();

    expect(await screen.findByText('A strange sender address')).toBeInTheDocument();
    expect(screen.getByText('Selected correct option')).toBeInTheDocument();
    expect(screen.getByText('Sender address mismatches are suspicious.')).toBeInTheDocument();
    expect(
      screen.getByText('Correct. Sender address mismatches are a common phishing warning sign.'),
    ).toBeInTheDocument();
  });
});

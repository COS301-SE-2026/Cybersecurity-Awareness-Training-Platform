import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  QuizAttemptConflictError,
  QuizForbiddenError,
  QuizValidationError,
  getQuizByCampaignItemId,
  startQuizAttempt,
  submitQuizAttempt,
  getQuizResult,
} from '../../src/services/quiz.service.js';

const mockPrisma = vi.hoisted(() => {
  const txMock = {
    attemptAnswer: { create: vi.fn().mockResolvedValue({ id: 'mock-answer-id' }) },
    attemptAnswerOption: { createMany: vi.fn() },
    quizResult: { create: vi.fn() },
    quizAttempt: {
      update: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      create: vi.fn().mockResolvedValue({
        id: 'attempt-1',
        quizId: 'quiz-1',
        traineeProfileId: 'trainee-1',
        status: 'IN_PROGRESS',
      }),
    },
    $queryRaw: vi.fn().mockResolvedValue([{ id: 'mock-id' }]),
    $executeRaw: vi.fn().mockResolvedValue(1),
  };

  return {
    campaignItem: { findFirst: vi.fn() },
    quizAttempt: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    $transaction: vi.fn(async (cb) => cb(txMock)),
  };
});

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

function mockCampaignItem() {
  return {
    id: 'ci-1',
    quiz: {
      id: 'quiz-1',
      title: 'Security 101',
      passThresholdPercentage: 80,
      difficultyLevel: 'BEGINNER',
      status: 'PUBLISHED',
      questions: [
        {
          id: 'q-1',
          prompt: 'What is phishing?',
          questionType: 'SINGLE_CHOICE',
          position: 1,
          points: 10,
          answerOptions: [
            {
              id: 'opt-1',
              label: 'A',
              text: 'Bad',
              isCorrect: true,
              position: 1,
              feedbackText: 'Yes',
            },
            {
              id: 'opt-2',
              label: 'B',
              text: 'Good',
              isCorrect: false,
              position: 2,
              feedbackText: 'No',
            },
          ],
        },
      ],
    },
    campaign: {
      status: 'ACTIVE',
      campaignType: 'PREMADE_GENERAL',
      assignments: [{ id: 'assign-1', traineeProfileId: 'trainee-1' }],
    },
  };
}

function mockQuizAttempt(status = 'IN_PROGRESS') {
  return {
    id: 'attempt-1',
    traineeProfileId: 'trainee-1',
    status,
    quiz: {
      id: 'quiz-1',
      passThresholdPercentage: 50,
      questions: [
        {
          id: 'q-1',
          points: 10,
          answerOptions: [
            { id: 'opt-1', isCorrect: true },
            { id: 'opt-2', isCorrect: false },
          ],
        },
        {
          id: 'q-2',
          points: 10,
          answerOptions: [
            { id: 'opt-3', isCorrect: true },
            { id: 'opt-4', isCorrect: false },
          ],
        },
      ],
    },
  };
}

describe('Quiz Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getQuizByCampaignItemId', () => {
    it('returns a safe quiz object without correct answers or feedback', async () => {
      mockPrisma.campaignItem.findFirst.mockResolvedValue(mockCampaignItem());

      const result = await getQuizByCampaignItemId('ci-1', 'trainee-1');

      expect(result.id).toBe('quiz-1');
      expect(result.campaignItemId).toBe('ci-1');
      expect(result.questions[0].options[0]).not.toHaveProperty('isCorrect');
      expect(result.questions[0].options[0]).not.toHaveProperty('feedbackText');
      expect(result.questions[0].options[0]).toHaveProperty('id', 'opt-1');
      expect(result.questions[0].options[0]).toHaveProperty('text', 'Bad');
      expect(result.currentAttempt).toBeNull();
    });

    it('returns currentAttempt summary when attempt exists', async () => {
      mockPrisma.campaignItem.findFirst.mockResolvedValue(mockCampaignItem());
      mockPrisma.quizAttempt.findFirst.mockResolvedValue({
        id: 'attempt-1',
        status: 'SUBMITTED',
        quizResult: { id: 'result-1' },
      });

      const result = await getQuizByCampaignItemId('ci-1', 'trainee-1');

      expect(result.currentAttempt).toEqual({
        attemptId: 'attempt-1',
        status: 'SUBMITTED',
        hasResult: true,
      });
    });

    it('scopes attempt lookup to the active campaign assignment', async () => {
      mockPrisma.campaignItem.findFirst.mockResolvedValue(mockCampaignItem());
      mockPrisma.quizAttempt.findFirst.mockResolvedValue({
        id: 'attempt-1',
        status: 'IN_PROGRESS',
        quizResult: null,
      });

      await getQuizByCampaignItemId('ci-1', 'trainee-1');

      expect(mockPrisma.quizAttempt.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            campaignAssignmentId: 'assign-1',
          }),
        }),
      );
    });

    it('throws QuizForbiddenError if trainee is not assigned', async () => {
      mockPrisma.campaignItem.findFirst.mockResolvedValue({
        id: 'ci-1',
        quiz: { id: 'quiz-1' },
        campaign: { assignments: [] },
      });

      await expect(getQuizByCampaignItemId('ci-1', 'trainee-1')).rejects.toThrow(
        QuizForbiddenError,
      );
    });
  });

  describe('startQuizAttempt', () => {
    it('scopes attempt lookup to the active campaign assignment', async () => {
      mockPrisma.campaignItem.findFirst.mockResolvedValue(mockCampaignItem());
      mockPrisma.quizAttempt.findFirst.mockResolvedValue({
        id: 'attempt-1',
        quizId: 'quiz-1',
        campaignAssignmentId: 'assign-1',
        campaignItemId: 'ci-1',
        status: 'IN_PROGRESS',
        startedAt: new Date('2026-08-31T08:00:00.000Z'),
      });

      const result = await startQuizAttempt('ci-1', 'trainee-1');

      expect(mockPrisma.quizAttempt.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            campaignAssignmentId: 'assign-1',
          }),
        }),
      );
      expect(result.campaignAssignmentId).toBe('assign-1');
    });
  });

  describe('submitQuizAttempt', () => {
    it('calculates score correctly and marks as passed if >= threshold', async () => {
      mockPrisma.quizAttempt.findFirst.mockResolvedValue(mockQuizAttempt());

      await submitQuizAttempt('attempt-1', 'trainee-1', [
        { questionId: 'q-1', selectedOptionIds: ['opt-1'] },
        { questionId: 'q-2', selectedOptionIds: ['opt-4'] },
      ]);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('throws QuizAttemptConflictError on duplicate submission', async () => {
      mockPrisma.quizAttempt.findFirst.mockResolvedValue({
        id: 'attempt-1',
        traineeProfileId: 'trainee-1',
        status: 'SUBMITTED',
        quiz: {},
      });

      await expect(submitQuizAttempt('attempt-1', 'trainee-1', [])).rejects.toThrow(
        QuizAttemptConflictError,
      );
    });

    it('throws QuizValidationError on missing answer', async () => {
      mockPrisma.quizAttempt.findFirst.mockResolvedValue({
        id: 'attempt-1',
        traineeProfileId: 'trainee-1',
        status: 'IN_PROGRESS',
        quiz: {
          questions: [{ id: 'q-1', points: 10, answerOptions: [{ id: 'opt-1', isCorrect: true }] }],
        },
      });

      await expect(submitQuizAttempt('attempt-1', 'trainee-1', [])).rejects.toThrow(
        QuizValidationError,
      );
    });
  });

  describe('getQuizResult', () => {
    it('returns answer-level feedback after submission', async () => {
      mockPrisma.quizAttempt.findFirst.mockResolvedValue({
        id: 'attempt-1',
        quizId: 'quiz-1',
        status: 'SUBMITTED',
        quizResult: { scorePercentage: 100, passed: true },
        answers: [
          {
            questionId: 'q-1',
            isCorrect: true,
            awardedPoints: 10,
            selectedOptions: [
              {
                answerOption: {
                  id: 'opt-1',
                  label: 'A',
                  text: 'Correct',
                  isCorrect: true,
                  feedbackText: 'Well done',
                },
              },
            ],
          },
        ],
      });

      const result = await getQuizResult('attempt-1', 'trainee-1');
      expect(result.scorePercentage).toBe(100);
      expect(result.passed).toBe(true);
      expect(result.answers[0].selectedOptions[0].feedbackText).toBe('Well done');
    });

    it('throws QuizForbiddenError if attempt is not submitted', async () => {
      mockPrisma.quizAttempt.findFirst.mockResolvedValue({
        id: 'attempt-1',
        status: 'IN_PROGRESS',
      });

      await expect(getQuizResult('attempt-1', 'trainee-1')).rejects.toThrow(QuizForbiddenError);
    });
  });
});

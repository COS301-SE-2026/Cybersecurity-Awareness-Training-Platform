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
import { resolveCampaignItemRuntime } from '../../src/services/campaign-item-runtime.service.js';

vi.mock('../../src/services/campaign-item-runtime.service.js', () => ({
  resolveCampaignItemRuntime: vi.fn(),
}));

const mockPrisma = vi.hoisted(() => {
  const txMock = {
    campaignItem: { findFirst: vi.fn() },
    attemptAnswer: { create: vi.fn().mockResolvedValue({ id: 'mock-answer-id' }) },
    attemptAnswerOption: { createMany: vi.fn() },
    quizResult: { create: vi.fn() },
    quizAttempt: {
      findFirst: vi.fn(),
      count: vi.fn(),
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
    txMock,
    campaignItem: { findFirst: vi.fn() },
    quizAttempt: {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
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
    campaignId: 'campaign-1',
    quizId: 'quiz-1',
    quizMaxAttempts: 3,
    quizScorePolicy: 'BEST',
    quiz: {
      id: 'quiz-1',
      title: 'Security 101',
      passThresholdPercentage: 80,
      difficultyLevel: 'EASY',
      status: 'PUBLISHED',
      questions: [
        {
          id: 'q-1',
          prompt: 'What is phishing?',
          questionType: 'SINGLE_CHOICE',
          shuffleOptions: false,
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
    vi.mocked(resolveCampaignItemRuntime).mockResolvedValue({
      campaignId: 'campaign-1',
      campaignAssignmentId: 'assign-1',
      campaignItemId: 'ci-1',
      componentType: 'QUIZ',
      contentId: 'quiz-1',
      itemType: 'COMPONENT',
    });
    mockPrisma.txMock.campaignItem.findFirst.mockResolvedValue({
      id: 'ci-1',
      quizId: 'quiz-1',
      quizMaxAttempts: 3,
    });
    mockPrisma.txMock.quizAttempt.findFirst.mockResolvedValue(null);
    mockPrisma.txMock.quizAttempt.count.mockResolvedValue(0);
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
      expect(result.maxAttempts).toBe(3);
      expect(result.scorePolicy).toBe('BEST');
      expect(result.attemptsRemaining).toBe(3);
      expect(result.effectiveScorePercentage).toBeNull();
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

    it('counts submitted attempts while keeping an in-progress attempts seperate', async () => {
      mockPrisma.campaignItem.findFirst.mockResolvedValue(mockCampaignItem());
      mockPrisma.quizAttempt.findFirst.mockResolvedValue({
        id: 'attempt-2',
        status: 'IN_PROGRESS',
        quizResult: null,
      });
      mockPrisma.quizAttempt.findMany.mockResolvedValue([
        {
          id: 'attempt-1',
          submittedAt: new Date('2026-09-01T10:00:00Z'),
          quizResult: { scorePercentage: 80 },
        },
        {
          id: 'attempt-0',
          submittedAt: new Date('2026-09-01T10:00:00Z'),
          quizResult: null,
        },
      ]);

      const result = await getQuizByCampaignItemId('ci-1', 'trainee-1');

      expect(result.currentAttempt?.status).toBe('IN_PROGRESS');
      expect(result.attemptsRemaining).toBe(1);
      expect(result.effectiveScorePercentage).toBe(80);
      expect(mockPrisma.quizAttempt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            quizId: 'quiz-1',
            traineeProfileId: 'trainee-1',
            campaignAssignmentId: 'assign-1',
            campaignItemId: 'ci-1',
            status: 'SUBMITTED',
          },
        }),
      );
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
    it('resumes an in-progress attempt within the exact occurrence', async () => {
      mockPrisma.campaignItem.findFirst.mockResolvedValue(mockCampaignItem());
      mockPrisma.txMock.quizAttempt.findFirst.mockResolvedValueOnce({
        id: 'attempt-1',
        quizId: 'quiz-1',
        traineeProfileId: 'trainee-1',
        campaignAssignmentId: 'assign-1',
        campaignItemId: 'ci-1',
        status: 'IN_PROGRESS',
        startedAt: new Date('2026-08-31T08:00:00.000Z'),
      });

      const result = await startQuizAttempt('ci-1', 'trainee-1');

      expect(result.attemptId).toBe('attempt-1');
      expect(mockPrisma.txMock.quizAttempt.findFirst).toHaveBeenCalledWith({
        where: {
          quizId: 'quiz-1',
          traineeProfileId: 'trainee-1',
          campaignAssignmentId: 'assign-1',
          campaignItemId: 'ci-1',
          status: 'IN_PROGRESS',
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });
      expect(mockPrisma.txMock.quizAttempt.count).not.toHaveBeenCalled();
      expect(mockPrisma.txMock.quizAttempt.create).not.toHaveBeenCalled();
      expect(mockPrisma.quizAttempt.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.txMock.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
        mockPrisma.txMock.quizAttempt.findFirst.mock.invocationCallOrder[0],
      );
    });

    it('creates the next attempt when submitted count is below the limit', async () => {
      mockPrisma.campaignItem.findFirst.mockResolvedValue(mockCampaignItem());
      mockPrisma.txMock.quizAttempt.count.mockResolvedValue(1);

      const result = await startQuizAttempt('ci-1', 'trainee-1');

      expect(result.status).toBe('IN_PROGRESS');
      expect(mockPrisma.txMock.quizAttempt.count).toHaveBeenCalledWith({
        where: {
          quizId: 'quiz-1',
          traineeProfileId: 'trainee-1',
          campaignAssignmentId: 'assign-1',
          campaignItemId: 'ci-1',
          status: 'SUBMITTED',
        },
      });
      expect(mockPrisma.txMock.quizAttempt.create).toHaveBeenCalledWith({
        data: {
          quizId: 'quiz-1',
          traineeProfileId: 'trainee-1',
          campaignAssignmentId: 'assign-1',
          campaignItemId: 'ci-1',
          status: 'IN_PROGRESS',
        },
      });
    });

    it('rejects a new attempt when submitted allowance is exhausted', async () => {
      mockPrisma.campaignItem.findFirst.mockResolvedValue(mockCampaignItem());
      mockPrisma.txMock.quizAttempt.count.mockResolvedValue(3);

      await expect(startQuizAttempt('ci-1', 'trainee-1')).rejects.toThrow(QuizAttemptConflictError);
      expect(mockPrisma.txMock.quizAttempt.create).not.toHaveBeenCalled();
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

    it.each([
      {
        selectedOptionIds: ['opt-3', 'opt-1'],
        isCorrect: true,
        awardedPoints: 10,
        scorePercentage: 100,
      },
      {
        selectedOptionIds: ['opt-1'],
        isCorrect: false,
        awardedPoints: 0,
        scorePercentage: 0,
      },
    ])('scores a multiple-choice selection as an exact set', async (testCase) => {
      const attempt = mockQuizAttempt();
      mockPrisma.quizAttempt.findFirst.mockResolvedValue({
        ...attempt,
        quiz: {
          ...attempt.quiz,
          questions: [
            {
              ...attempt.quiz.questions[0],
              questionType: 'MULTIPLE_CHOICE',
              minSelections: 1,
              maxSelections: 2,
              answerOptions: [
                { id: 'opt-1', isCorrect: true },
                { id: 'opt-2', isCorrect: false },
                { id: 'opt-3', isCorrect: true },
              ],
            },
          ],
        },
      });

      await submitQuizAttempt('attempt-1', 'trainee-1', [
        { questionId: 'q-1', selectedOptionIds: testCase.selectedOptionIds },
      ]);

      expect(mockPrisma.txMock.attemptAnswer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          questionId: 'q-1',
          isCorrect: testCase.isCorrect,
          awardedPoints: testCase.awardedPoints,
        }),
      });
      expect(mockPrisma.txMock.attemptAnswerOption.createMany).toHaveBeenCalledWith({
        data: testCase.selectedOptionIds.map((answerOptionId) => ({
          attemptAnswerId: 'mock-answer-id',
          answerOptionId,
        })),
      });
      expect(mockPrisma.txMock.quizResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          scorePercentage: testCase.scorePercentage,
          passed: testCase.isCorrect,
        }),
      });
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
      const campaignItem = mockCampaignItem();

      mockPrisma.quizAttempt.findFirst.mockResolvedValue({
        id: 'attempt-1',
        quizId: 'quiz-1',
        campaignAssignmentId: null,
        campaignItemId: null,
        campaignItem: null,
        quiz: campaignItem.quiz,
        status: 'SUBMITTED',
        quizResult: { scorePercentage: 100, passed: true },
        answers: [
          {
            questionId: 'q-1',
            isCorrect: true,
            awardedPoints: 10,
            selectedOptions: [{ answerOption: campaignItem.quiz.questions[0].answerOptions[0] }],
            question: campaignItem.quiz.questions[0],
          },
        ],
      });

      const result = await getQuizResult('attempt-1', 'trainee-1');
      expect(result).toMatchObject({
        scorePercentage: 100,
        passed: true,
        pointsEarned: 10,
        pointsAvailable: 10,
        feedbackAvailable: true,
        answers: [
          {
            questionPrompt: 'What is phishing?',
            options: [
              { optionId: 'opt-1', feedbackText: 'Yes', selected: true },
              { optionId: 'opt-2', selected: false },
            ],
          },
        ],
      });
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

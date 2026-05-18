import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { generateAuthToken } from '../../src/services/auth-token.service.js';
import { clearAuthRateLimitStore } from '../../src/middleware/authRateLimit.js';

const mockPrisma = vi.hoisted(() => {
  const mockTx = {
    attemptAnswer: { create: vi.fn().mockResolvedValue({ id: 'mock-answer-id' }) },
    attemptAnswerOption: { createMany: vi.fn() },
    quizResult: { create: vi.fn() },
    quizAttempt: { update: vi.fn() },
  };

  return {
    user: { findUnique: vi.fn() },
    traineeProfile: { findUnique: vi.fn(), findFirst: vi.fn() },
    campaignItem: { findFirst: vi.fn() },
    quizAttempt: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(async (cb) => cb(mockTx)),
  };
});

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

const campaignItemId = '11111111-1111-1111-1111-111111111111';
const attemptId = '22222222-2222-2222-2222-222222222222';
const questionId = '33333333-3333-3333-3333-333333333333';
const optionId1 = '44444444-4444-4444-4444-444444444444';
const optionId2 = '55555555-5555-5555-5555-555555555555';
const optionId3 = '66666666-6666-6666-6666-666666666666';

function mockCampaignItem(quizStatus = 'PUBLISHED') {
  return {
    id: campaignItemId,
    quizId: 'quiz-1',
    quiz: {
      id: 'quiz-1',
      title: 'Phishing Check',
      passThresholdPercentage: 70,
      difficultyLevel: 'BEGINNER',
      status: quizStatus,
      questions: [
        {
          id: questionId,
          prompt: 'Is this phishing?',
          questionType: 'SINGLE_CHOICE',
          position: 1,
          points: 5,
          answerOptions: [
            {
              id: optionId1,
              label: 'A',
              text: 'Yes',
              isCorrect: true,
              position: 1,
              feedbackText: 'Correct feedback',
            },
          ],
        },
      ],
    },
    campaign: {
      assignments: [
        {
          id: 'assign-1',
          traineeProfileId: 'trainee-profile-id',
          assignmentStatus: 'ASSIGNED',
        },
      ],
    },
  };
}

function mockQuizAttempt(status = 'IN_PROGRESS') {
  return {
    id: attemptId,
    status,
    quiz: {
      passThresholdPercentage: 50,
      questions: [
        {
          id: questionId,
          points: 5,
          questionType: 'SINGLE_CHOICE',
          answerOptions: [
            { id: optionId1, isCorrect: true },
            { id: optionId2, isCorrect: false },
          ],
        },
      ],
    },
  };
}

function mockMultipleChoiceQuizAttempt(status = 'IN_PROGRESS') {
  return {
    id: attemptId,
    status,
    quiz: {
      passThresholdPercentage: 50,
      questions: [
        {
          id: questionId,
          points: 5,
          questionType: 'MULTIPLE_CHOICE',
          answerOptions: [
            { id: optionId1, isCorrect: true },
            { id: optionId2, isCorrect: false },
          ],
        },
      ],
    },
  };
}

describe('Quiz API Routes', () => {
  const token = generateAuthToken('trainee-user-id').token;

  beforeEach(() => {
    vi.clearAllMocks();
    clearAuthRateLimitStore();

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'trainee-user-id',
      email: 'trainee@example.com',
      firstName: 'Ava',
      lastName: 'Trainee',
      userType: 'ORGANISATION_TRAINEE',
      authStatus: 'ACTIVE',
      createdAt: new Date(),
    });

    mockPrisma.traineeProfile.findUnique.mockResolvedValue({
      id: 'trainee-profile-id',
      userId: 'trainee-user-id',
      traineeStatus: 'ACTIVE',
    });

    mockPrisma.traineeProfile.findFirst.mockResolvedValue({
      id: 'trainee-profile-id',
      userId: 'trainee-user-id',
      traineeStatus: 'ACTIVE',
    });
  });

  describe('GET /trainee/campaign-items/:campaignItemId/quiz', () => {
    it('returns 401 if unauthenticated', async () => {
      const response = await request(createApp()).get(
        `/trainee/campaign-items/${campaignItemId}/quiz`,
      );
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'AUTH_REQUIRED');
    });

    it('returns 400 VALIDATION_ERROR for malformed UUID campaignItemId', async () => {
      const response = await request(createApp())
        .get('/trainee/campaign-items/invalid-uuid/quiz')
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
    });

    it('returns 404 if quiz or campaign item not found', async () => {
      mockPrisma.campaignItem.findFirst.mockResolvedValue(null);
      const response = await request(createApp())
        .get(`/trainee/campaign-items/${campaignItemId}/quiz`)
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'NOT_FOUND');
    });

    it('returns safe quiz without exposing isCorrect or feedbackText before submission', async () => {
      mockPrisma.campaignItem.findFirst.mockResolvedValue(mockCampaignItem());
      const response = await request(createApp())
        .get(`/trainee/campaign-items/${campaignItemId}/quiz`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 'quiz-1');
      expect(response.body.questions[0].options[0]).toHaveProperty('id', optionId1);
      expect(response.body.questions[0].options[0]).not.toHaveProperty('isCorrect');
      expect(response.body.questions[0].options[0]).not.toHaveProperty('feedbackText');
    });

    it('returns 403 Forbidden for inactive trainee profile', async () => {
      mockPrisma.traineeProfile.findFirst.mockResolvedValue(null);
      const response = await request(createApp())
        .get(`/trainee/campaign-items/${campaignItemId}/quiz`)
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'FORBIDDEN');
      expect(response.body.message).toContain('User is not a trainee');
    });
  });

  describe('POST /trainee/campaign-items/:campaignItemId/quiz/attempts', () => {
    it('successfully starts attempt and returns attempt payload', async () => {
      mockPrisma.campaignItem.findFirst.mockResolvedValue(mockCampaignItem());
      mockPrisma.quizAttempt.findFirst.mockResolvedValue(null);
      mockPrisma.quizAttempt.create.mockResolvedValue({
        id: attemptId,
        quizId: 'quiz-1',
        traineeProfileId: 'trainee-profile-id',
        campaignItemId,
        campaignAssignmentId: 'assign-1',
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      });

      const response = await request(createApp())
        .post(`/trainee/campaign-items/${campaignItemId}/quiz/attempts`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('attemptId', attemptId);
      expect(response.body).toHaveProperty('status', 'IN_PROGRESS');
    });

    it('rejects attempt creation with extra body properties (strict schema check)', async () => {
      const response = await request(createApp())
        .post(`/trainee/campaign-items/${campaignItemId}/quiz/attempts`)
        .set('Authorization', `Bearer ${token}`)
        .send({ extraField: 'not-allowed' });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
    });
  });

  describe('POST /quiz-attempts/:attemptId/submit', () => {
    it('returns 400 VALIDATION_ERROR on malformed UUID attemptId', async () => {
      const response = await request(createApp())
        .post('/quiz-attempts/invalid-uuid/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({ answers: [{ questionId, selectedOptionIds: [optionId1] }] });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
    });

    it('rejects extra body parameters (strict schema check)', async () => {
      const response = await request(createApp())
        .post(`/quiz-attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          answers: [{ questionId, selectedOptionIds: [optionId1] }],
          score: 100,
          isCorrect: true,
        });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
    });

    it('rejects submission with duplicate option IDs', async () => {
      mockPrisma.quizAttempt.findFirst.mockResolvedValue(mockMultipleChoiceQuizAttempt());
      const response = await request(createApp())
        .post(`/quiz-attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${token}`)
        .send({ answers: [{ questionId, selectedOptionIds: [optionId1, optionId1] }] });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Duplicate options selected');
    });

    it('rejects submission with option IDs from another question', async () => {
      mockPrisma.quizAttempt.findFirst.mockResolvedValue(mockMultipleChoiceQuizAttempt());
      const response = await request(createApp())
        .post(`/quiz-attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${token}`)
        .send({ answers: [{ questionId, selectedOptionIds: [optionId1, optionId3] }] });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid options selected');
    });

    it('submits successfully and scores attempt', async () => {
      mockPrisma.quizAttempt.findFirst.mockResolvedValue(mockQuizAttempt());
      const response = await request(createApp())
        .post(`/quiz-attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${token}`)
        .send({ answers: [{ questionId, selectedOptionIds: [optionId1] }] });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        attemptId,
        status: 'SUBMITTED',
      });
    });

    it('returns 409 Conflict on duplicate submission', async () => {
      mockPrisma.quizAttempt.findFirst.mockResolvedValue(mockQuizAttempt('SUBMITTED'));
      const response = await request(createApp())
        .post(`/quiz-attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${token}`)
        .send({ answers: [{ questionId, selectedOptionIds: [optionId1] }] });
      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error', 'CONFLICT');
    });

    it('rejects submission with unknown question ID', async () => {
      mockPrisma.quizAttempt.findFirst.mockResolvedValue(mockQuizAttempt());
      const response = await request(createApp())
        .post(`/quiz-attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          answers: [
            { questionId, selectedOptionIds: [optionId1] },
            { questionId: '99999999-9999-9999-9999-999999999999', selectedOptionIds: [optionId1] },
          ],
        });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Submitted answer for unknown question ID');
    });

    it('rejects submission with duplicate question IDs', async () => {
      mockPrisma.quizAttempt.findFirst.mockResolvedValue(mockQuizAttempt());
      const response = await request(createApp())
        .post(`/quiz-attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          answers: [
            { questionId, selectedOptionIds: [optionId1] },
            { questionId, selectedOptionIds: [optionId1] },
          ],
        });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Duplicate question answers submitted');
    });

    it('rejects submission with multiple options selected for a single-choice question', async () => {
      mockPrisma.quizAttempt.findFirst.mockResolvedValue(mockQuizAttempt());
      const response = await request(createApp())
        .post(`/quiz-attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          answers: [{ questionId, selectedOptionIds: [optionId1, optionId2] }],
        });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('must have exactly one selected option');
    });
  });
  describe('GET /quiz-attempts/:attemptId/results', () => {
    it('returns 403 Forbidden before the attempt is submitted', async () => {
      mockPrisma.quizAttempt.findFirst.mockResolvedValue(mockQuizAttempt('IN_PROGRESS'));
      const response = await request(createApp())
        .get(`/quiz-attempts/${attemptId}/results`)
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'FORBIDDEN');
    });

    it('returns 200 with result summary and feedback after submission', async () => {
      mockPrisma.quizAttempt.findFirst.mockResolvedValue({
        id: attemptId,
        quizId: 'quiz-1',
        campaignItemId,
        campaignAssignmentId: 'assign-1',
        status: 'SUBMITTED',
        quizResult: { scorePercentage: 100, passed: true, summary: 'Well done' },
        answers: [
          {
            questionId,
            isCorrect: true,
            awardedPoints: 5,
            feedbackShown: 'Correct!',
            selectedOptions: [
              {
                answerOption: {
                  id: optionId1,
                  label: 'A',
                  text: 'Yes',
                  isCorrect: true,
                  feedbackText: 'Correct!',
                },
              },
            ],
          },
        ],
      });

      const response = await request(createApp())
        .get(`/quiz-attempts/${attemptId}/results`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('scorePercentage', 100);
      expect(response.body).toHaveProperty('passed', true);
      expect(response.body.answers[0].selectedOptions[0]).toHaveProperty(
        'feedbackText',
        'Correct!',
      );
    });
  });
});

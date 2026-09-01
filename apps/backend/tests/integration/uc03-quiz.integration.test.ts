import request from 'supertest';
import { loginTestUser } from '../helpers/auth.js';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearAuthRateLimitStore } from '../../src/middleware/authRateLimit.js';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import {
  createTrainee,
  createCampaign,
  createQuiz,
  createQuizQuestion,
  createAnswerOption,
  createCampaignItem,
  createCampaignAssignment,
} from '../helpers/factories.js';
import {
  CampaignStatus,
  CampaignComponentType,
  QuizStatus,
  QuestionType,
} from '../../src/generated/prisma/enums.js';

describe('UC-03 Quiz Integration Tests', () => {
  beforeEach(() => {
    clearAuthRateLimitStore();
  });

  async function setupQuizFixture() {
    const { user, traineeProfile } = await createTrainee();

    const campaign = await createCampaign({
      status: CampaignStatus.ACTIVE,
    });

    const quiz = await createQuiz({
      status: QuizStatus.PUBLISHED,
      passThresholdPercentage: 70,
    });

    const question = await createQuizQuestion({
      quizId: quiz.id,
      prompt: 'Is sharing passwords secure?',
      questionType: QuestionType.SINGLE_CHOICE,
      position: 1,
      points: 10,
    });

    const correctOption = await createAnswerOption({
      questionId: question.id,
      label: 'A',
      text: 'No, never',
      isCorrect: true,
      position: 1,
      feedbackText: 'Correct. Sharing passwords is a security risk.',
    });

    const incorrectOption = await createAnswerOption({
      questionId: question.id,
      label: 'B',
      text: 'Yes, with colleagues',
      isCorrect: false,
      position: 2,
      feedbackText: 'Incorrect. Password sharing is dangerous.',
    });

    const campaignItem = await createCampaignItem({
      campaignId: campaign.id,
      componentType: CampaignComponentType.QUIZ,
      quizId: quiz.id,
    });

    const assignment = await createCampaignAssignment({
      campaignId: campaign.id,
      traineeProfileId: traineeProfile.id,
    });

    // Login to get token
    const loginResponse = await loginTestUser(user.email);

    const token = loginResponse.body.token;

    return {
      user,
      traineeProfile,
      campaign,
      quiz,
      question,
      correctOption,
      incorrectOption,
      campaignItem,
      assignment,
      token,
    };
  }

  it('gets a quiz structure successfully without exposing correctness details', async () => {
    const fixture = await setupQuizFixture();

    const response = await request(createApp())
      .get(`/trainee/campaign-items/${fixture.campaignItem.id}/quiz`)
      .set('Authorization', `Bearer ${fixture.token}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(fixture.quiz.id);
    expect(response.body.title).toBe(fixture.quiz.title);
    expect(response.body.questions.length).toBe(1);
    expect(response.body.questions[0].id).toBe(fixture.question.id);
    expect(response.body.questions[0].prompt).toBe(fixture.question.prompt);

    // Crucial safety check: correct options and feedback should not be sent to trainees taking the quiz
    expect(response.body.questions[0].options[0].id).toBe(fixture.correctOption.id);
    expect(response.body.questions[0].options[0].isCorrect).toBeUndefined();
    expect(response.body.questions[0].options[0].feedbackText).toBeUndefined();
  });

  it('starts a new quiz attempt and then reuses it without duplicating', async () => {
    const fixture = await setupQuizFixture();

    // 1. Verify no attempts exist initially
    const initialAttempts = await prisma.quizAttempt.count({
      where: {
        traineeProfileId: fixture.traineeProfile.id,
        quizId: fixture.quiz.id,
      },
    });
    expect(initialAttempts).toBe(0);

    // 2. Start attempt
    const startResponse = await request(createApp())
      .post(`/trainee/campaign-items/${fixture.campaignItem.id}/quiz/attempts`)
      .set('Authorization', `Bearer ${fixture.token}`)
      .send();

    expect(startResponse.status).toBe(201);
    const attemptId = startResponse.body.attemptId;
    expect(attemptId).toBeDefined();
    expect(startResponse.body.status).toBe('IN_PROGRESS');

    // Assert database contains the row
    const dbAttempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
    });
    expect(dbAttempt).not.toBeNull();
    expect(dbAttempt!.status).toBe('IN_PROGRESS');
    expect(dbAttempt!.campaignItemId).toBe(fixture.campaignItem.id);
    expect(dbAttempt!.campaignAssignmentId).toBe(fixture.assignment.id);

    // 3. Start again to reuse
    const reuseResponse = await request(createApp())
      .post(`/trainee/campaign-items/${fixture.campaignItem.id}/quiz/attempts`)
      .set('Authorization', `Bearer ${fixture.token}`)
      .send();

    expect(reuseResponse.status).toBe(201);
    expect(reuseResponse.body.attemptId).toBe(attemptId);
    expect(reuseResponse.body.status).toBe('IN_PROGRESS');

    // Confirm that only 1 attempt exists in the database
    const finalAttemptsCount = await prisma.quizAttempt.count({
      where: {
        traineeProfileId: fixture.traineeProfile.id,
        quizId: fixture.quiz.id,
      },
    });
    expect(finalAttemptsCount).toBe(1);
  });

  it('submits a quiz attempt, grading answers and persisting options', async () => {
    const fixture = await setupQuizFixture();

    // Start the attempt
    const startResponse = await request(createApp())
      .post(`/trainee/campaign-items/${fixture.campaignItem.id}/quiz/attempts`)
      .set('Authorization', `Bearer ${fixture.token}`)
      .send();
    const attemptId = startResponse.body.attemptId;

    // Submit with correct option selected
    const submitResponse = await request(createApp())
      .post(`/quiz-attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${fixture.token}`)
      .send({
        answers: [
          {
            questionId: fixture.question.id,
            selectedOptionIds: [fixture.correctOption.id],
          },
        ],
      });

    expect(submitResponse.status).toBe(200);
    expect(submitResponse.body.success).toBe(true);
    expect(submitResponse.body.status).toBe('SUBMITTED');

    // Verify DB attempt status
    const dbAttempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        answers: {
          include: {
            selectedOptions: true,
          },
        },
        quizResult: true,
      },
    });

    expect(dbAttempt!.status).toBe('SUBMITTED');
    expect(dbAttempt!.submittedAt).not.toBeNull();

    // Verify answers and options persisted
    expect(dbAttempt!.answers.length).toBe(1);
    expect(dbAttempt!.answers[0].questionId).toBe(fixture.question.id);
    expect(dbAttempt!.answers[0].isCorrect).toBe(true);
    expect(dbAttempt!.answers[0].awardedPoints).toBe(10);
    expect(dbAttempt!.answers[0].selectedOptions.length).toBe(1);
    expect(dbAttempt!.answers[0].selectedOptions[0].answerOptionId).toBe(fixture.correctOption.id);

    // Verify quiz result is computed and stored
    expect(dbAttempt!.quizResult).not.toBeNull();
    expect(dbAttempt!.quizResult!.scorePercentage).toBe(100);
    expect(dbAttempt!.quizResult!.passed).toBe(true);
  });

  it('retrieves graded quiz attempt results successfully', async () => {
    const fixture = await setupQuizFixture();

    // Start and submit the attempt
    const startResponse = await request(createApp())
      .post(`/trainee/campaign-items/${fixture.campaignItem.id}/quiz/attempts`)
      .set('Authorization', `Bearer ${fixture.token}`)
      .send();
    const attemptId = startResponse.body.attemptId;

    await request(createApp())
      .post(`/quiz-attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${fixture.token}`)
      .send({
        answers: [
          {
            questionId: fixture.question.id,
            selectedOptionIds: [fixture.correctOption.id],
          },
        ],
      });

    // Fetch results
    const response = await request(createApp())
      .get(`/quiz-attempts/${attemptId}/results`)
      .set('Authorization', `Bearer ${fixture.token}`);

    expect(response.status).toBe(200);
    expect(response.body.scorePercentage).toBe(100);
    expect(response.body.passed).toBe(true);
    expect(response.body.answers.length).toBe(1);
    expect(response.body.answers[0].questionId).toBe(fixture.question.id);
    expect(response.body.answers[0].isCorrect).toBe(true);
    expect(response.body.answers[0].awardedPoints).toBe(10);
    expect(response.body.answers[0].feedbackShown).toBeNull();
    expect(response.body.answers[0].selectedOptions.length).toBe(1);
    expect(response.body.answers[0].selectedOptions[0].optionId).toBe(fixture.correctOption.id);
    expect(response.body.answers[0].selectedOptions[0].label).toBe(fixture.correctOption.label);
    expect(response.body.answers[0].selectedOptions[0].text).toBe(fixture.correctOption.text);
    expect(response.body.answers[0].selectedOptions[0].isCorrect).toBe(true);
    expect(response.body.answers[0].selectedOptions[0].feedbackText).toBe(
      fixture.correctOption.feedbackText,
    );
  });

  it('returns existing submitted currentAttempt summary when reopening quiz', async () => {
    const fixture = await setupQuizFixture();

    const startResponse = await request(createApp())
      .post(`/trainee/campaign-items/${fixture.campaignItem.id}/quiz/attempts`)
      .set('Authorization', `Bearer ${fixture.token}`)
      .send();
    const attemptId = startResponse.body.attemptId;

    await request(createApp())
      .post(`/quiz-attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${fixture.token}`)
      .send({
        answers: [
          {
            questionId: fixture.question.id,
            selectedOptionIds: [fixture.correctOption.id],
          },
        ],
      });

    const getResponse = await request(createApp())
      .get(`/trainee/campaign-items/${fixture.campaignItem.id}/quiz`)
      .set('Authorization', `Bearer ${fixture.token}`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.currentAttempt).toEqual({
      attemptId,
      status: 'SUBMITTED',
      hasResult: true,
    });
  });
});

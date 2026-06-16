import request from 'supertest';
import { loginTestUser } from '../helpers/auth.js';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { clearAuthRateLimitStore } from '../../src/middleware/authRateLimit.js';
import {
  createTrainee,
  createCampaign,
  createSimulation,
  createSimulatedInbox,
  createSimulatedEmail,
  createQuiz,
  createCampaignItem,
  createCampaignAssignment,
  createTrainingDocument,
} from '../helpers/factories.js';
import {
  CampaignStatus,
  CampaignComponentType,
  QuizStatus,
  InboxStatus,
  EmailClassification,
  TrainingDocumentStatus,
} from '../../src/generated/prisma/enums.js';

describe('Access Control and Negative Integration Tests', () => {
  beforeEach(() => {
    clearAuthRateLimitStore();
  });

  async function setupAccessControlFixture() {
    // 1. Create Trainee A and Trainee B
    const traineeA = await createTrainee();
    const traineeB = await createTrainee();

    // 2. Create Active Campaigns A and B
    const campaignA = await createCampaign({ status: CampaignStatus.ACTIVE });
    const campaignB = await createCampaign({ status: CampaignStatus.ACTIVE });

    // 3. Assign Campaign A to Trainee A, and Campaign B to Trainee B
    const assignmentA = await createCampaignAssignment({
      campaignId: campaignA.id,
      traineeProfileId: traineeA.traineeProfile.id,
    });
    const assignmentB = await createCampaignAssignment({
      campaignId: campaignB.id,
      traineeProfileId: traineeB.traineeProfile.id,
    });

    // 4. Create Quiz items for each campaign
    const quizA = await createQuiz({ status: QuizStatus.PUBLISHED });
    const quizB = await createQuiz({ status: QuizStatus.PUBLISHED });

    const quizItemA = await createCampaignItem({
      campaignId: campaignA.id,
      componentType: CampaignComponentType.QUIZ,
      quizId: quizA.id,
    });
    const quizItemB = await createCampaignItem({
      campaignId: campaignB.id,
      componentType: CampaignComponentType.QUIZ,
      quizId: quizB.id,
    });

    // 5. Create Training Documents for each campaign
    const docA = await createTrainingDocument({ status: TrainingDocumentStatus.AVAILABLE });
    const docB = await createTrainingDocument({ status: TrainingDocumentStatus.AVAILABLE });

    const trainingItemA = await createCampaignItem({
      campaignId: campaignA.id,
      componentType: CampaignComponentType.TRAINING_DOCUMENT,
      trainingDocumentId: docA.id,
    });
    const trainingItemB = await createCampaignItem({
      campaignId: campaignB.id,
      componentType: CampaignComponentType.TRAINING_DOCUMENT,
      trainingDocumentId: docB.id,
    });

    // 6. Create Simulations and Simulated Inboxes for each campaign
    const simA = await createSimulation();
    const simB = await createSimulation();

    const inboxA = await createSimulatedInbox({
      simulationId: simA.id,
      status: InboxStatus.ACTIVE,
    });
    const inboxB = await createSimulatedInbox({
      simulationId: simB.id,
      status: InboxStatus.ACTIVE,
    });

    const inboxItemA = await createCampaignItem({
      campaignId: campaignA.id,
      componentType: CampaignComponentType.SIMULATED_INBOX,
      simulationId: simA.id,
    });
    const inboxItemB = await createCampaignItem({
      campaignId: campaignB.id,
      componentType: CampaignComponentType.SIMULATED_INBOX,
      simulationId: simB.id,
    });

    // 7. Seed Simulated Emails for each inbox
    const emailA = await createSimulatedEmail({
      inboxId: inboxA.id,
      expectedClassification: EmailClassification.SAFE,
    });
    const emailB = await createSimulatedEmail({
      inboxId: inboxB.id,
      expectedClassification: EmailClassification.PHISHING,
    });

    // 8. Log in both trainees to retrieve JWT tokens
    const loginA = await loginTestUser(traineeA.user.email);
    const tokenA = loginA.body.token;

    const loginB = await loginTestUser(traineeB.user.email);
    const tokenB = loginB.body.token;

    return {
      traineeA,
      traineeB,
      campaignA,
      campaignB,
      assignmentA,
      assignmentB,
      quizA,
      quizB,
      quizItemA,
      quizItemB,
      docA,
      docB,
      trainingItemA,
      trainingItemB,
      inboxItemA,
      inboxItemB,
      emailA,
      emailB,
      tokenA,
      tokenB,
    };
  }

  describe('Step 2: Negative (Not Found) Paths', () => {
    const nonExistentUuid = '99999999-9999-9999-9999-999999999999';

    it('returns 404 for a training document that does not exist', async () => {
      const fixture = await setupAccessControlFixture();
      const response = await request(createApp())
        .get(`/trainee/campaign-items/${nonExistentUuid}/training-document`)
        .set('Authorization', `Bearer ${fixture.tokenA}`);

      expect(response.status).toBe(404);
    });

    it('returns 404 for a simulated email that does not exist', async () => {
      const fixture = await setupAccessControlFixture();
      const response = await request(createApp())
        .get(`/trainee/campaign-items/${fixture.inboxItemA.id}/simulated-emails/${nonExistentUuid}`)
        .set('Authorization', `Bearer ${fixture.tokenA}`);

      expect(response.status).toBe(404);
    });

    it('returns 404 for a quiz attempt that does not exist', async () => {
      const fixture = await setupAccessControlFixture();
      const response = await request(createApp())
        .get(`/quiz-attempts/${nonExistentUuid}/results`)
        .set('Authorization', `Bearer ${fixture.tokenA}`);

      expect(response.status).toBe(404);
    });

    it('returns 404 for a simulated inbox that does not exist', async () => {
      const fixture = await setupAccessControlFixture();
      const response = await request(createApp())
        .get(`/trainee/campaign-items/${nonExistentUuid}/simulated-inbox`)
        .set('Authorization', `Bearer ${fixture.tokenA}`);

      expect(response.status).toBe(404);
    });
  });

  describe('Step 3: Cross-User / Access Control Paths', () => {
    it('returns 403 Forbidden when Trainee A fetches Trainee B simulated inbox', async () => {
      const fixture = await setupAccessControlFixture();
      const response = await request(createApp())
        .get(`/trainee/campaign-items/${fixture.inboxItemB.id}/simulated-inbox`)
        .set('Authorization', `Bearer ${fixture.tokenA}`);

      expect(response.status).toBe(403);
    });

    it('returns 403 Forbidden when Trainee A fetches Trainee B simulated email details', async () => {
      const fixture = await setupAccessControlFixture();
      const response = await request(createApp())
        .get(
          `/trainee/campaign-items/${fixture.inboxItemB.id}/simulated-emails/${fixture.emailB.id}`,
        )
        .set('Authorization', `Bearer ${fixture.tokenA}`);

      expect(response.status).toBe(403);
    });

    it('returns 404 or 403 when Trainee A attempts to fetch or submit Trainee B quiz attempt', async () => {
      const fixture = await setupAccessControlFixture();

      // Trainee B starts a quiz attempt
      const attemptResponse = await request(createApp())
        .post(`/trainee/campaign-items/${fixture.quizItemB.id}/quiz/attempts`)
        .set('Authorization', `Bearer ${fixture.tokenB}`);
      const attemptId = attemptResponse.body.attemptId;

      // Trainee A attempts to fetch results of Trainee B's attempt
      const fetchResponse = await request(createApp())
        .get(`/quiz-attempts/${attemptId}/results`)
        .set('Authorization', `Bearer ${fixture.tokenA}`);
      expect([403, 404]).toContain(fetchResponse.status);

      // Trainee A attempts to submit Trainee B's attempt
      const submitResponse = await request(createApp())
        .post(`/quiz-attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${fixture.tokenA}`)
        .send({
          answers: [
            {
              questionId: '99999999-9999-9999-9999-999999999999',
              selectedOptionIds: ['99999999-9999-9999-9999-999999999999'],
            },
          ],
        });
      expect([403, 404]).toContain(submitResponse.status);
    });

    it('returns 404 Not Found when Trainee A attempts to view a training document for a campaign item belonging to Trainee B', async () => {
      const fixture = await setupAccessControlFixture();
      const response = await request(createApp())
        .get(`/trainee/campaign-items/${fixture.trainingItemB.id}/training-document`)
        .set('Authorization', `Bearer ${fixture.tokenA}`);

      expect(response.status).toBe(404);
    });

    it('returns 404 Not Found when Trainee A attempts to complete a training document belonging to Trainee B', async () => {
      const fixture = await setupAccessControlFixture();
      const response = await request(createApp())
        .post(`/trainee/campaign-items/${fixture.trainingItemB.id}/training-document/completed`)
        .set('Authorization', `Bearer ${fixture.tokenA}`)
        .send();

      expect([403, 404]).toContain(response.status);
    });

    it('returns 404 Not Found when Trainee A attempts to retrieve a campaign item they are not assigned to', async () => {
      const fixture = await setupAccessControlFixture();
      const response = await request(createApp())
        .get(`/trainee/campaign-items/${fixture.trainingItemB.id}/training-document`)
        .set('Authorization', `Bearer ${fixture.tokenA}`);

      expect(response.status).toBe(404);
    });
  });
});

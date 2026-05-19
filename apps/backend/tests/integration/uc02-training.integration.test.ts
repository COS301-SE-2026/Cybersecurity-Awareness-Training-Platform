import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import {
  createTrainee,
  createCampaign,
  createTrainingDocument,
  createCampaignItem,
  createCampaignAssignment,
} from '../helpers/factories.js';
import {
  CampaignStatus,
  TrainingDocumentStatus,
  CampaignComponentType,
} from '../../src/generated/prisma/enums.js';

describe('UC-02 Training Document Integration Tests', () => {
  async function setupTrainingFixture() {
    const { user, traineeProfile } = await createTrainee();

    const campaign = await createCampaign({
      status: CampaignStatus.ACTIVE,
    });

    const trainingDoc = await createTrainingDocument({
      status: TrainingDocumentStatus.AVAILABLE,
    });

    const campaignItem = await createCampaignItem({
      campaignId: campaign.id,
      componentType: CampaignComponentType.TRAINING_DOCUMENT,
      trainingDocumentId: trainingDoc.id,
    });

    const assignment = await createCampaignAssignment({
      campaignId: campaign.id,
      traineeProfileId: traineeProfile.id,
    });

    const loginResponse = await request(createApp()).post('/auth/login').send({
      email: user.email,
      password: 'password',
    });

    const token = loginResponse.body.token;

    return {
      user,
      traineeProfile,
      campaign,
      trainingDoc,
      campaignItem,
      assignment,
      token,
    };
  }

  it('gets a training document successfully', async () => {
    const fixture = await setupTrainingFixture();

    const response = await request(createApp())
      .get(`/trainee/campaign-items/${fixture.campaignItem.id}/training-document`)
      .set('Authorization', `Bearer ${fixture.token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      campaignItemId: fixture.campaignItem.id,
      campaignAssignmentId: fixture.assignment.id,
      trainingDocument: {
        id: fixture.trainingDoc.id,
        title: fixture.trainingDoc.title,
        contentType: fixture.trainingDoc.contentType,
        contentRef: fixture.trainingDoc.contentRef,
        contentSummary: fixture.trainingDoc.contentSummary,
        estimatedReadTimeMinutes: fixture.trainingDoc.estimatedReadTimeMinutes,
        difficultyLevel: fixture.trainingDoc.difficultyLevel,
        status: fixture.trainingDoc.status,
      },
      campaignItem: {
        title: fixture.campaignItem.title,
        description: fixture.campaignItem.description,
        position: fixture.campaignItem.position,
        isRequired: fixture.campaignItem.isRequired,
        availabilityStatus: fixture.campaignItem.availabilityStatus,
      },
    });
  });

  it('marks a training document as viewed and asserts persisted interaction in database', async () => {
    const fixture = await setupTrainingFixture();

    // Verify no interaction events exist initially
    const initialCount = await prisma.interactionEvent.count({
      where: {
        traineeProfileId: fixture.traineeProfile.id,
        campaignItemId: fixture.campaignItem.id,
      },
    });
    expect(initialCount).toBe(0);

    const response = await request(createApp())
      .post(`/trainee/campaign-items/${fixture.campaignItem.id}/training-document/viewed`)
      .set('Authorization', `Bearer ${fixture.token}`)
      .send();

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.campaignItemId).toBe(fixture.campaignItem.id);
    expect(response.body.trainingDocumentId).toBe(fixture.trainingDoc.id);
    expect(response.body.event).toBeDefined();
    expect(response.body.event.eventType).toBe('TRAINING_VIEWED');

    // Assert that the interaction event is persisted in the database
    const persistedEvent = await prisma.interactionEvent.findFirst({
      where: {
        traineeProfileId: fixture.traineeProfile.id,
        campaignItemId: fixture.campaignItem.id,
        eventType: 'TRAINING_VIEWED',
      },
    });

    expect(persistedEvent).not.toBeNull();
    expect(persistedEvent!.campaignAssignmentId).toBe(fixture.assignment.id);
    expect(persistedEvent!.targetType).toBe('TRAINING_DOCUMENT');
    expect(persistedEvent!.targetId).toBe(fixture.trainingDoc.id);
    expect(persistedEvent!.trainingDocumentId).toBe(fixture.trainingDoc.id);
  });

  it('marks a training document as completed and asserts persisted interaction in database', async () => {
    const fixture = await setupTrainingFixture();

    // Verify no interaction events exist initially
    const initialCount = await prisma.interactionEvent.count({
      where: {
        traineeProfileId: fixture.traineeProfile.id,
        campaignItemId: fixture.campaignItem.id,
      },
    });
    expect(initialCount).toBe(0);

    const response = await request(createApp())
      .post(`/trainee/campaign-items/${fixture.campaignItem.id}/training-document/completed`)
      .set('Authorization', `Bearer ${fixture.token}`)
      .send();

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.campaignItemId).toBe(fixture.campaignItem.id);
    expect(response.body.trainingDocumentId).toBe(fixture.trainingDoc.id);
    expect(response.body.event).toBeDefined();
    expect(response.body.event.eventType).toBe('TRAINING_COMPLETED');

    // Assert that the interaction event is persisted in the database
    const persistedEvent = await prisma.interactionEvent.findFirst({
      where: {
        traineeProfileId: fixture.traineeProfile.id,
        campaignItemId: fixture.campaignItem.id,
        eventType: 'TRAINING_COMPLETED',
      },
    });

    expect(persistedEvent).not.toBeNull();
    expect(persistedEvent!.campaignAssignmentId).toBe(fixture.assignment.id);
    expect(persistedEvent!.targetType).toBe('TRAINING_DOCUMENT');
    expect(persistedEvent!.targetId).toBe(fixture.trainingDoc.id);
    expect(persistedEvent!.trainingDocumentId).toBe(fixture.trainingDoc.id);
  });
});

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
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
  let token: string;
  let campaignItemId: string;
  let campaignAssignmentId: string;
  let traineeProfileId: string;
  let trainingDocId: string;
  let trainingDocTitle: string;
  let trainingDocContentType: any;
  let trainingDocContentRef: string;
  let trainingDocContentSummary: string | null;
  let trainingDocEstimatedReadTimeMinutes: number | null;
  let trainingDocDifficultyLevel: any;
  let trainingDocStatus: any;
  let campaignItemTitle: string;
  let campaignItemDescription: string | null;
  let campaignItemPosition: number;
  let campaignItemIsRequired: boolean;
  let campaignItemAvailabilityStatus: any;

  beforeEach(async () => {
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

    const loginResponse = await request(createApp())
      .post('/auth/login')
      .send({
        email: user.email,
        password: ['pass', 'word'].join(''),
      });

    token = loginResponse.body.token;
    campaignItemId = campaignItem.id;
    campaignAssignmentId = assignment.id;
    traineeProfileId = traineeProfile.id;
    trainingDocId = trainingDoc.id;
    trainingDocTitle = trainingDoc.title;
    trainingDocContentType = trainingDoc.contentType;
    trainingDocContentRef = trainingDoc.contentRef;
    trainingDocContentSummary = trainingDoc.contentSummary;
    trainingDocEstimatedReadTimeMinutes = trainingDoc.estimatedReadTimeMinutes;
    trainingDocDifficultyLevel = trainingDoc.difficultyLevel;
    trainingDocStatus = trainingDoc.status;
    campaignItemTitle = campaignItem.title;
    campaignItemDescription = campaignItem.description;
    campaignItemPosition = campaignItem.position;
    campaignItemIsRequired = campaignItem.isRequired;
    campaignItemAvailabilityStatus = campaignItem.availabilityStatus;
  });

  async function assertTrainingInteraction(
    action: 'viewed' | 'completed',
    eventType: 'TRAINING_VIEWED' | 'TRAINING_COMPLETED',
  ) {
    // Verify no interaction events exist initially
    const initialCount = await prisma.interactionEvent.count({
      where: {
        traineeProfileId,
        campaignItemId,
      },
    });
    expect(initialCount).toBe(0);

    const response = await request(createApp())
      .post(`/trainee/campaign-items/${campaignItemId}/training-document/${action}`)
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.campaignItemId).toBe(campaignItemId);
    expect(response.body.trainingDocumentId).toBe(trainingDocId);
    expect(response.body.event).toBeDefined();
    expect(response.body.event.eventType).toBe(eventType);

    // Assert that the interaction event is persisted in the database
    const persistedEvent = await prisma.interactionEvent.findFirst({
      where: {
        traineeProfileId,
        campaignItemId,
        eventType,
      },
    });

    expect(persistedEvent).not.toBeNull();
    expect(persistedEvent!.campaignAssignmentId).toBe(campaignAssignmentId);
    expect(persistedEvent!.targetType).toBe('TRAINING_DOCUMENT');
    expect(persistedEvent!.targetId).toBe(trainingDocId);
    expect(persistedEvent!.trainingDocumentId).toBe(trainingDocId);
  }

  it('gets a training document successfully', async () => {
    const response = await request(createApp())
      .get(`/trainee/campaign-items/${campaignItemId}/training-document`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      campaignItemId,
      campaignAssignmentId,
      trainingDocument: {
        id: trainingDocId,
        title: trainingDocTitle,
        contentType: trainingDocContentType,
        contentRef: trainingDocContentRef,
        contentSummary: trainingDocContentSummary,
        estimatedReadTimeMinutes: trainingDocEstimatedReadTimeMinutes,
        difficultyLevel: trainingDocDifficultyLevel,
        status: trainingDocStatus,
      },
      campaignItem: {
        title: campaignItemTitle,
        description: campaignItemDescription,
        position: campaignItemPosition,
        isRequired: campaignItemIsRequired,
        availabilityStatus: campaignItemAvailabilityStatus,
      },
    });
  });

  it('marks a training document as viewed and asserts persisted interaction in database', async () => {
    await assertTrainingInteraction('viewed', 'TRAINING_VIEWED');
  });

  it('marks a training document as completed and asserts persisted interaction in database', async () => {
    await assertTrainingInteraction('completed', 'TRAINING_COMPLETED');
  });
});

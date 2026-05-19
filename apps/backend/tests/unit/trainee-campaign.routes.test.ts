import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { generateAuthToken } from '../../src/services/auth-token.service.js';

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
  traineeProfile: {
    findFirst: vi.fn(),
  },
  campaignAssignment: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  interactionEvent: {
    findMany: vi.fn(),
  },
  quizAttempt: {
    findMany: vi.fn(),
  },
  emailClassificationResponse: {
    findMany: vi.fn(),
  },
}));

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

const userId = '11111111-1111-4111-8111-111111111111';
const traineeProfileId = '22222222-2222-4222-8222-222222222222';
const otherCampaignId = '33333333-3333-4333-8333-333333333333';
const campaignId = '44444444-4444-4444-8444-444444444444';
const assignmentId = '55555555-5555-4555-8555-555555555555';
const groupItemId = '66666666-6666-4666-8666-666666666666';
const quizItemId = '77777777-7777-4777-8777-777777777777';
const trainingItemId = '88888888-8888-4888-8888-888888888888';
const simulationItemId = '99999999-9999-4999-8999-999999999999';
const trainingDocumentId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const quizId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const simulationId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const user = {
  id: userId,
  firstName: 'Ava',
  lastName: 'Trainee',
  email: 'ava@example.com',
  passwordHash: 'hashed-password',
  userType: 'GENERAL_TRAINEE',
  authStatus: 'ACTIVE',
  createdAt: new Date('2026-05-16T08:00:00.000Z'),
  updatedAt: new Date('2026-05-16T08:00:00.000Z'),
};

const authHeader = () => `Bearer ${generateAuthToken(userId).token}`;

function campaignSummaryItems() {
  return [
    { id: groupItemId, availabilityStatus: 'AVAILABLE' },
    { id: trainingItemId, availabilityStatus: 'AVAILABLE' },
    { id: quizItemId, availabilityStatus: 'LOCKED' },
    { id: simulationItemId, availabilityStatus: 'AVAILABLE' },
  ];
}

function baseAssignment() {
  return {
    id: assignmentId,
    currentCampaignItemId: trainingItemId,
    assignedAt: new Date('2026-05-16T08:00:00.000Z'),
    dueDate: new Date('2026-06-16T08:00:00.000Z'),
    startedAt: new Date('2026-05-16T08:30:00.000Z'),
    completedAt: null,
    assignmentStatus: 'IN_PROGRESS',
    accessType: 'ASSIGNED',
    campaign: {
      id: campaignId,
      name: 'Phishing Fundamentals',
      description: 'Build safe email habits.',
      campaignType: 'PREMADE_GENERAL',
      difficultyLevel: 'BEGINNER',
      status: 'ACTIVE',
      startDate: new Date('2026-05-16T08:00:00.000Z'),
      endDate: null,
      items: campaignSummaryItems(),
    },
  };
}

function campaignItems() {
  return [
    {
      id: quizItemId,
      campaignId,
      parentGroupId: groupItemId,
      itemType: 'COMPONENT',
      componentType: 'QUIZ',
      groupType: null,
      completionRule: null,
      title: 'Phishing quiz',
      description: 'Check your judgement.',
      position: 2,
      isRequired: true,
      availabilityStatus: 'AVAILABLE',
      trainingDocument: null,
      quiz: {
        id: quizId,
        title: 'Phishing Check',
        description: 'Choose the safest action.',
        passThresholdPercentage: 70,
        difficultyLevel: 'BEGINNER',
        status: 'PUBLISHED',
        _count: { questions: 4 },
      },
      simulation: null,
    },
    {
      id: groupItemId,
      campaignId,
      parentGroupId: null,
      itemType: 'GROUP',
      componentType: null,
      groupType: 'MODULE',
      completionRule: 'COMPLETE_REQUIRED_ONLY',
      title: 'Email safety module',
      description: 'Work through the essentials.',
      position: 2,
      isRequired: true,
      availabilityStatus: 'AVAILABLE',
      trainingDocument: null,
      quiz: null,
      simulation: null,
    },
    {
      id: simulationItemId,
      campaignId,
      parentGroupId: null,
      itemType: 'COMPONENT',
      componentType: 'SIMULATED_INBOX',
      groupType: null,
      completionRule: null,
      title: 'Inbox drill',
      description: 'Classify the emails.',
      position: 3,
      isRequired: true,
      availabilityStatus: 'AVAILABLE',
      trainingDocument: null,
      quiz: null,
      simulation: {
        id: simulationId,
        title: 'Inbox Simulation',
        description: 'Practice with a realistic inbox.',
        difficultyLevel: 'BEGINNER',
        safetyStatus: 'APPROVED',
        simulatedInbox: { status: 'ACTIVE' },
      },
    },
    {
      id: trainingItemId,
      campaignId,
      parentGroupId: groupItemId,
      itemType: 'COMPONENT',
      componentType: 'TRAINING_DOCUMENT',
      groupType: null,
      completionRule: null,
      title: 'Phishing basics',
      description: 'Read this first.',
      position: 1,
      isRequired: true,
      availabilityStatus: 'AVAILABLE',
      trainingDocument: {
        id: trainingDocumentId,
        title: 'Identifying Phishing Emails',
        contentSummary: 'Common phishing indicators.',
        estimatedReadTimeMinutes: 8,
        difficultyLevel: 'BEGINNER',
        status: 'AVAILABLE',
      },
      quiz: null,
      simulation: null,
    },
  ];
}

function detailedAssignment() {
  return {
    ...baseAssignment(),
    campaign: {
      ...baseAssignment().campaign,
      items: campaignItems(),
    },
  };
}

function mockAuthenticatedTrainee() {
  prismaMock.user.findUnique.mockResolvedValue(user);
  prismaMock.traineeProfile.findFirst.mockResolvedValue({ id: traineeProfileId });
}

function mockNoProgress() {
  prismaMock.interactionEvent.findMany.mockResolvedValue([]);
  prismaMock.quizAttempt.findMany.mockResolvedValue([]);
  prismaMock.emailClassificationResponse.findMany.mockResolvedValue([]);
}

describe('Trainee campaign discovery routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticatedTrainee();
    mockNoProgress();
    prismaMock.campaignAssignment.findMany.mockResolvedValue([baseAssignment()]);
    prismaMock.campaignAssignment.findFirst.mockResolvedValue(detailedAssignment());
  });

  it('returns accessible campaigns for an authenticated active trainee', async () => {
    const response = await request(createApp())
      .get('/trainee/campaigns')
      .set('Authorization', authHeader());

    expect(response.status).toBe(200);
    expect(prismaMock.campaignAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          traineeProfileId,
          assignmentStatus: { in: ['AVAILABLE', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'] },
          campaign: { status: 'ACTIVE' },
        }),
      }),
    );
    expect(response.body.campaigns).toHaveLength(1);
    expect(response.body.campaigns[0]).toMatchObject({
      campaignId,
      name: 'Phishing Fundamentals',
      itemCount: 4,
      availableItemCount: 3,
      assignment: {
        assignmentId,
        assignmentStatus: 'IN_PROGRESS',
      },
    });
  });

  it('returns an empty campaign list for an active trainee with no accessible campaigns', async () => {
    prismaMock.campaignAssignment.findMany.mockResolvedValue([]);

    const response = await request(createApp())
      .get('/trainee/campaigns')
      .set('Authorization', authHeader());

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ campaigns: [] });
  });

  it('returns assigned campaign detail', async () => {
    const response = await request(createApp())
      .get(`/trainee/campaigns/${campaignId}`)
      .set('Authorization', authHeader());

    expect(response.status).toBe(200);
    expect(prismaMock.campaignAssignment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          campaignId,
          traineeProfileId,
          assignmentStatus: { in: ['AVAILABLE', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'] },
          campaign: { status: 'ACTIVE' },
        }),
      }),
    );
    expect(response.body).toMatchObject({
      campaignId,
      name: 'Phishing Fundamentals',
      assignment: {
        assignmentId,
      },
    });
  });

  it('denies cross-trainee campaign access safely', async () => {
    prismaMock.campaignAssignment.findFirst.mockResolvedValue(null);

    const response = await request(createApp())
      .get(`/trainee/campaigns/${otherCampaignId}`)
      .set('Authorization', authHeader());

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: 'CAMPAIGN_NOT_FOUND',
      message: 'Campaign was not found',
    });
  });

  it('returns validation error for malformed campaignId', async () => {
    const response = await request(createApp())
      .get('/trainee/campaigns/not-a-uuid')
      .set('Authorization', authHeader());

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
    expect(prismaMock.campaignAssignment.findFirst).not.toHaveBeenCalled();
  });

  it('returns safe 404 for missing or inaccessible campaign detail', async () => {
    prismaMock.campaignAssignment.findFirst.mockResolvedValue(null);

    const response = await request(createApp())
      .get(`/trainee/campaigns/${campaignId}`)
      .set('Authorization', authHeader());

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', 'CAMPAIGN_NOT_FOUND');
  });

  it('returns ordered campaign items and ordered group children', async () => {
    const response = await request(createApp())
      .get(`/trainee/campaigns/${campaignId}`)
      .set('Authorization', authHeader());

    expect(response.status).toBe(200);
    expect(response.body.items.map((item: any) => item.campaignItemId)).toEqual([
      groupItemId,
      simulationItemId,
    ]);
    expect(response.body.items[0].children.map((item: any) => item.campaignItemId)).toEqual([
      trainingItemId,
      quizItemId,
    ]);
    expect(response.body.items[0].children[0]).toHaveProperty('parentGroupId', groupItemId);
  });

  it('includes activityApiPath for supported component items', async () => {
    const response = await request(createApp())
      .get(`/trainee/campaigns/${campaignId}`)
      .set('Authorization', authHeader());

    const [group, simulation] = response.body.items;
    const [training, quiz] = group.children;

    expect(training.activityApiPath).toBe(
      `/trainee/campaign-items/${trainingItemId}/training-document`,
    );
    expect(quiz.activityApiPath).toBe(`/trainee/campaign-items/${quizItemId}/quiz`);
    expect(simulation.activityApiPath).toBe(
      `/trainee/campaign-items/${simulationItemId}/simulated-inbox`,
    );
  });

  it('marks group items as not openable and without an activity endpoint', async () => {
    const response = await request(createApp())
      .get(`/trainee/campaigns/${campaignId}`)
      .set('Authorization', authHeader());

    expect(response.body.items[0]).toMatchObject({
      itemType: 'GROUP',
      isOpenable: false,
      activityApiPath: null,
    });
  });

  it('derives lightweight training status from interaction events', async () => {
    prismaMock.interactionEvent.findMany.mockImplementation((query) =>
      query.where.eventType.in.includes('TRAINING_COMPLETED')
        ? Promise.resolve([
            { campaignItemId: trainingItemId, eventType: 'TRAINING_VIEWED' },
            { campaignItemId: trainingItemId, eventType: 'TRAINING_COMPLETED' },
          ])
        : Promise.resolve([]),
    );

    const response = await request(createApp())
      .get(`/trainee/campaigns/${campaignId}`)
      .set('Authorization', authHeader());

    expect(response.body.items[0].children[0].progressStatus).toBe('COMPLETED');
  });

  it('derives lightweight quiz status from quiz attempts', async () => {
    prismaMock.quizAttempt.findMany.mockResolvedValue([
      { campaignItemId: quizItemId, status: 'IN_PROGRESS' },
      { campaignItemId: quizItemId, status: 'SUBMITTED' },
    ]);

    const response = await request(createApp())
      .get(`/trainee/campaigns/${campaignId}`)
      .set('Authorization', authHeader());

    expect(response.body.items[0].children[1].progressStatus).toBe('SUBMITTED');
  });

  it('derives lightweight simulated inbox status from events and classification responses', async () => {
    prismaMock.interactionEvent.findMany.mockImplementation((query) =>
      query.where.eventType.in.includes('SIMULATED_EMAIL_CLASSIFIED')
        ? Promise.resolve([
            { campaignItemId: simulationItemId, eventType: 'SIMULATED_EMAIL_OPENED' },
            { campaignItemId: simulationItemId, eventType: 'SIMULATED_EMAIL_LINK_CLICKED' },
          ])
        : Promise.resolve([]),
    );
    prismaMock.emailClassificationResponse.findMany.mockResolvedValue([
      { campaignItemId: simulationItemId },
    ]);

    const response = await request(createApp())
      .get(`/trainee/campaigns/${campaignId}`)
      .set('Authorization', authHeader());

    expect(response.body.items[1].progressStatus).toBe('CLASSIFIED');
  });

  it('does not expose internal fields or nested sensitive activity content', async () => {
    const response = await request(createApp())
      .get(`/trainee/campaigns/${campaignId}`)
      .set('Authorization', authHeader());

    const serializedBody = JSON.stringify(response.body);

    expect(serializedBody).not.toContain('createdByUserId');
    expect(serializedBody).not.toContain('traineeProfileId');
    expect(serializedBody).not.toContain('trainingDocumentId');
    expect(serializedBody).not.toContain('quizId');
    expect(serializedBody).not.toContain('simulationId');
    expect(serializedBody).not.toContain('answerOptions');
    expect(serializedBody).not.toContain('isCorrect');
    expect(serializedBody).not.toContain('feedbackText');
    expect(serializedBody).not.toContain('expectedClassification');
    expect(serializedBody).not.toContain('redFlags');
  });

  it('does not require old learning path or user-owned inbox model assumptions', async () => {
    const response = await request(createApp())
      .get(`/trainee/campaigns/${campaignId}`)
      .set('Authorization', authHeader());

    const serializedBody = JSON.stringify(response.body);

    expect(response.status).toBe(200);
    expect(serializedBody).not.toContain('LearningPath');
    expect(serializedBody).not.toContain('TrainingModule');
    expect(serializedBody).not.toContain('TrainingProgress');
    expect(serializedBody).not.toContain('GeneralLearningAccess');
    expect(serializedBody).not.toContain('userOwnedInbox');
  });
});

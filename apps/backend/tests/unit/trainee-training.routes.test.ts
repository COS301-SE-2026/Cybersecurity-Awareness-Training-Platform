import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { clearTraineeTrainingRateLimitStore } from '../../src/middleware/traineeTrainingRateLimit.js';
import { generateAuthToken } from '../../src/services/auth-token.service.js';

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
  traineeProfile: {
    findFirst: vi.fn(),
  },
  campaignItem: {
    findUnique: vi.fn(),
  },
  campaignAssignment: {
    findFirst: vi.fn(),
  },
  interactionEvent: {
    create: vi.fn(),
  },
}));

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

const user = {
  id: 'user-1',
  firstName: 'Ava',
  lastName: 'Trainee',
  email: 'ava@example.com',
  passwordHash: 'hashed-password',
  userType: 'GENERAL_TRAINEE',
  authStatus: 'ACTIVE',
  createdAt: new Date('2026-05-16T08:00:00.000Z'),
};

const trainingDocument = {
  id: 'training-doc-1',
  createdByUserId: null,
  title: 'Identifying Phishing Emails',
  contentType: 'MARKDOWN',
  contentRef: 'training/training-doc-1',
  contentSummary: 'Common phishing indicators and safe response steps.',
  estimatedReadTimeMinutes: 8,
  difficultyLevel: 'BEGINNER',
  status: 'AVAILABLE',
  createdAt: new Date('2026-05-16T08:00:00.000Z'),
  updatedAt: new Date('2026-05-16T08:00:00.000Z'),
};

const campaignItem = {
  id: 'campaign-item-1',
  campaignId: 'campaign-1',
  parentGroupId: null,
  itemType: 'COMPONENT',
  componentType: 'TRAINING_DOCUMENT',
  groupType: null,
  completionRule: null,
  title: 'Phishing Basics',
  description: 'Read the basics before the quiz.',
  position: 1,
  difficultyLevel: 'BEGINNER',
  isRequired: true,
  availabilityStatus: 'AVAILABLE',
  trainingDocumentId: trainingDocument.id,
  quizId: null,
  simulationId: null,
  createdAt: new Date('2026-05-16T08:00:00.000Z'),
  updatedAt: new Date('2026-05-16T08:00:00.000Z'),
  trainingDocument,
};

const authHeader = () => `Bearer ${generateAuthToken(user.id).token}`;

function mockAuthenticatedUser() {
  prismaMock.user.findUnique.mockResolvedValue(user);
}

function mockTrainingAccess() {
  prismaMock.traineeProfile.findFirst.mockResolvedValue({ id: 'trainee-profile-1' });
  prismaMock.campaignItem.findUnique.mockResolvedValue(campaignItem);
  prismaMock.campaignAssignment.findFirst.mockResolvedValue({ id: 'assignment-1' });
}

describe('Trainee training document routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearTraineeTrainingRateLimitStore();
    mockAuthenticatedUser();
    mockTrainingAccess();
  });

  it('gets a training document resolved through the campaign item', async () => {
    const response = await request(createApp())
      .get('/trainee/campaign-items/campaign-item-1/training-document')
      .set('Authorization', authHeader());

    expect(response.status).toBe(200);
    expect(prismaMock.campaignItem.findUnique).toHaveBeenCalledWith({
      where: {
        id: 'campaign-item-1',
      },
      include: {
        trainingDocument: true,
      },
    });
    expect(response.body).toEqual({
      campaignItemId: 'campaign-item-1',
      campaignAssignmentId: 'assignment-1',
      trainingDocument: {
        id: 'training-doc-1',
        title: 'Identifying Phishing Emails',
        contentType: 'MARKDOWN',
        contentRef: 'training/training-doc-1',
        contentSummary: 'Common phishing indicators and safe response steps.',
        estimatedReadTimeMinutes: 8,
        difficultyLevel: 'BEGINNER',
        status: 'AVAILABLE',
      },
      campaignItem: {
        title: 'Phishing Basics',
        description: 'Read the basics before the quiz.',
        position: 1,
        isRequired: true,
        availabilityStatus: 'AVAILABLE',
      },
    });
  });

  it('returns 401 when authentication is missing', async () => {
    const response = await request(createApp()).get(
      '/trainee/campaign-items/campaign-item-1/training-document',
    );

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error', 'AUTH_REQUIRED');
    expect(prismaMock.campaignItem.findUnique).not.toHaveBeenCalled();
  });

  it('returns safe 404 when the campaign item is unavailable', async () => {
    prismaMock.campaignItem.findUnique.mockResolvedValue({
      ...campaignItem,
      availabilityStatus: 'LOCKED',
    });

    const response = await request(createApp())
      .get('/trainee/campaign-items/campaign-item-1/training-document')
      .set('Authorization', authHeader());

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', 'TRAINING_DOCUMENT_NOT_FOUND');
  });

  it('returns safe 404 when the trainee is not assigned to the campaign', async () => {
    prismaMock.campaignAssignment.findFirst.mockResolvedValue(null);

    const response = await request(createApp())
      .get('/trainee/campaign-items/campaign-item-1/training-document')
      .set('Authorization', authHeader());

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', 'TRAINING_DOCUMENT_NOT_FOUND');
  });

  it('returns safe 404 when the campaign item is not a training document component', async () => {
    prismaMock.campaignItem.findUnique.mockResolvedValue({
      ...campaignItem,
      componentType: 'QUIZ',
      trainingDocument: null,
      trainingDocumentId: null,
      quizId: 'quiz-1',
    });

    const response = await request(createApp())
      .get('/trainee/campaign-items/campaign-item-1/training-document')
      .set('Authorization', authHeader());

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', 'TRAINING_DOCUMENT_NOT_FOUND');
  });

  it('records a TRAINING_VIEWED interaction event with campaign context and no metadata', async () => {
    prismaMock.interactionEvent.create.mockResolvedValue({
      id: 'event-1',
      eventType: 'TRAINING_VIEWED',
      occurredAt: new Date('2026-05-16T09:00:00.000Z'),
    });

    const response = await request(createApp())
      .post('/trainee/campaign-items/campaign-item-1/training-document/viewed')
      .set('Authorization', authHeader())
      .send({ ignoredClientField: 'safe-to-ignore' });

    expect(response.status).toBe(201);
    expect(prismaMock.interactionEvent.create).toHaveBeenCalledWith({
      data: {
        traineeProfileId: 'trainee-profile-1',
        campaignAssignmentId: 'assignment-1',
        campaignItemId: 'campaign-item-1',
        eventType: 'TRAINING_VIEWED',
        targetType: 'TRAINING_DOCUMENT',
        targetId: 'training-doc-1',
        trainingDocumentId: 'training-doc-1',
      },
      select: {
        id: true,
        eventType: true,
        occurredAt: true,
      },
    });
    expect(prismaMock.interactionEvent.create.mock.calls[0][0].data).not.toHaveProperty('metadata');
    expect(response.body).toEqual({
      success: true,
      campaignItemId: 'campaign-item-1',
      trainingDocumentId: 'training-doc-1',
      event: {
        id: 'event-1',
        eventType: 'TRAINING_VIEWED',
        occurredAt: '2026-05-16T09:00:00.000Z',
      },
    });
  });

  it('records a TRAINING_COMPLETED interaction event with campaign context and no metadata', async () => {
    prismaMock.interactionEvent.create.mockResolvedValue({
      id: 'event-2',
      eventType: 'TRAINING_COMPLETED',
      occurredAt: new Date('2026-05-16T09:05:00.000Z'),
    });

    const response = await request(createApp())
      .post('/trainee/campaign-items/campaign-item-1/training-document/completed')
      .set('Authorization', authHeader())
      .send();

    expect(response.status).toBe(201);
    expect(prismaMock.interactionEvent.create.mock.calls[0][0].data).toMatchObject({
      traineeProfileId: 'trainee-profile-1',
      campaignAssignmentId: 'assignment-1',
      campaignItemId: 'campaign-item-1',
      eventType: 'TRAINING_COMPLETED',
      targetType: 'TRAINING_DOCUMENT',
      targetId: 'training-doc-1',
      trainingDocumentId: 'training-doc-1',
    });
    expect(prismaMock.interactionEvent.create.mock.calls[0][0].data).not.toHaveProperty('metadata');
    expect(response.body.event).toEqual({
      id: 'event-2',
      eventType: 'TRAINING_COMPLETED',
      occurredAt: '2026-05-16T09:05:00.000Z',
    });
  });

  it('returns 400 for malformed campaign item ids', async () => {
    const response = await request(createApp())
      .get('/trainee/campaign-items/%20%20/training-document')
      .set('Authorization', authHeader());

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
    expect(prismaMock.campaignItem.findUnique).not.toHaveBeenCalled();
  });

  it('returns 429 when training requests exceed the route rate limit', async () => {
    const app = createApp();
    let response: request.Response | undefined;

    for (let index = 0; index <= 60; index += 1) {
      response = await request(app)
        .get('/trainee/campaign-items/campaign-item-1/training-document')
        .set('Authorization', authHeader());
    }

    expect(response?.status).toBe(429);
    expect(response?.body).toEqual({
      error: 'TRAINING_RATE_LIMITED',
      message: 'Too many training requests. Please try again later.',
    });
    expect(response?.headers).toHaveProperty('retry-after');
  });
});

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
    findFirst: vi.fn(),
    create: vi.fn(),
  },
}));

const contentResolverMock = vi.hoisted(() => ({
  resolveContent: vi.fn(),
  TrainingContentResolveError: class TrainingContentResolveError extends Error {
    constructor(message = 'Training content could not be loaded') {
      super(message);
      this.name = 'TrainingContentResolveError';
    }
  },
}));

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

vi.mock('../../src/services/content-resolver.service.js', () => ({
  resolveContent: contentResolverMock.resolveContent,
  TrainingContentResolveError: contentResolverMock.TrainingContentResolveError,
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

const campaignItemId = '11111111-1111-4111-8111-111111111111';
const campaignId = '22222222-2222-4222-8222-222222222222';
const trainingDocumentId = '33333333-3333-4333-8333-333333333333';
const campaignAssignmentId = '44444444-4444-4444-8444-444444444444';
const traineeProfileId = '55555555-5555-4555-8555-555555555555';

const trainingDocument = {
  id: trainingDocumentId,
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
  id: campaignItemId,
  campaignId,
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
  campaign: {
    status: 'ACTIVE',
  },
  trainingDocument,
};

const authHeader = () => `Bearer ${generateAuthToken(user.id).token}`;
const trainingDocumentPath = (id = campaignItemId) =>
  `/trainee/campaign-items/${id}/training-document`;
const viewedPath = (id = campaignItemId) =>
  `/trainee/campaign-items/${id}/training-document/viewed`;
const completedPath = (id = campaignItemId) =>
  `/trainee/campaign-items/${id}/training-document/completed`;

function mockAuthenticatedUser() {
  prismaMock.user.findUnique.mockResolvedValue(user);
}

function mockTrainingAccess() {
  prismaMock.traineeProfile.findFirst.mockResolvedValue({ id: traineeProfileId });
  prismaMock.campaignItem.findUnique.mockResolvedValue(campaignItem);
  prismaMock.campaignAssignment.findFirst.mockResolvedValue({ id: campaignAssignmentId });
  prismaMock.interactionEvent.findFirst.mockResolvedValue(null);
}

describe('Trainee training document routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearTraineeTrainingRateLimitStore();
    mockAuthenticatedUser();
    mockTrainingAccess();
    contentResolverMock.resolveContent.mockResolvedValue('## Demo training content');
  });

  it('gets a training document resolved through the campaign item', async () => {
    const response = await request(createApp())
      .get(trainingDocumentPath())
      .set('Authorization', authHeader());

    expect(response.status).toBe(200);
    expect(contentResolverMock.resolveContent).toHaveBeenCalledWith(
      'MARKDOWN',
      'training/training-doc-1',
    );
    expect(prismaMock.campaignItem.findUnique).toHaveBeenCalledWith({
      where: {
        id: campaignItemId,
      },
      include: {
        campaign: {
          select: {
            status: true,
          },
        },
        trainingDocument: true,
      },
    });
    expect(response.body).toEqual({
      campaignItemId,
      campaignAssignmentId,
      trainingDocument: {
        id: trainingDocumentId,
        title: 'Identifying Phishing Emails',
        contentType: 'MARKDOWN',
        contentRef: 'training/training-doc-1',
        content: '## Demo training content',
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

  it('returns null content when the reference is not supported', async () => {
    contentResolverMock.resolveContent.mockResolvedValueOnce(null);

    const response = await request(createApp())
      .get(trainingDocumentPath())
      .set('Authorization', authHeader());

    expect(response.status).toBe(200);
    expect(response.body.trainingDocument.content).toBeNull();
  });

  it('returns a controlled error when training content cannot be loaded', async () => {
    contentResolverMock.resolveContent.mockRejectedValueOnce(
      new contentResolverMock.TrainingContentResolveError(),
    );

    const response = await request(createApp())
      .get(trainingDocumentPath())
      .set('Authorization', authHeader());

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: 'TRAINING_CONTENT_UNAVAILABLE',
      message: 'Training content could not be loaded',
    });
  });

  it('returns 401 when authentication is missing', async () => {
    const response = await request(createApp()).get(trainingDocumentPath());

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
      .get(trainingDocumentPath())
      .set('Authorization', authHeader());

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', 'TRAINING_DOCUMENT_NOT_FOUND');
  });

  it('returns safe 404 when the campaign is not active', async () => {
    prismaMock.campaignItem.findUnique.mockResolvedValue({
      ...campaignItem,
      campaign: {
        status: 'ARCHIVED',
      },
    });

    const response = await request(createApp())
      .get(trainingDocumentPath())
      .set('Authorization', authHeader());

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', 'TRAINING_DOCUMENT_NOT_FOUND');
    expect(prismaMock.campaignAssignment.findFirst).not.toHaveBeenCalled();
  });

  it('returns safe 404 when the trainee is not assigned to the campaign', async () => {
    prismaMock.campaignAssignment.findFirst.mockResolvedValue(null);

    const response = await request(createApp())
      .get(trainingDocumentPath())
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
      .get(trainingDocumentPath())
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
      .post(viewedPath())
      .set('Authorization', authHeader())
      .send();

    expect(response.status).toBe(201);
    expect(prismaMock.interactionEvent.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.interactionEvent.create).toHaveBeenCalledWith({
      data: {
        traineeProfileId,
        campaignAssignmentId,
        campaignItemId,
        eventType: 'TRAINING_VIEWED',
        targetType: 'TRAINING_DOCUMENT',
        targetId: trainingDocumentId,
        trainingDocumentId,
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
      campaignItemId,
      trainingDocumentId,
      event: {
        id: 'event-1',
        eventType: 'TRAINING_VIEWED',
        occurredAt: '2026-05-16T09:00:00.000Z',
      },
    });
  });

  it('keeps TRAINING_VIEWED repeatable across valid requests', async () => {
    prismaMock.interactionEvent.create
      .mockResolvedValueOnce({
        id: 'event-1',
        eventType: 'TRAINING_VIEWED',
        occurredAt: new Date('2026-05-16T09:00:00.000Z'),
      })
      .mockResolvedValueOnce({
        id: 'event-2',
        eventType: 'TRAINING_VIEWED',
        occurredAt: new Date('2026-05-16T09:01:00.000Z'),
      });

    const app = createApp();
    const firstResponse = await request(app)
      .post(viewedPath())
      .set('Authorization', authHeader())
      .send();
    const secondResponse = await request(app)
      .post(viewedPath())
      .set('Authorization', authHeader())
      .send();

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(201);
    expect(prismaMock.interactionEvent.create).toHaveBeenCalledTimes(2);
  });

  it('records a TRAINING_COMPLETED interaction event with campaign context and no metadata', async () => {
    prismaMock.interactionEvent.create.mockResolvedValue({
      id: 'event-2',
      eventType: 'TRAINING_COMPLETED',
      occurredAt: new Date('2026-05-16T09:05:00.000Z'),
    });

    const response = await request(createApp())
      .post(completedPath())
      .set('Authorization', authHeader())
      .send();

    expect(response.status).toBe(201);
    expect(prismaMock.interactionEvent.findFirst).toHaveBeenCalledWith({
      where: {
        traineeProfileId,
        campaignAssignmentId,
        campaignItemId,
        eventType: 'TRAINING_COMPLETED',
        targetType: 'TRAINING_DOCUMENT',
        targetId: trainingDocumentId,
        trainingDocumentId,
      },
      select: {
        id: true,
        eventType: true,
        occurredAt: true,
      },
    });
    expect(prismaMock.interactionEvent.create.mock.calls[0][0].data).toMatchObject({
      traineeProfileId,
      campaignAssignmentId,
      campaignItemId,
      eventType: 'TRAINING_COMPLETED',
      targetType: 'TRAINING_DOCUMENT',
      targetId: trainingDocumentId,
      trainingDocumentId,
    });
    expect(prismaMock.interactionEvent.create.mock.calls[0][0].data).not.toHaveProperty('metadata');
    expect(response.body.event).toEqual({
      id: 'event-2',
      eventType: 'TRAINING_COMPLETED',
      occurredAt: '2026-05-16T09:05:00.000Z',
    });
  });

  it('returns success without creating duplicate TRAINING_COMPLETED events', async () => {
    prismaMock.interactionEvent.create.mockResolvedValue({
      id: 'event-2',
      eventType: 'TRAINING_COMPLETED',
      occurredAt: new Date('2026-05-16T09:05:00.000Z'),
    });
    prismaMock.interactionEvent.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'event-2',
      eventType: 'TRAINING_COMPLETED',
      occurredAt: new Date('2026-05-16T09:05:00.000Z'),
    });

    const app = createApp();
    const firstResponse = await request(app)
      .post(completedPath())
      .set('Authorization', authHeader())
      .send();
    const secondResponse = await request(app)
      .post(completedPath())
      .set('Authorization', authHeader())
      .send();

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(201);
    expect(prismaMock.interactionEvent.findFirst).toHaveBeenCalledTimes(2);
    expect(prismaMock.interactionEvent.create).toHaveBeenCalledTimes(1);
    expect(secondResponse.body.event).toEqual({
      id: 'event-2',
      eventType: 'TRAINING_COMPLETED',
      occurredAt: '2026-05-16T09:05:00.000Z',
    });
  });

  it.each([
    ['GET training document', 'get', trainingDocumentPath('not-a-uuid')],
    ['POST viewed', 'post', viewedPath('not-a-uuid')],
    ['POST completed', 'post', completedPath('not-a-uuid')],
  ] as const)('returns 400 for malformed campaign item ids on %s', async (_name, method, path) => {
    const agent = request(createApp());
    const response = await agent[method](path).set('Authorization', authHeader()).send();

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
    expect(prismaMock.campaignItem.findUnique).not.toHaveBeenCalled();
  });

  it.each([
    ['viewed', viewedPath()],
    ['completed', completedPath()],
  ])('returns 400 when %s request bodies contain unknown fields', async (_name, path) => {
    const response = await request(createApp())
      .post(path)
      .set('Authorization', authHeader())
      .send({ clientTime: '2026-05-16T10:00:00.000Z' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
    expect(prismaMock.campaignItem.findUnique).not.toHaveBeenCalled();
  });

  it('returns 429 when training requests exceed the route rate limit', async () => {
    const app = createApp();
    let response: request.Response | undefined;

    for (let index = 0; index <= 60; index += 1) {
      response = await request(app).get(trainingDocumentPath()).set('Authorization', authHeader());
    }

    expect(response?.status).toBe(429);
    expect(response?.body).toEqual({
      error: 'TRAINING_RATE_LIMITED',
      message: 'Too many training requests. Please try again later.',
    });
    expect(response?.headers).toHaveProperty('retry-after');
  });
});

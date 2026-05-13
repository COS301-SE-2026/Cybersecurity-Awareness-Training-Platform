import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { generateAuthToken } from '../../src/services/auth-token.service.js';

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
  generalLearningAccess: {
    findUnique: vi.fn(),
  },
  trainingDocument: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  trainingProgress: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  interactionEvent: {
    create: vi.fn(),
  },
}));

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

const authenticatedUser = {
  id: 'learner-1',
  firstName: 'Johan',
  lastName: 'Nel',
  email: 'johan@example.com',
  passwordHash: 'hashed-password',
  userType: 'COMPANY_LEARNER',
  authStatus: 'ACTIVE',
  createdAt: new Date('2026-05-12T06:00:00.000Z'),
};

function authHeader(userId = 'learner-1') {
  return `Bearer ${generateAuthToken(userId).token}`;
}

function assignedTrainingDocument(overrides = {}) {
  return {
    id: 'training-1',
    title: 'Spotting phishing links',
    contentType: 'MARKDOWN',
    contentRef: '# Check the sender and the destination URL.',
    quizzes: [{ id: 'quiz-1' }],
    module: {
      description: 'Core phishing awareness material',
      learningPath: {
        campaign: {
          assignments: [{ id: 'assignment-1' }],
        },
      },
    },
    trainingProgress: [{ status: 'IN_PROGRESS' }],
    ...overrides,
  };
}

function expectAssignedAvailableTrainingWhere(where: unknown) {
  expect(where).toEqual(
    expect.objectContaining({
      OR: [
        expect.objectContaining({
          status: 'AVAILABLE',
          module: {
            learningPath: {
              status: 'ACTIVE',
              campaign: {
                status: 'ACTIVE',
                assignments: {
                  some: {
                    userId: 'learner-1',
                    assignmentStatus: {
                      not: 'CANCELLED',
                    },
                  },
                },
              },
            },
          },
        }),
      ],
    }),
  );
}

describe('Training routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findUnique.mockResolvedValue(authenticatedUser);
    prismaMock.generalLearningAccess.findUnique.mockResolvedValue(null);
  });

  it('returns assigned available training documents for the authenticated learner', async () => {
    prismaMock.trainingDocument.findMany.mockResolvedValue([assignedTrainingDocument()]);

    const response = await request(createApp())
      .get('/training/assigned')
      .set('Authorization', authHeader());

    expect(response.status).toBe(200);
    expect(prismaMock.trainingDocument.findMany).toHaveBeenCalledWith({
      where: expect.any(Object),
      include: expect.objectContaining({
        module: {
          select: {
            description: true,
          },
        },
      }),
      orderBy: expect.any(Array),
    });
    expectAssignedAvailableTrainingWhere(
      prismaMock.trainingDocument.findMany.mock.calls[0][0].where,
    );
    expect(response.body).toEqual({
      trainingDocuments: [
        {
          id: 'training-1',
          title: 'Spotting phishing links',
          description: 'Core phishing awareness material',
          status: 'IN_PROGRESS',
        },
      ],
    });
  });

  it('returns training detail with linked quiz ids when the document is assigned', async () => {
    prismaMock.trainingDocument.findFirst.mockResolvedValue(assignedTrainingDocument());

    const response = await request(createApp())
      .get('/training/training-1')
      .set('Authorization', authHeader());

    expect(response.status).toBe(200);
    expect(prismaMock.trainingDocument.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          quizzes: {
            where: {
              status: 'PUBLISHED',
            },
            select: {
              id: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        }),
      }),
    );
    const detailWhere = prismaMock.trainingDocument.findFirst.mock.calls[0][0].where;
    expect(detailWhere).toEqual(
      expect.objectContaining({
        id: 'training-1',
      }),
    );
    expectAssignedAvailableTrainingWhere(detailWhere);
    expect(response.body).toEqual({
      id: 'training-1',
      title: 'Spotting phishing links',
      contentType: 'MARKDOWN',
      contentRef: '# Check the sender and the destination URL.',
      linkedQuizIds: ['quiz-1'],
    });
  });

  it('returns a safe not found error for missing documents', async () => {
    prismaMock.trainingDocument.findFirst.mockResolvedValue(null);

    const response = await request(createApp())
      .get('/training/missing-training')
      .set('Authorization', authHeader());

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: 'TRAINING_DOCUMENT_NOT_FOUND',
      message: 'Training document was not found',
    });
  });

  it('returns a safe not found error for cross-user training access', async () => {
    prismaMock.trainingDocument.findFirst.mockResolvedValue(null);

    const response = await request(createApp())
      .get('/training/training-owned-by-another-learner')
      .set('Authorization', authHeader());

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: 'TRAINING_DOCUMENT_NOT_FOUND',
      message: 'Training document was not found',
    });
  });

  it('returns 401 when training routes are requested without authentication', async () => {
    const response = await request(createApp()).get('/training/assigned');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: 'AUTH_REQUIRED',
      message: 'Authentication credentials are required',
    });
    expect(prismaMock.trainingDocument.findMany).not.toHaveBeenCalled();
  });

  it('records training progress and writes an interaction event', async () => {
    prismaMock.trainingDocument.findFirst.mockResolvedValue(assignedTrainingDocument());
    prismaMock.trainingProgress.findFirst.mockResolvedValue(null);
    prismaMock.trainingProgress.create.mockResolvedValue({
      id: 'progress-1',
      trainingDocumentId: 'training-1',
      campaignAssignmentId: 'assignment-1',
      status: 'IN_PROGRESS',
      startedAt: new Date('2026-05-13T10:00:00.000Z'),
      completedAt: null,
    });
    prismaMock.interactionEvent.create.mockResolvedValue({
      id: 'event-1',
    });

    const response = await request(createApp())
      .post('/training/training-1/progress')
      .set('Authorization', authHeader())
      .send({
        status: 'VIEWED',
      });

    expect(response.status).toBe(200);
    expect(prismaMock.trainingProgress.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'learner-1',
        trainingDocumentId: 'training-1',
        campaignAssignmentId: 'assignment-1',
        status: 'IN_PROGRESS',
        startedAt: expect.any(Date),
      }),
    });
    expect(prismaMock.interactionEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'learner-1',
        eventType: 'TRAINING_VIEWED',
        targetType: 'TRAINING_DOCUMENT',
        targetId: 'training-1',
        trainingDocumentId: 'training-1',
        metadata: {
          requestedStatus: 'VIEWED',
        },
      }),
    });
    expect(response.body).toEqual({
      success: true,
      progress: {
        id: 'progress-1',
        trainingDocumentId: 'training-1',
        campaignAssignmentId: 'assignment-1',
        status: 'IN_PROGRESS',
        startedAt: '2026-05-13T10:00:00.000Z',
        completedAt: null,
      },
    });
  });

  it('rejects invalid progress statuses with a validation error', async () => {
    const response = await request(createApp())
      .post('/training/training-1/progress')
      .set('Authorization', authHeader())
      .send({
        status: 'IN_PROGRESS',
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
    expect(prismaMock.trainingProgress.create).not.toHaveBeenCalled();
    expect(prismaMock.interactionEvent.create).not.toHaveBeenCalled();
  });
});

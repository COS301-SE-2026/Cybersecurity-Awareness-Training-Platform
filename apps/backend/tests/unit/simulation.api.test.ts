import type { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';

const prismaMock = vi.hoisted(() => {
  const tx = {
    $executeRaw: vi.fn(),
    interactionEvent: { create: vi.fn(), findFirst: vi.fn() },
    emailClassificationResponse: { create: vi.fn(), findFirst: vi.fn() },
  };

  return {
    user: { findUnique: vi.fn() },
    traineeProfile: { findUnique: vi.fn() },
    campaignItem: { findUnique: vi.fn() },
    simulatedEmail: { findUnique: vi.fn() },
    interactionEvent: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
    emailClassificationResponse: { create: vi.fn(), findFirst: vi.fn() },
    $transaction: vi.fn(async (callback) => callback(tx)),
    __tx: tx,
  };
});

vi.mock('../../src/lib/prisma.js', () => ({ prisma: prismaMock }));

vi.mock('../../src/middleware/requireAuth.js', () => ({
  requireAuth: (req: Request, res: Response, next: NextFunction) => {
    if (req.headers.authorization === 'Bearer mock-token') {
      req.auth = { userId: 'user-123' } as unknown as Request['auth'];
      next();
    } else {
      res.status(401).json({ error: 'AUTH_REQUIRED' });
    }
  },
}));

describe('Simulation API', () => {
  const token = 'mock-token';
  const traineeProfile = { id: 'trainee-123', userId: 'user-123' };

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-123', authStatus: 'ACTIVE' });
    prismaMock.traineeProfile.findUnique.mockResolvedValue(traineeProfile);
    prismaMock.interactionEvent.findFirst.mockResolvedValue(null);
    prismaMock.interactionEvent.findMany.mockResolvedValue([]);
    prismaMock.__tx.interactionEvent.findFirst.mockResolvedValue(null);
  });

  const createMockEmail = (assigned = true) => ({
    id: '11111111-1111-1111-1111-111111111111',
    inboxId: 'inbox-1',
    senderLabel: 'Bank',
    senderAddress: 'bank@example.com',
    subject: 'Security Alert',
    bodyHtml: '<p>Hello</p>',
    receivedAt: new Date(),
    difficultyLevel: 'BEGINNER',
    expectedClassification: 'PHISHING',
    redFlags: [
      {
        id: '33333333-3333-3333-3333-333333333333',
        label: 'Urgent',
        redFlagType: 'LANGUAGE',
        severity: 'MEDIUM',
      },
    ],
    inbox: {
      simulation: {
        campaignItems: [
          {
            id: '22222222-2222-2222-2222-222222222222',
            itemType: 'COMPONENT',
            componentType: 'SIMULATED_INBOX',
            availabilityStatus: 'AVAILABLE',
            simulation: {
              safetyStatus: 'APPROVED',
              simulatedInbox: { status: 'ACTIVE' },
            },
            campaign: {
              status: 'ACTIVE',
              campaignType: 'PREMADE_GENERAL',
              assignments: assigned ? [{ id: '44444444-4444-4444-4444-444444444444' }] : [],
            },
          },
        ],
      },
    },
  });

  const app = createApp();

  describe('GET /trainee/campaign-items/:campaignItemId/simulated-inbox', () => {
    it('returns the simulated inbox for an authorized trainee', async () => {
      const campaignItem = {
        id: '22222222-2222-2222-2222-222222222222',
        itemType: 'COMPONENT',
        componentType: 'SIMULATED_INBOX',
        availabilityStatus: 'AVAILABLE',
        simulation: {
          safetyStatus: 'APPROVED',
          simulatedInbox: { status: 'ACTIVE', emails: [createMockEmail()] },
        },
        campaign: {
          status: 'ACTIVE',
          campaignType: 'PREMADE_GENERAL',
          assignments: [{ id: '44444444-4444-4444-4444-444444444444' }],
        },
      };
      prismaMock.campaignItem.findUnique.mockResolvedValue(campaignItem);

      const response = await request(app)
        .get('/trainee/campaign-items/22222222-2222-2222-2222-222222222222/simulated-inbox')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.emails[0].subject).toBe('Security Alert');
      expect(response.body.emails[0].isOpened).toBe(false);
      expect(prismaMock.interactionEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            traineeProfileId: 'trainee-123',
            campaignAssignmentId: '44444444-4444-4444-4444-444444444444',
            campaignItemId: '22222222-2222-2222-2222-222222222222',
            eventType: 'SIMULATED_EMAIL_OPENED',
            targetType: 'SIMULATED_EMAIL',
            simulatedEmailId: {
              in: ['11111111-1111-1111-1111-111111111111'],
            },
          }),
        }),
      );
    });

    it('returns isOpened true when the current trainee has opened the email', async () => {
      const campaignItem = {
        id: '22222222-2222-2222-2222-222222222222',
        itemType: 'COMPONENT',
        componentType: 'SIMULATED_INBOX',
        availabilityStatus: 'AVAILABLE',
        simulation: {
          safetyStatus: 'APPROVED',
          simulatedInbox: { status: 'ACTIVE', emails: [createMockEmail()] },
        },
        campaign: {
          status: 'ACTIVE',
          campaignType: 'PREMADE_GENERAL',
          assignments: [{ id: '44444444-4444-4444-4444-444444444444' }],
        },
      };
      prismaMock.campaignItem.findUnique.mockResolvedValue(campaignItem);
      prismaMock.interactionEvent.findMany.mockResolvedValue([
        {
          simulatedEmailId: '11111111-1111-1111-1111-111111111111',
        },
      ]);

      const response = await request(app)
        .get('/trainee/campaign-items/22222222-2222-2222-2222-222222222222/simulated-inbox')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.emails[0].isOpened).toBe(true);
    });

    it('returns 404 if campaign item is unavailable or invalid type', async () => {
      const campaignItem = {
        id: '22222222-2222-2222-2222-222222222222',
        itemType: 'COMPONENT',
        componentType: 'TRAINING_DOCUMENT',
        availabilityStatus: 'AVAILABLE',
        simulation: null,
        campaign: { assignments: [{ id: '44444444-4444-4444-4444-444444444444' }] },
      };
      prismaMock.campaignItem.findUnique.mockResolvedValue(campaignItem);

      const response = await request(app)
        .get('/trainee/campaign-items/22222222-2222-2222-2222-222222222222/simulated-inbox')
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(404);
    });

    it('returns 401 if missing auth', async () => {
      const response = await request(app).get(
        '/trainee/campaign-items/22222222-2222-2222-2222-222222222222/simulated-inbox',
      );
      expect(response.status).toBe(401);
    });

    it('returns 400 for malformed campaign item id', async () => {
      const response = await request(app)
        .get('/trainee/campaign-items/%20%20/simulated-inbox')
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(400);
    });
  });

  describe('GET /trainee/campaign-items/:campaignItemId/simulated-emails/:emailId', () => {
    it('returns the simulated email for an authorized trainee', async () => {
      prismaMock.simulatedEmail.findUnique.mockResolvedValue(createMockEmail());

      const response = await request(app)
        .get(
          '/trainee/campaign-items/22222222-2222-2222-2222-222222222222/simulated-emails/11111111-1111-1111-1111-111111111111',
        )
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.subject).toBe('Security Alert');
    });

    it('returns 403 if the simulated inbox is inactive', async () => {
      const inactiveEmail = createMockEmail();
      inactiveEmail.inbox.simulation.campaignItems[0].simulation.simulatedInbox.status = 'INACTIVE';
      prismaMock.simulatedEmail.findUnique.mockResolvedValue(inactiveEmail);

      const response = await request(app)
        .get(
          '/trainee/campaign-items/22222222-2222-2222-2222-222222222222/simulated-emails/11111111-1111-1111-1111-111111111111',
        )
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /trainee/campaign-items/:campaignItemId/simulated-emails/:emailId/interactions', () => {
    it('records an interaction using resolved context and correctly validates UUIDs', async () => {
      prismaMock.simulatedEmail.findUnique.mockResolvedValue(createMockEmail());
      prismaMock.__tx.interactionEvent.create.mockResolvedValue({ id: 'event-1' });

      const response = await request(app)
        .post(
          '/trainee/campaign-items/22222222-2222-2222-2222-222222222222/simulated-emails/11111111-1111-1111-1111-111111111111/interactions',
        )
        .set('Authorization', `Bearer ${token}`)
        .send({
          eventType: 'SIMULATED_EMAIL_LINK_CLICKED',
        });

      expect(response.status).toBe(200);
      expect(prismaMock.__tx.interactionEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            campaignAssignmentId: '44444444-4444-4444-4444-444444444444',
            campaignItemId: '22222222-2222-2222-2222-222222222222',
            eventType: 'SIMULATED_EMAIL_LINK_CLICKED',
          }),
        }),
      );
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it('does not create duplicate simulated email opened events for the same trainee context', async () => {
      prismaMock.simulatedEmail.findUnique.mockResolvedValue(createMockEmail());
      prismaMock.__tx.interactionEvent.findFirst.mockResolvedValue({ id: 'existing-open-event' });

      const response = await request(app)
        .post(
          '/trainee/campaign-items/22222222-2222-2222-2222-222222222222/simulated-emails/11111111-1111-1111-1111-111111111111/interactions',
        )
        .set('Authorization', `Bearer ${token}`)
        .send({
          eventType: 'SIMULATED_EMAIL_OPENED',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        eventType: 'SIMULATED_EMAIL_OPENED',
      });
      expect(prismaMock.$transaction).toHaveBeenCalled();
      expect(prismaMock.__tx.$executeRaw).toHaveBeenCalled();
      expect(prismaMock.__tx.interactionEvent.findFirst).toHaveBeenCalledWith({
        where: {
          traineeProfileId: 'trainee-123',
          campaignAssignmentId: '44444444-4444-4444-4444-444444444444',
          campaignItemId: '22222222-2222-2222-2222-222222222222',
          eventType: 'SIMULATED_EMAIL_OPENED',
          targetType: 'SIMULATED_EMAIL',
          targetId: '11111111-1111-1111-1111-111111111111',
          simulatedEmailId: '11111111-1111-1111-1111-111111111111',
        },
        select: {
          id: true,
        },
      });
      expect(prismaMock.__tx.interactionEvent.create).not.toHaveBeenCalled();
      expect(prismaMock.interactionEvent.create).not.toHaveBeenCalled();
    });

    it('creates the first simulated email opened event inside the locked transaction', async () => {
      prismaMock.simulatedEmail.findUnique.mockResolvedValue(createMockEmail());
      prismaMock.__tx.interactionEvent.findFirst.mockResolvedValue(null);
      prismaMock.__tx.interactionEvent.create.mockResolvedValue({ id: 'opened-event' });

      const response = await request(app)
        .post(
          '/trainee/campaign-items/22222222-2222-2222-2222-222222222222/simulated-emails/11111111-1111-1111-1111-111111111111/interactions',
        )
        .set('Authorization', `Bearer ${token}`)
        .send({
          eventType: 'SIMULATED_EMAIL_OPENED',
        });

      expect(response.status).toBe(200);
      expect(prismaMock.$transaction).toHaveBeenCalled();
      expect(prismaMock.__tx.$executeRaw).toHaveBeenCalled();
      expect(prismaMock.__tx.interactionEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            traineeProfileId: 'trainee-123',
            campaignAssignmentId: '44444444-4444-4444-4444-444444444444',
            campaignItemId: '22222222-2222-2222-2222-222222222222',
            eventType: 'SIMULATED_EMAIL_OPENED',
            targetType: 'SIMULATED_EMAIL',
            targetId: '11111111-1111-1111-1111-111111111111',
            simulatedEmailId: '11111111-1111-1111-1111-111111111111',
          }),
        }),
      );
      expect(prismaMock.interactionEvent.create).not.toHaveBeenCalled();
    });

    it('rejects payload with extra/ignored context fields', async () => {
      const response = await request(app)
        .post(
          '/trainee/campaign-items/22222222-2222-2222-2222-222222222222/simulated-emails/11111111-1111-1111-1111-111111111111/interactions',
        )
        .set('Authorization', `Bearer ${token}`)
        .send({
          eventType: 'SIMULATED_EMAIL_LINK_CLICKED',
          campaignItemId: 'hacker-id',
        });
      expect(response.status).toBe(400);
    });

    it('returns 403 if the simulated inbox is inactive', async () => {
      const inactiveEmail = createMockEmail();
      inactiveEmail.inbox.simulation.campaignItems[0].simulation.simulatedInbox.status = 'INACTIVE';
      prismaMock.simulatedEmail.findUnique.mockResolvedValue(inactiveEmail);

      const response = await request(app)
        .post(
          '/trainee/campaign-items/22222222-2222-2222-2222-222222222222/simulated-emails/11111111-1111-1111-1111-111111111111/interactions',
        )
        .set('Authorization', `Bearer ${token}`)
        .send({ eventType: 'SIMULATED_EMAIL_OPENED' });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /trainee/campaign-items/:campaignItemId/simulated-emails/:emailId/classification', () => {
    it('prevents duplicate classifications', async () => {
      prismaMock.simulatedEmail.findUnique.mockResolvedValue(createMockEmail());
      prismaMock.emailClassificationResponse.findFirst.mockResolvedValue({ id: 'existing' });

      const response = await request(app)
        .post(
          '/trainee/campaign-items/22222222-2222-2222-2222-222222222222/simulated-emails/11111111-1111-1111-1111-111111111111/classification',
        )
        .set('Authorization', `Bearer ${token}`)
        .send({ selectedClassification: 'SAFE' });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('ALREADY_CLASSIFIED');
    });

    it('returns 400 if selected red flags are invalid UUIDs', async () => {
      prismaMock.simulatedEmail.findUnique.mockResolvedValue(createMockEmail());
      prismaMock.emailClassificationResponse.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .post(
          '/trainee/campaign-items/22222222-2222-2222-2222-222222222222/simulated-emails/11111111-1111-1111-1111-111111111111/classification',
        )
        .set('Authorization', `Bearer ${token}`)
        .send({ selectedClassification: 'PHISHING', selectedRedFlagIds: ['invalid-uuid'] });

      expect(response.status).toBe(400);
    });

    it('classifies an email and creates interaction event with correct context', async () => {
      prismaMock.simulatedEmail.findUnique.mockResolvedValue(createMockEmail());
      prismaMock.emailClassificationResponse.findFirst.mockResolvedValue(null);
      prismaMock.__tx.emailClassificationResponse.create.mockResolvedValue({ id: 'resp-123' });
      prismaMock.__tx.interactionEvent.create.mockResolvedValue({ id: 'event-2' });

      const response = await request(app)
        .post(
          '/trainee/campaign-items/22222222-2222-2222-2222-222222222222/simulated-emails/11111111-1111-1111-1111-111111111111/classification',
        )
        .set('Authorization', `Bearer ${token}`)
        .send({
          selectedClassification: 'PHISHING',
          selectedRedFlagIds: ['33333333-3333-3333-3333-333333333333'],
        });

      expect(response.status).toBe(200);
      expect(prismaMock.__tx.emailClassificationResponse.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            campaignAssignmentId: '44444444-4444-4444-4444-444444444444',
            campaignItemId: '22222222-2222-2222-2222-222222222222',
          }),
        }),
      );
      expect(prismaMock.__tx.interactionEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'SIMULATED_EMAIL_CLASSIFIED',
            campaignAssignmentId: '44444444-4444-4444-4444-444444444444',
            campaignItemId: '22222222-2222-2222-2222-222222222222',
            emailClassificationResponseId: 'resp-123',
          }),
        }),
      );
    });

    it('returns 403 if the simulated inbox is inactive', async () => {
      const inactiveEmail = createMockEmail();
      inactiveEmail.inbox.simulation.campaignItems[0].simulation.simulatedInbox.status = 'INACTIVE';
      prismaMock.simulatedEmail.findUnique.mockResolvedValue(inactiveEmail);

      const response = await request(app)
        .post(
          '/trainee/campaign-items/22222222-2222-2222-2222-222222222222/simulated-emails/11111111-1111-1111-1111-111111111111/classification',
        )
        .set('Authorization', `Bearer ${token}`)
        .send({ selectedClassification: 'SAFE' });

      expect(response.status).toBe(403);
    });

    it('returns 400 when simulation service throws Error with message VALIDATION_ERROR', async () => {
      const { simulationService } = await import('../../src/services/simulation.service.js');
      vi.spyOn(simulationService, 'getSimulatedInbox').mockRejectedValueOnce(
        new Error('VALIDATION_ERROR'),
      );

      const response = await request(app)
        .get('/trainee/campaign-items/22222222-2222-2222-2222-222222222222/simulated-inbox')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'VALIDATION_ERROR',
      });
    });

    it('returns 500 when simulation service throws an unknown error', async () => {
      const { simulationService } = await import('../../src/services/simulation.service.js');
      vi.spyOn(simulationService, 'getSimulatedInbox').mockRejectedValueOnce(
        new Error('Unexpected internal database error'),
      );

      const response = await request(app)
        .get('/trainee/campaign-items/22222222-2222-2222-2222-222222222222/simulated-inbox')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Unexpected internal database error',
      });
    });
  });
});

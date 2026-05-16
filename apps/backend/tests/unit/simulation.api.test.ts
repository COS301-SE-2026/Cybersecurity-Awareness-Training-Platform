import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { generateAuthToken } from '../../src/services/auth-token.service.js';

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
  traineeProfile: {
    findUnique: vi.fn(),
  },
  campaignItem: {
    findUnique: vi.fn(),
  },
  simulatedEmail: {
    findUnique: vi.fn(),
  },
  interactionEvent: {
    create: vi.fn(),
  },
  emailClassificationResponse: {
    create: vi.fn(),
  },
}));

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

vi.mock('../../src/middleware/requireAuth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.auth = { userId: 'user-123' };
    next();
  },
}));

describe('Simulation API', () => {
  const token = 'mock-token';
  const traineeProfile = { id: 'trainee-123', userId: 'user-123' };

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-123',
      authStatus: 'ACTIVE',
    });
    prismaMock.traineeProfile.findUnique.mockResolvedValue(traineeProfile);
  });

  describe('GET /trainee/campaign-items/:campaignItemId/simulated-inbox', () => {
    it('returns the simulated inbox for an authorized trainee', async () => {
      const campaignItem = {
        id: 'item-123',
        simulation: {
          simulatedInbox: {
            emails: [
              {
                id: 'email-1',
                inboxId: 'inbox-1',
                senderLabel: 'Bank',
                senderAddress: 'bank@example.com',
                subject: 'Security Alert',
                preview: 'Check your account',
                receivedAt: new Date('2026-05-13T10:00:00Z'),
                difficultyLevel: 'BEGINNER',
              },
            ],
          },
        },
        campaign: {
          assignments: [{ id: 'assignment-123' }],
        },
      };

      prismaMock.campaignItem.findUnique.mockResolvedValue(campaignItem);

      const response = await request(createApp())
        .get('/trainee/campaign-items/item-123/simulated-inbox')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.emails).toHaveLength(1);
      expect(response.body.emails[0].subject).toBe('Security Alert');
      expect(response.body.emails[0].campaignAssignmentId).toBe('assignment-123');
    });

    it('returns 403 if the trainee is not assigned to the campaign', async () => {
      const campaignItem = {
        id: 'item-123',
        simulation: {
          simulatedInbox: { emails: [] },
        },
        campaign: {
          assignments: [],
        },
      };

      prismaMock.campaignItem.findUnique.mockResolvedValue(campaignItem);

      const response = await request(createApp())
        .get('/trainee/campaign-items/item-123/simulated-inbox')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('FORBIDDEN');
    });

    it('returns 404 if the campaign item does not exist', async () => {
      prismaMock.campaignItem.findUnique.mockResolvedValue(null);

      const response = await request(createApp())
        .get('/trainee/campaign-items/non-existent/simulated-inbox')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /trainee/simulated-emails/:emailId', () => {
    it('returns email details for an authorized trainee', async () => {
      const email = {
        id: 'email-123',
        inboxId: 'inbox-1',
        senderLabel: 'Bank',
        senderAddress: 'bank@example.com',
        subject: 'Security Alert',
        bodyHtml: '<p>Hello</p>',
        receivedAt: new Date(),
        difficultyLevel: 'BEGINNER',
        inbox: {
          simulation: {
            campaignItems: [
              {
                id: 'item-123',
                campaign: {
                  assignments: [{ id: 'assignment-123' }],
                },
              },
            ],
          },
        },
      };

      prismaMock.simulatedEmail.findUnique.mockResolvedValue(email);

      const response = await request(createApp())
        .get('/trainee/simulated-emails/email-123')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.subject).toBe('Security Alert');
      expect(response.body).not.toHaveProperty('expectedClassification');
    });

    it('returns 403 if trainee has no access to the email through assignments', async () => {
      const email = {
        id: 'email-123',
        inbox: {
          simulation: {
            campaignItems: [
              {
                id: 'item-123',
                campaign: {
                  assignments: [],
                },
              },
            ],
          },
        },
      };

      prismaMock.simulatedEmail.findUnique.mockResolvedValue(email);

      const response = await request(createApp())
        .get('/trainee/simulated-emails/email-123')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /trainee/simulated-emails/:emailId/interactions', () => {
    it('records an interaction event successfully', async () => {
      const email = {
        id: 'email-123',
        inbox: {
          simulation: {
            campaignItems: [
              {
                id: 'item-123',
                campaign: {
                  assignments: [{ id: 'assignment-123' }],
                },
              },
            ],
          },
        },
      };

      prismaMock.simulatedEmail.findUnique.mockResolvedValue(email);
      prismaMock.interactionEvent.create.mockResolvedValue({});

      const response = await request(createApp())
        .post('/trainee/simulated-emails/email-123/interactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          eventType: 'SIMULATED_EMAIL_OPENED',
        });

      expect(response.status).toBe(200);
      expect(prismaMock.interactionEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'SIMULATED_EMAIL_OPENED',
            simulatedEmailId: 'email-123',
          }),
        })
      );
    });

    it('returns 400 for invalid event type', async () => {
      const response = await request(createApp())
        .post('/trainee/simulated-emails/email-123/interactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          eventType: 'INVALID_EVENT',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /trainee/simulated-emails/:emailId/classification', () => {
    it('classifies an email and returns feedback', async () => {
      const email = {
        id: 'email-123',
        expectedClassification: 'PHISHING',
        redFlags: [{ id: 'rf-1', label: 'Urgent', redFlagType: 'LANGUAGE', severity: 'MEDIUM' }],
        inbox: {
          simulation: {
            campaignItems: [
              {
                id: 'item-123',
                campaign: {
                  assignments: [{ id: 'assignment-123' }],
                },
              },
            ],
          },
        },
      };

      prismaMock.simulatedEmail.findUnique.mockResolvedValue(email);
      prismaMock.emailClassificationResponse.create.mockResolvedValue({ id: 'resp-123' });

      const response = await request(createApp())
        .post('/trainee/simulated-emails/email-123/classification')
        .set('Authorization', `Bearer ${token}`)
        .send({
          selectedClassification: 'PHISHING',
          selectedRedFlagIds: ['rf-1'],
        });

      expect(response.status).toBe(200);
      expect(response.body.isCorrect).toBe(true);
      expect(response.body.redFlags).toHaveLength(1);
      expect(response.body.redFlags[0].label).toBe('Urgent');
      expect(prismaMock.emailClassificationResponse.create).toHaveBeenCalled();
    });

    it('does not leak answers in email detail response', async () => {
      const email = {
        id: 'email-123',
        inboxId: 'inbox-123',
        senderLabel: 'Bank',
        senderAddress: 'bank@example.com',
        subject: 'Security Alert',
        bodyHtml: '<p>Body</p>',
        receivedAt: new Date(),
        difficultyLevel: 'BEGINNER',
        expectedClassification: 'PHISHING',
        redFlags: [{ id: 'rf-1', label: 'Urgent' }],
        inbox: {
          simulation: {
            campaignItems: [
              {
                id: 'item-123',
                campaign: {
                  assignments: [{ id: 'assignment-123' }],
                },
              },
            ],
          },
        },
      };

      prismaMock.simulatedEmail.findUnique.mockResolvedValue(email);

      const response = await request(createApp())
        .get('/trainee/simulated-emails/email-123')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).not.toHaveProperty('expectedClassification');
      expect(response.body).not.toHaveProperty('redFlags');
    });
  });
});

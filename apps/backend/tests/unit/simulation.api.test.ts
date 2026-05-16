import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  traineeProfile: { findUnique: vi.fn() },
  campaignItem: { findUnique: vi.fn() },
  simulatedEmail: { findUnique: vi.fn() },
  interactionEvent: { create: vi.fn() },
  emailClassificationResponse: { create: vi.fn(), findFirst: vi.fn() },
}));

vi.mock('../../src/lib/prisma.js', () => ({ prisma: prismaMock }));

vi.mock('../../src/middleware/requireAuth.js', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    if (req.headers.authorization === 'Bearer mock-token') {
      req.auth = { userId: 'user-123' };
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
  });

  const createMockEmail = (assigned = true) => ({
    id: 'email-123',
    inboxId: 'inbox-1',
    senderLabel: 'Bank',
    senderAddress: 'bank@example.com',
    subject: 'Security Alert',
    bodyHtml: '<p>Hello</p>',
    receivedAt: new Date(),
    difficultyLevel: 'BEGINNER',
    expectedClassification: 'PHISHING',
    redFlags: [{ id: 'rf-1', label: 'Urgent', redFlagType: 'LANGUAGE', severity: 'MEDIUM' }],
    inbox: {
      simulation: {
        campaignItems: [
          {
            id: 'item-123',
            itemType: 'COMPONENT',
            componentType: 'SIMULATED_INBOX',
            availabilityStatus: 'AVAILABLE',
            simulation: { status: 'AVAILABLE' },
            campaign: { assignments: assigned ? [{ id: 'assignment-123' }] : [] },
          },
        ],
      },
    },
  });

  const app = createApp();

  describe('GET /trainee/campaign-items/:campaignItemId/simulated-inbox', () => {
    it('returns the simulated inbox for an authorized trainee', async () => {
      const campaignItem = {
        id: 'item-123',
        itemType: 'COMPONENT',
        componentType: 'SIMULATED_INBOX',
        availabilityStatus: 'AVAILABLE',
        simulation: {
          status: 'AVAILABLE',
          simulatedInbox: { emails: [createMockEmail()] },
        },
        campaign: { assignments: [{ id: 'assignment-123' }] },
      };
      prismaMock.campaignItem.findUnique.mockResolvedValue(campaignItem);

      const response = await request(app)
        .get('/trainee/campaign-items/item-123/simulated-inbox')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.emails[0].subject).toBe('Security Alert');
    });

    it('returns 404 if campaign item is unavailable or invalid type', async () => {
      const campaignItem = {
        id: 'item-123',
        itemType: 'COMPONENT',
        componentType: 'TRAINING_DOCUMENT',
        availabilityStatus: 'AVAILABLE',
        simulation: null,
        campaign: { assignments: [{ id: 'assignment-123' }] },
      };
      prismaMock.campaignItem.findUnique.mockResolvedValue(campaignItem);

      const response = await request(app)
        .get('/trainee/campaign-items/item-123/simulated-inbox')
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(404);
    });

    it('returns 401 if missing auth', async () => {
      const response = await request(app).get('/trainee/campaign-items/item-123/simulated-inbox');
      expect(response.status).toBe(401);
    });

    it('returns 400 for malformed campaign item id', async () => {
      const response = await request(app)
        .get('/trainee/campaign-items/%20%20/simulated-inbox')
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(400);
    });
  });

  describe('POST /trainee/simulated-emails/:emailId/interactions', () => {
    it('records an interaction using resolved context and ignores client-supplied ids', async () => {
      prismaMock.simulatedEmail.findUnique.mockResolvedValue(createMockEmail());
      prismaMock.interactionEvent.create.mockResolvedValue({ id: 'event-1' });

      const response = await request(app)
        .post('/trainee/simulated-emails/email-123/interactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          eventType: 'SIMULATED_EMAIL_LINK_CLICKED',
          campaignAssignmentId: 'hacker-assignment',
          campaignItemId: 'hacker-item',
        });

      expect(response.status).toBe(200);
      expect(prismaMock.interactionEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            campaignAssignmentId: 'assignment-123',
            campaignItemId: 'item-123',
            eventType: 'SIMULATED_EMAIL_LINK_CLICKED',
          }),
        }),
      );
    });
  });

  describe('POST /trainee/simulated-emails/:emailId/classification', () => {
    it('prevents duplicate classifications', async () => {
      prismaMock.simulatedEmail.findUnique.mockResolvedValue(createMockEmail());
      prismaMock.emailClassificationResponse.findFirst.mockResolvedValue({ id: 'existing' });

      const response = await request(app)
        .post('/trainee/simulated-emails/email-123/classification')
        .set('Authorization', `Bearer ${token}`)
        .send({ selectedClassification: 'SAFE' });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('ALREADY_CLASSIFIED');
    });

    it('returns 400 if selected red flags are invalid', async () => {
      prismaMock.simulatedEmail.findUnique.mockResolvedValue(createMockEmail());
      prismaMock.emailClassificationResponse.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .post('/trainee/simulated-emails/email-123/classification')
        .set('Authorization', `Bearer ${token}`)
        .send({ selectedClassification: 'PHISHING', selectedRedFlagIds: ['invalid-rf'] });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });

    it('classifies an email and creates interaction event with correct context', async () => {
      prismaMock.simulatedEmail.findUnique.mockResolvedValue(createMockEmail());
      prismaMock.emailClassificationResponse.findFirst.mockResolvedValue(null);
      prismaMock.emailClassificationResponse.create.mockResolvedValue({ id: 'resp-123' });
      prismaMock.interactionEvent.create.mockResolvedValue({ id: 'event-2' });

      const response = await request(app)
        .post('/trainee/simulated-emails/email-123/classification')
        .set('Authorization', `Bearer ${token}`)
        .send({
          selectedClassification: 'PHISHING',
          selectedRedFlagIds: ['rf-1'],
          campaignAssignmentId: 'forged',
          campaignItemId: 'forged',
        });

      expect(response.status).toBe(200);
      expect(prismaMock.emailClassificationResponse.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            campaignAssignmentId: 'assignment-123',
            campaignItemId: 'item-123',
          }),
        }),
      );
      expect(prismaMock.interactionEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'SIMULATED_EMAIL_CLASSIFIED',
            campaignAssignmentId: 'assignment-123',
            campaignItemId: 'item-123',
            emailClassificationResponseId: 'resp-123',
          }),
        }),
      );
    });
  });
});

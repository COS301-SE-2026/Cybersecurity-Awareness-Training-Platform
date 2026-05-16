import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  traineeProfile: { findUnique: vi.fn() },
  campaignItem: { findUnique: vi.fn() },
  simulatedEmail: { findUnique: vi.fn() },
  interactionEvent: { create: vi.fn() },
  emailClassificationResponse: { create: vi.fn() },
}));

vi.mock('../../src/lib/prisma.js', () => ({ prisma: prismaMock }));

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
            campaign: { assignments: assigned ? [{ id: 'assignment-123' }] : [] },
          },
        ],
      },
    },
  });

  describe('GET /trainee/campaign-items/:campaignItemId/simulated-inbox', () => {
    it('returns the simulated inbox for an authorized trainee', async () => {
      const campaignItem = {
        id: 'item-123',
        simulation: {
          simulatedInbox: {
            emails: [createMockEmail()],
          },
        },
        campaign: { assignments: [{ id: 'assignment-123' }] },
      };
      prismaMock.campaignItem.findUnique.mockResolvedValue(campaignItem);

      const response = await request(createApp())
        .get('/trainee/campaign-items/item-123/simulated-inbox')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.emails[0].subject).toBe('Security Alert');
    });

    it('returns 403 if the trainee is not assigned to the campaign', async () => {
      prismaMock.campaignItem.findUnique.mockResolvedValue({
        id: 'item-123',
        simulation: { simulatedInbox: { emails: [] } },
        campaign: { assignments: [] },
      });
      const response = await request(createApp())
        .get('/trainee/campaign-items/item-123/simulated-inbox')
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(403);
    });
  });

  describe('GET /trainee/simulated-emails/:emailId', () => {
    it('returns email details for an authorized trainee', async () => {
      prismaMock.simulatedEmail.findUnique.mockResolvedValue(createMockEmail());
      const response = await request(createApp())
        .get('/trainee/simulated-emails/email-123')
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(200);
      expect(response.body.subject).toBe('Security Alert');
    });

    it('returns 403 if trainee has no access', async () => {
      prismaMock.simulatedEmail.findUnique.mockResolvedValue(createMockEmail(false));
      const response = await request(createApp())
        .get('/trainee/simulated-emails/email-123')
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(403);
    });
  });

  describe('POST /trainee/simulated-emails/:emailId/interactions', () => {
    it('records an interaction successfully', async () => {
      prismaMock.simulatedEmail.findUnique.mockResolvedValue(createMockEmail());
      const response = await request(createApp())
        .post('/trainee/simulated-emails/email-123/interactions')
        .set('Authorization', `Bearer ${token}`)
        .send({ eventType: 'SIMULATED_EMAIL_OPENED' });
      expect(response.status).toBe(200);
    });
  });

  describe('POST /trainee/simulated-emails/:emailId/classification', () => {
    it('classifies an email and returns feedback', async () => {
      prismaMock.simulatedEmail.findUnique.mockResolvedValue(createMockEmail());
      prismaMock.emailClassificationResponse.create.mockResolvedValue({ id: 'resp-123' });
      const response = await request(createApp())
        .post('/trainee/simulated-emails/email-123/classification')
        .set('Authorization', `Bearer ${token}`)
        .send({ selectedClassification: 'PHISHING', selectedRedFlagIds: ['rf-1'] });
      expect(response.status).toBe(200);
      expect(response.body.isCorrect).toBe(true);
    });

    it('does not leak answers in detail response', async () => {
      prismaMock.simulatedEmail.findUnique.mockResolvedValue(createMockEmail());
      const response = await request(createApp())
        .get('/trainee/simulated-emails/email-123')
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(200);
      expect(response.body).not.toHaveProperty('expectedClassification');
      expect(response.body).not.toHaveProperty('redFlags');
    });
  });
});

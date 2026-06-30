import { createTransport } from 'nodemailer';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const sendMailMock = vi.hoisted(() => vi.fn());
const nodemailerMock = vi.hoisted(() => ({
  createTransport: vi.fn(() => ({ sendMail: sendMailMock })),
}));
vi.mock('nodemailer', () => ({ default: nodemailerMock }));
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { clearApiRateLimitStore } from '../../src/middleware/apiRateLimit.js';
import { createTrainee } from '../helpers/factories.js';
import { clearAuthRateLimitStore } from '../../src/middleware/authRateLimit.js';

const password = 'SecurePassword@123!';
function registerPayload(email = 'johan@example.com') {
  return { email, firstName: 'Johan', lastName: 'Nel', password };
}
function organisationRequestPayload(email = 'johan@example.com') {
  return {
    organisationName: 'Test Org',
    organisationDescription: 'Testing Organisation',
    organisationSize: 10,
    organisationWebsiteUrl: 'https://organisation.example.com',
    representativeFirstName: 'Johan',
    representativeLastName: 'Nel',
    representativeEmail: email,
  };
}

describe('email delivery integration', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    clearAuthRateLimitStore();
    await clearApiRateLimitStore();
    sendMailMock.mockResolvedValue({ messageId: 'smtpmessage01' });
  }); //beforeeach

  it('createa a sent email delivery log when the registration verification email sends', async () => {
    const response = await request(createApp())
      .post('/auth/register')
      .send(registerPayload('johanregistersent@example.com'));
    expect(response.status).toBe(201);
    expect(response.body.verificationEmailQueued).toBe(true);

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'johanregistersent@example.com' },
    });
    const actionToken = await prisma.actionToken.findFirstOrThrow({
      where: { userId: user.id, purpose: 'EMAIL_VERIFICATION' },
    });
    const deliveryLog = await prisma.emailDeliveryLog.findFirstOrThrow({
      where: { userId: user.id, actionTokenId: actionToken.id, emailType: 'EMAIL_VERIFICATION' },
    });

    expect(deliveryLog.recipientEmail).toBe('johanregistersent@example.com');
    expect(deliveryLog.deliveryStatus).toBe('SENT');
    expect(deliveryLog.providerMessageId).toBe('smtpmessage01');
    expect(deliveryLog.sentAt).toBeInstanceOf(Date);
    expect(deliveryLog.failedAt).toBeNull();
    expect(deliveryLog.failureReason).toBeNull();
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'johanregistersent@example.com',
        subject: 'Verify your email address',
        text: expect.stringContaining('Verify email:'),
        html: expect.stringContaining('Verify email'),
      }),
    );
  });
}); //describe

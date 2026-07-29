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
  return { email, firstName: 'Johan', lastName: 'Nel', password, confirmPassword: password };
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
    expect(response.body).toEqual({
      message:
        "If this email can be registered, we'll send you an email verification link. Please check your inbox.",
    });

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

  it('creates a failed email delivery log when registration verification fails', async () => {
    sendMailMock.mockRejectedValueOnce(new Error('SMTP broke'));
    const response = await request(createApp())
      .post('/auth/register')
      .send(registerPayload('johanregisterfails@example.com'));
    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      message:
        "If this email can be registered, we'll send you an email verification link. Please check your inbox.",
    });

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'johanregisterfails@example.com' },
    });
    const deliveryLog = await prisma.emailDeliveryLog.findFirstOrThrow({
      where: { userId: user.id, emailType: 'EMAIL_VERIFICATION' },
    });

    expect(deliveryLog.recipientEmail).toBe('johanregisterfails@example.com');
    expect(deliveryLog.deliveryStatus).toBe('FAILED');
    expect(deliveryLog.sentAt).toBeNull();
    expect(deliveryLog.failedAt).toBeInstanceOf(Date);
    expect(deliveryLog.failureReason).toBe('SMTP_NOT_ACCEPTED');
    expect(deliveryLog.failureReason).not.toContain('SMTP broke');
  });

  it('resends verification emails and records a sent delivry log', async () => {
    const email = 'johanresend@example.com';
    const { user } = await createTrainee({
      user: {
        email,
        firstName: 'Johan',
        lastName: 'Nel',
        authStatus: 'PENDING_EMAIL_VERIFICATION',
      },
    });
    const response = await request(createApp()).post('/auth/resend-verification').send({ email });
    expect(response.status).toBe(200);
    expect(response.body.message).toContain('verification link has been sent');

    const actionToken = await prisma.actionToken.findFirstOrThrow({
      where: { userId: user.id, purpose: 'EMAIL_VERIFICATION' },
      orderBy: { createdAt: 'desc' },
    });
    const deliveryLog = await prisma.emailDeliveryLog.findFirstOrThrow({
      where: { userId: user.id, emailType: 'EMAIL_VERIFICATION', actionTokenId: actionToken.id },
    });

    expect(deliveryLog.recipientEmail).toBe(email);
    expect(deliveryLog.deliveryStatus).toBe('SENT');
    expect(deliveryLog.providerMessageId).toBe('smtpmessage01');
    expect(deliveryLog.sentAt).toBeInstanceOf(Date);
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: email,
        subject: 'Verify your email address',
        text: expect.stringContaining('Hi Johan,'),
        html: expect.stringContaining('Hi Johan,'),
      }),
    );
  });

  it('records a send request received email log for organisation registration requests', async () => {
    const response = await request(createApp())
      .post('/organisation-registration-requests')
      .send(organisationRequestPayload('orgrequest@example.com'));
    expect(response.status).toBe(201);
    expect(response.body.status).toBe('PENDING_REVIEW');
    expect(response.body.confirmationEmailQueued).toBe(true);

    const requestRecord = await prisma.organisationRegistrationRequest.findFirstOrThrow({
      where: { representativeEmail: 'orgrequest@example.com' },
    });
    const deliveryLog = await prisma.emailDeliveryLog.findFirstOrThrow({
      where: {
        organisationRegistrationRequestId: requestRecord.id,
        emailType: 'ORGANISATION_REQUEST_RECEIVED',
      },
    });

    expect(deliveryLog.recipientEmail).toBe('orgrequest@example.com');
    expect(deliveryLog.deliveryStatus).toBe('SENT');
    expect(deliveryLog.providerMessageId).toBe('smtpmessage01');
    expect(deliveryLog.sentAt).toBeInstanceOf(Date);
    expect(deliveryLog.failedAt).toBeNull();
    expect(deliveryLog.failureReason).toBeNull();
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'orgrequest@example.com',
        subject: "We've received your organisation registration request",
        text: expect.stringContaining('Test Org'),
        html: expect.stringContaining('Test Org'),
      }),
    );
  });

  it('records a failed request received email log for organisation registration requests that fail', async () => {
    sendMailMock.mockRejectedValueOnce(new Error('SMTP broken'));
    const response = await request(createApp())
      .post('/organisation-registration-requests')
      .send(organisationRequestPayload('orgrequestfail@example.com'));
    expect(response.status).toBe(201);
    expect(response.body.status).toBe('PENDING_REVIEW');
    expect(response.body.confirmationEmailQueued).toBe(false);

    const requestRecord = await prisma.organisationRegistrationRequest.findFirstOrThrow({
      where: { representativeEmail: 'orgrequestfail@example.com' },
    });
    const deliveryLog = await prisma.emailDeliveryLog.findFirstOrThrow({
      where: {
        organisationRegistrationRequestId: requestRecord.id,
        emailType: 'ORGANISATION_REQUEST_RECEIVED',
      },
    });

    expect(deliveryLog.recipientEmail).toBe('orgrequestfail@example.com');
    expect(deliveryLog.deliveryStatus).toBe('FAILED');
    expect(deliveryLog.providerMessageId).toBeNull();
    expect(deliveryLog.sentAt).toBeNull();
    expect(deliveryLog.failedAt).toBeInstanceOf(Date);
    expect(deliveryLog.failureReason).toBe('SMTP_NOT_ACCEPTED');
    expect(deliveryLog.failureReason).not.toContain('SMTP broken');
  });
}); //describe

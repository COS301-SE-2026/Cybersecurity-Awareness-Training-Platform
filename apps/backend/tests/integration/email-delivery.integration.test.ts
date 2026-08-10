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
import { runEmailDispatcherCycle } from '../../src/services/email-dispatcher.service.js';
import {
  claimDueEmailDeliveryJobs,
  recordEmailDeliveryAccepted,
} from '../../src/repositories/email-delivery.repository.js';
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

function smtpErrorWith(input: { message: string; code: string; command?: string }) {
  const error: NodeJS.ErrnoException & { command?: string } = new Error(input.message);
  error.code = input.code;
  error.command = input.command;
  return error;
}

describe('email delivery integration', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    clearAuthRateLimitStore();
    await clearApiRateLimitStore();
    sendMailMock.mockResolvedValue({ messageId: 'smtpmessage01' });
  }); //beforeeach

  it('queues then sends a registration verification email through the dispatcher', async () => {
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
    expect(deliveryLog.deliveryStatus).toBe('PENDING');
    expect(sendMailMock).not.toHaveBeenCalled();

    await runEmailDispatcherCycle();

    const sentDeliveryLog = await prisma.emailDeliveryLog.findUniqueOrThrow({
      where: { id: deliveryLog.id },
    });

    expect(sentDeliveryLog.deliveryStatus).toBe('SENT');
    expect(sentDeliveryLog.providerMessageId).toBe('smtpmessage01');
    expect(sentDeliveryLog.sentAt).toBeInstanceOf(Date);
    expect(sentDeliveryLog.failedAt).toBeNull();
    expect(sentDeliveryLog.failureReason).toBeNull();
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'johanregistersent@example.com',
        subject: 'Verify your email address',
        text: expect.stringContaining('Verify email:'),
        html: expect.stringContaining('Verify email'),
      }),
    );
  });

  it('queues then records terminal failure when registration verification delivery fails', async () => {
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
    expect(deliveryLog.deliveryStatus).toBe('PENDING');
    expect(sendMailMock).not.toHaveBeenCalled();

    await runEmailDispatcherCycle();

    const failedDeliveryLog = await prisma.emailDeliveryLog.findUniqueOrThrow({
      where: { id: deliveryLog.id },
    });

    expect(failedDeliveryLog.deliveryStatus).toBe('FAILED');
    expect(failedDeliveryLog.sentAt).toBeNull();
    expect(failedDeliveryLog.failedAt).toBeInstanceOf(Date);
    expect(failedDeliveryLog.failureReason).toBe('SMTP_UNKNOWN_FAILURE');
    expect(failedDeliveryLog.failureReason).not.toContain('SMTP broke');
  });

  it('resends verification emails and records dispatcher delivery', async () => {
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
    expect(response.body.message).toContain('verification link has been queued for delivery');

    const actionToken = await prisma.actionToken.findFirstOrThrow({
      where: { userId: user.id, purpose: 'EMAIL_VERIFICATION' },
      orderBy: { createdAt: 'desc' },
    });
    const deliveryLog = await prisma.emailDeliveryLog.findFirstOrThrow({
      where: { userId: user.id, emailType: 'EMAIL_VERIFICATION', actionTokenId: actionToken.id },
    });

    expect(deliveryLog.recipientEmail).toBe(email);
    expect(deliveryLog.deliveryStatus).toBe('PENDING');
    expect(sendMailMock).not.toHaveBeenCalled();

    await runEmailDispatcherCycle();

    const sentDeliveryLog = await prisma.emailDeliveryLog.findUniqueOrThrow({
      where: { id: deliveryLog.id },
    });

    expect(sentDeliveryLog.deliveryStatus).toBe('SENT');
    expect(sentDeliveryLog.providerMessageId).toBe('smtpmessage01');
    expect(sentDeliveryLog.sentAt).toBeInstanceOf(Date);
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: email,
        subject: 'Verify your email address',
        text: expect.stringContaining('Hi Johan,'),
        html: expect.stringContaining('Hi Johan,'),
      }),
    );
  });

  it('queues then sends a request received email for organisation registration requests', async () => {
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
    expect(deliveryLog.deliveryStatus).toBe('PENDING');
    expect(sendMailMock).not.toHaveBeenCalled();

    await runEmailDispatcherCycle();

    const sentDeliveryLog = await prisma.emailDeliveryLog.findUniqueOrThrow({
      where: { id: deliveryLog.id },
    });

    expect(sentDeliveryLog.deliveryStatus).toBe('SENT');
    expect(sentDeliveryLog.providerMessageId).toBe('smtpmessage01');
    expect(sentDeliveryLog.sentAt).toBeInstanceOf(Date);
    expect(sentDeliveryLog.failedAt).toBeNull();
    expect(sentDeliveryLog.failureReason).toBeNull();
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'orgrequest@example.com',
        subject: "We've received your organisation registration request",
        text: expect.stringContaining('Test Org'),
        html: expect.stringContaining('Test Org'),
      }),
    );
  });

  it('queues then records failed request received email delivery through the dispatcher', async () => {
    sendMailMock.mockRejectedValueOnce(new Error('SMTP broken'));
    const response = await request(createApp())
      .post('/organisation-registration-requests')
      .send(organisationRequestPayload('orgrequestfail@example.com'));
    expect(response.status).toBe(201);
    expect(response.body.status).toBe('PENDING_REVIEW');
    expect(response.body.confirmationEmailQueued).toBe(true);

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
    expect(deliveryLog.deliveryStatus).toBe('PENDING');
    expect(sendMailMock).not.toHaveBeenCalled();

    await runEmailDispatcherCycle();

    const failedDeliveryLog = await prisma.emailDeliveryLog.findUniqueOrThrow({
      where: { id: deliveryLog.id },
    });

    expect(failedDeliveryLog.deliveryStatus).toBe('FAILED');
    expect(failedDeliveryLog.providerMessageId).toBeNull();
    expect(failedDeliveryLog.sentAt).toBeNull();
    expect(failedDeliveryLog.failedAt).toBeInstanceOf(Date);
    expect(failedDeliveryLog.failureReason).toBe('SMTP_UNKNOWN_FAILURE');
    expect(failedDeliveryLog.failureReason).not.toContain('SMTP broken');
  });

  it('retries a pre-submission SMTP transport failure and succeeds without another HTTP request', async () => {
    sendMailMock.mockRejectedValueOnce(
      smtpErrorWith({ message: 'connect timed out', code: 'ETIMEDOUT' }),
    );

    const response = await request(createApp())
      .post('/auth/register')
      .send(registerPayload('retryable.smtp@example.com'));
    expect(response.status).toBe(201);

    await runEmailDispatcherCycle();

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'retryable.smtp@example.com' },
    });
    const deliveryLog = await prisma.emailDeliveryLog.findFirstOrThrow({
      where: { userId: user.id, emailType: 'EMAIL_VERIFICATION' },
    });
    const retryJob = await prisma.emailDeliveryJob.findUniqueOrThrow({
      where: { deliveryLogId: deliveryLog.id },
    });

    expect(retryJob.status).toBe('RETRY_SCHEDULED');
    expect(retryJob.lastProviderOutcome).toBe('PROVIDER_TEMPORARY_FAILURE');
    expect(retryJob.lastReasonCode).toBe('SMTP_PRE_SUBMISSION_TRANSPORT_FAILURE');
    expect(sendMailMock).toHaveBeenCalledTimes(1);

    await prisma.emailDeliveryJob.update({
      where: { id: retryJob.id },
      data: { nextAttemptAt: new Date(Date.now() - 1000) },
    });

    await runEmailDispatcherCycle();

    const sentDeliveryLog = await prisma.emailDeliveryLog.findUniqueOrThrow({
      where: { id: deliveryLog.id },
    });
    const sentJob = await prisma.emailDeliveryJob.findUniqueOrThrow({
      where: { id: retryJob.id },
    });

    expect(sentDeliveryLog.deliveryStatus).toBe('SENT');
    expect(sentJob.status).toBe('SUCCEEDED');
    expect(sendMailMock).toHaveBeenCalledTimes(2);
  });

  it('does not resend an ambiguous SMTP failure after DATA', async () => {
    sendMailMock.mockRejectedValueOnce(
      smtpErrorWith({ message: 'socket closed after data', code: 'ECONNRESET', command: 'DATA' }),
    );

    const response = await request(createApp())
      .post('/auth/register')
      .send(registerPayload('ambiguous.smtp@example.com'));
    expect(response.status).toBe(201);

    await runEmailDispatcherCycle();

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'ambiguous.smtp@example.com' },
    });
    const deliveryLog = await prisma.emailDeliveryLog.findFirstOrThrow({
      where: { userId: user.id, emailType: 'EMAIL_VERIFICATION' },
    });
    const failedJob = await prisma.emailDeliveryJob.findUniqueOrThrow({
      where: { deliveryLogId: deliveryLog.id },
    });

    expect(deliveryLog.deliveryStatus).toBe('FAILED');
    expect(failedJob.status).toBe('FAILED');
    expect(failedJob.lastProviderOutcome).toBe('PROVIDER_AMBIGUOUS');
    expect(failedJob.lastReasonCode).toBe('SMTP_AMBIGUOUS_AFTER_DATA');
    expect(sendMailMock).toHaveBeenCalledTimes(1);

    await runEmailDispatcherCycle();

    expect(sendMailMock).toHaveBeenCalledTimes(1);
  });

  it('does not resend after provider acceptance when final persistence fails', async () => {
    const response = await request(createApp())
      .post('/auth/register')
      .send(registerPayload('accepted.persistence@example.com'));
    expect(response.status).toBe(201);

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'accepted.persistence@example.com' },
    });
    const deliveryLog = await prisma.emailDeliveryLog.findFirstOrThrow({
      where: { userId: user.id, emailType: 'EMAIL_VERIFICATION' },
    });

    const updateSpy = vi
      .spyOn(prisma.emailDeliveryLog, 'update')
      .mockRejectedValueOnce(new Error('delivery log write failed'));

    await runEmailDispatcherCycle();
    updateSpy.mockRestore();

    const safeJob = await prisma.emailDeliveryJob.findUniqueOrThrow({
      where: { deliveryLogId: deliveryLog.id },
    });
    const safeDeliveryLog = await prisma.emailDeliveryLog.findUniqueOrThrow({
      where: { id: deliveryLog.id },
    });

    expect(safeJob.status).toBe('FAILED');
    expect(safeJob.lastProviderOutcome).toBe('PROVIDER_PERSISTENCE_FAILED');
    expect(safeDeliveryLog.deliveryStatus).toBe('FAILED');
    expect(sendMailMock).toHaveBeenCalledTimes(1);

    await runEmailDispatcherCycle();

    expect(sendMailMock).toHaveBeenCalledTimes(1);
  });

  it('prevents a stale lease owner from finalising delivery', async () => {
    const response = await request(createApp())
      .post('/auth/register')
      .send(registerPayload('stale.lease@example.com'));
    expect(response.status).toBe(201);

    const ownerOne = 'integration-owner-one';
    const ownerTwo = 'integration-owner-two';
    const claimedJobs = await claimDueEmailDeliveryJobs({
      leaseOwner: ownerOne,
      batchSize: 1,
      leaseSeconds: 75,
      retryDeadlineSeconds: 120,
    });

    expect(claimedJobs).toHaveLength(1);
    const claimedJob = claimedJobs[0];

    await prisma.emailDeliveryJob.update({
      where: { id: claimedJob.id },
      data: {
        leaseOwner: ownerTwo,
        leaseExpiresAt: new Date(Date.now() + 75_000),
      },
    });

    const recorded = await recordEmailDeliveryAccepted({
      jobId: claimedJob.id,
      deliveryLogId: claimedJob.deliveryLogId,
      providerMessageId: 'smtpmessage01',
      leaseOwner: ownerOne,
    });

    const deliveryLog = await prisma.emailDeliveryLog.findUniqueOrThrow({
      where: { id: claimedJob.deliveryLogId },
    });
    const job = await prisma.emailDeliveryJob.findUniqueOrThrow({
      where: { id: claimedJob.id },
    });

    expect(recorded).toBe(false);
    expect(deliveryLog.deliveryStatus).toBe('PENDING');
    expect(job.leaseOwner).toBe(ownerTwo);
  });

  it('expires a job past the retry deadline before sending it', async () => {
    const response = await request(createApp())
      .post('/auth/register')
      .send(registerPayload('deadline.expired@example.com'));
    expect(response.status).toBe(201);

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'deadline.expired@example.com' },
    });
    const deliveryLog = await prisma.emailDeliveryLog.findFirstOrThrow({
      where: { userId: user.id, emailType: 'EMAIL_VERIFICATION' },
    });

    await prisma.emailDeliveryJob.update({
      where: { deliveryLogId: deliveryLog.id },
      data: {
        firstAttemptAt: new Date(Date.now() - 180_000),
        retryDeadlineAt: new Date(Date.now() - 60_000),
      },
    });

    await runEmailDispatcherCycle();

    const expiredLog = await prisma.emailDeliveryLog.findUniqueOrThrow({
      where: { id: deliveryLog.id },
    });
    const expiredJob = await prisma.emailDeliveryJob.findUniqueOrThrow({
      where: { deliveryLogId: deliveryLog.id },
    });

    expect(expiredLog.deliveryStatus).toBe('FAILED');
    expect(expiredLog.failureReason).toBe('EMAIL_RETRY_DEADLINE_EXCEEDED');
    expect(expiredJob.status).toBe('FAILED');
    expect(expiredJob.lastReasonCode).toBe('EMAIL_RETRY_DEADLINE_EXCEEDED');
    expect(sendMailMock).not.toHaveBeenCalled();
  });
}); //describe

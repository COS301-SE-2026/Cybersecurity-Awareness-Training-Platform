import { beforeEach, describe, expect, it, vi } from 'vitest';
const { sendEmail } = await import('../../src/services/email.service.js');
const sendMailMock = vi.hoisted(() => vi.fn());

const nodemailerMock = vi.hoisted(() => ({
  createTransport: vi.fn(() => ({
    sendMail: sendMailMock,
  })),
}));

vi.mock('nodemailer', () => ({
  default: nodemailerMock,
}));

vi.mock('../../src/config/env.js', () => ({
  env: {
    SMTP_HOST: 'mailpit',
    SMTP_PORT: 1025,
    SMTP_SECURE: false,
    SMTP_FROM_ADDRESS: 'noreply@insightful-phish.local',
    SMTP_FROM_NAME: 'Insightful Phish',
    SMTP_USER: undefined,
    SMTP_PASSWORD: undefined,
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/insightful_phish_test',
    FRONTEND_ORIGIN: 'http://frontend.com',
    EMAIL_DISPATCHER_MAX_ATTEMPTS: 4,
  },
}));

const emailDeliveryLogMock = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
}));
const emailDeliveryJobMock = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
}));
const invitationMock = vi.hoisted(() => ({ updateMany: vi.fn() }));
const actionTokenMock = vi.hoisted(() => ({ findUnique: vi.fn().mockResolvedValue(null) }));

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: {
    emailDeliveryLog: emailDeliveryLogMock,
    emailDeliveryJob: emailDeliveryJobMock,
    invitation: invitationMock,
    actionToken: actionTokenMock,
  },
}));

const tokenExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000);
const baseInput = {
  emailType: 'EMAIL_VERIFICATION' as const,
  recipientEmail: 'developer@example.com',
  relatedEntity: { actionTokenId: 'actiontoken01', userId: 'user01' },
  templateData: {
    firstName: 'Johan',
    actionToken: 'rawactiontokenqwertyuiopasdfghjklzxcvbnm',
    actionTokenExpiresAt: tokenExpiry,
  },
};

describe('sendEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    emailDeliveryLogMock.create.mockResolvedValue({
      id: 'emaillog01',
    });
    emailDeliveryJobMock.create.mockResolvedValue({
      id: 'emailjob01',
    });
  });

  it('creates a pending delivery log and render-ready queue job without calling SMTP', async () => {
    const result = await sendEmail(baseInput);

    expect(emailDeliveryLogMock.create).toHaveBeenCalledWith({
      data: {
        recipientEmail: 'developer@example.com',
        emailType: 'EMAIL_VERIFICATION',
        fallbackRelatedEntityType: null,
        fallbackRelatedEntityId: null,
        userId: 'user01',
        actionTokenId: 'actiontoken01',
        organisationId: null,
        organisationRegistrationRequestId: null,
        invitationId: null,
        deliveryStatus: 'PENDING',
      },
    });
    expect(emailDeliveryJobMock.create).toHaveBeenCalledWith({
      data: {
        deliveryLogId: 'emaillog01',
        recipientEmail: 'developer@example.com',
        subject: 'Verify your email address',
        textBody: expect.stringContaining(
          'Verify email: http://frontend.com/verify-email?token=rawactiontokenqwertyuiopasdfghjklzxcvbnm',
        ),
        htmlBody: expect.stringContaining(
          'href="http://frontend.com/verify-email?token=rawactiontokenqwertyuiopasdfghjklzxcvbnm"',
        ),
        emailType: 'EMAIL_VERIFICATION',
        invitationStateVersion: null,
        maxAttempts: 4,
      },
    });
    expect(nodemailerMock.createTransport).not.toHaveBeenCalled();
    expect(sendMailMock).not.toHaveBeenCalled();
    expect(emailDeliveryLogMock.update).not.toHaveBeenCalled();
    expect(invitationMock.updateMany).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: 'QUEUED',
      queueAccepted: true,
      queued: true,
      deliveryLogId: 'emaillog01',
      jobId: 'emailjob01',
    });
  });

  it('uses nullable defaults for optional relation fields', async () => {
    await sendEmail({
      emailType: 'PASSWORD_RESET',
      recipientEmail: 'developer@example.com',
      relatedEntity: { fallbackType: 'OTHER' },
      templateData: {
        firstName: 'Developer',
        actionToken: 'rawactiontokenqwertyuiopasdfghjklzxcvbnm',
        actionTokenExpiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
    });

    expect(emailDeliveryLogMock.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fallbackRelatedEntityType: 'OTHER',
        fallbackRelatedEntityId: null,
        actionTokenId: null,
        userId: null,
        organisationId: null,
        organisationRegistrationRequestId: null,
        invitationId: null,
      }),
    });
  });

  it('uses a provided repository client if one is passed', async () => {
    const transactionClient = {
      emailDeliveryLog: {
        create: vi.fn().mockResolvedValue({ id: 'emaillogfromtx' }),
        update: vi.fn(),
      },
      emailDeliveryJob: {
        create: vi.fn().mockResolvedValue({ id: 'emailjobfromtx' }),
        update: vi.fn(),
      },
      invitation: {
        updateMany: vi.fn(),
      },
      actionToken: { findUnique: vi.fn().mockResolvedValue(null) },
    };

    const result = await sendEmail(baseInput, transactionClient);

    expect(transactionClient.emailDeliveryLog.create).toHaveBeenCalledTimes(1);
    expect(transactionClient.emailDeliveryJob.create).toHaveBeenCalledTimes(1);
    expect(emailDeliveryLogMock.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: 'QUEUED',
      queueAccepted: true,
      queued: true,
      deliveryLogId: 'emaillogfromtx',
      jobId: 'emailjobfromtx',
    });
  });

  it('does not write fallback relation fields when a typed relation is provided', async () => {
    await sendEmail({
      ...baseInput,
      relatedEntity: {
        ...baseInput.relatedEntity,
        fallbackType: 'ACTIONTOKEN',
        fallbackId: 'actiontoken01',
      },
    });

    expect(emailDeliveryLogMock.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actionTokenId: 'actiontoken01',
        fallbackRelatedEntityType: null,
        fallbackRelatedEntityId: null,
      }),
    });
  });

  it('returns not queued for fallback-only email logs without a relatedEntityType', async () => {
    const result = await sendEmail({
      emailType: 'PASSWORD_RESET',
      recipientEmail: 'developer@example.com',
      relatedEntity: {},
      templateData: {
        firstName: 'Developer',
        actionToken: 'rawactiontokenqwertyuiopasdfghjklzxcvbnm',
        actionTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    expect(result).toEqual({
      status: 'NOT_QUEUED',
      queueAccepted: false,
      queued: false,
      failureReason: 'TEMPLATE_RENDER_FAILED',
    });
    expect(emailDeliveryLogMock.create).not.toHaveBeenCalled();
    expect(emailDeliveryJobMock.create).not.toHaveBeenCalled();
  });

  it('returns a stable code when queue persistence fails', async () => {
    emailDeliveryLogMock.create.mockRejectedValueOnce(
      new Error('duplicate key value violates unique constraint email_delivery_log_pkey'),
    );

    const result = await sendEmail(baseInput);

    expect(result).toEqual({
      status: 'NOT_QUEUED',
      queueAccepted: false,
      queued: false,
      failureReason: 'DELIVERY_QUEUE_CREATE_FAILED',
    });
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('returns not queued for missing template variables before creating delivery log', async () => {
    const result = await sendEmail({
      emailType: 'EMAIL_VERIFICATION',
      recipientEmail: 'johan@example.com',
      relatedEntity: { userId: 'user01', actionTokenId: 'token01' },
      templateData: {
        firstName: 'Johan',
        actionToken: 'rawactiontokenqwertyuiopasdfghjklzxcvbnm',
      },
    });

    expect(result).toEqual({
      status: 'NOT_QUEUED',
      queueAccepted: false,
      queued: false,
      failureReason: 'TEMPLATE_RENDER_FAILED',
    });
    expect(emailDeliveryLogMock.create).not.toHaveBeenCalled();
    expect(emailDeliveryJobMock.create).not.toHaveBeenCalled();
    expect(sendMailMock).not.toHaveBeenCalled();
  });
});

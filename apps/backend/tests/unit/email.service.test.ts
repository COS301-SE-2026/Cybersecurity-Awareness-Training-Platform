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
  },
}));

const emailDeliveryLogMock = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
}));
const invitationMock = vi.hoisted(() => ({ update: vi.fn() }));

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: {
    emailDeliveryLog: emailDeliveryLogMock,
    invitation: invitationMock,
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

const sentLogUpdate = {
  where: { id: 'emaillog01' },
  data: {
    deliveryStatus: 'SENT',
    providerMessageId: 'smtpmessage01',
    sentAt: expect.any(Date),
  },
};

const deliveryLogSentWriteFailure = {
  stage: 'DELIVERY_LOG_SENT',
  code: 'DELIVERY_LOG_SENT_WRITE_FAILED',
};

const invitationSentWriteFailure = {
  stage: 'INVITATION_SENT',
  code: 'INVITATION_SENT_WRITE_FAILED',
};

const deliveryLogFailedWriteFailure = {
  stage: 'DELIVERY_LOG_FAILED',
  code: 'DELIVERY_LOG_FAILED_WRITE_FAILED',
};

describe('sendEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    emailDeliveryLogMock.create.mockResolvedValue({
      id: 'emaillog01',
    });

    sendMailMock.mockResolvedValue({
      messageId: 'smtpmessage01',
    });
  });

  it('creates a pending email log and updates it to sent when SMTP succeeds', async () => {
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

    expect(nodemailerMock.createTransport).toHaveBeenCalledWith({
      host: 'mailpit',
      port: 1025,
      secure: false,
    });

    expect(sendMailMock).toHaveBeenCalledWith({
      to: 'developer@example.com',
      from: '"Insightful Phish" <noreply@insightful-phish.local>',
      subject: 'Verify your email address',
      text: expect.stringContaining(
        'Verify email: http://frontend.com/verify-email?token=rawactiontokenqwertyuiopasdfghjklzxcvbnm',
      ),
      html: expect.stringContaining(
        '<a href="http://frontend.com/verify-email?token=rawactiontokenqwertyuiopasdfghjklzxcvbnm">Verify email</a>',
      ),
    });
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('This link expires in'),
        html: expect.stringContaining('This link expires in'),
      }),
    );

    expect(emailDeliveryLogMock.update).toHaveBeenCalledWith(sentLogUpdate);

    expect(result).toEqual({
      status: 'ACCEPTED',
      acceptedByProvider: true,
      queued: true,
      deliveryLogId: 'emaillog01',
      providerMessageId: 'smtpmessage01',
    });
  });

  it('updates the mail log to failed when SMTP fails', async () => {
    sendMailMock.mockRejectedValue(new Error('SMTP not working'));
    const result = await sendEmail(baseInput);

    expect(emailDeliveryLogMock.update).toHaveBeenCalledWith({
      where: { id: 'emaillog01' },
      data: {
        deliveryStatus: 'FAILED',
        failedAt: expect.any(Date),
        failureReason: 'SMTP_NOT_ACCEPTED',
      },
    });

    expect(result).toEqual({
      status: 'NOT_ACCEPTED',
      acceptedByProvider: false,
      queued: false,
      deliveryLogId: 'emaillog01',
      failureReason: 'SMTP_NOT_ACCEPTED',
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
      data: {
        recipientEmail: 'developer@example.com',
        emailType: 'PASSWORD_RESET',
        fallbackRelatedEntityType: 'OTHER',
        fallbackRelatedEntityId: null,
        actionTokenId: null,
        userId: null,
        organisationId: null,
        organisationRegistrationRequestId: null,
        invitationId: null,
        deliveryStatus: 'PENDING',
      },
    });
  });

  it('uses a provided prisma client if one is passed', async () => {
    const transactionClient = {
      emailDeliveryLog: {
        create: vi.fn().mockResolvedValue({ id: 'emaillogfromtx' }),
        update: vi.fn().mockResolvedValue({ id: 'emaillogfromtx' }),
      },
      invitation: { update: vi.fn() },
    };

    const result = await sendEmail(baseInput, transactionClient);

    expect(transactionClient.emailDeliveryLog.create).toHaveBeenCalledTimes(1);
    expect(transactionClient.emailDeliveryLog.update).toHaveBeenCalledTimes(1);
    expect(emailDeliveryLogMock.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: 'ACCEPTED',
      acceptedByProvider: true,
      queued: true,
      deliveryLogId: 'emaillogfromtx',
      providerMessageId: 'smtpmessage01',
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

  it('returns not accepted for fallback-only email logs without a relatedEntityType', async () => {
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
      status: 'NOT_ACCEPTED',
      acceptedByProvider: false,
      queued: false,
      deliveryLogId: undefined,
      failureReason: 'TEMPLATE_RENDER_FAILED',
    });
    expect(emailDeliveryLogMock.create).not.toHaveBeenCalled();
  });

  it('returns a stable code when delivery-log creation fails', async () => {
    emailDeliveryLogMock.create.mockRejectedValueOnce(
      new Error('duplicate key value violates unique constraint email_delivery_log_pkey'),
    );

    const result = await sendEmail(baseInput);

    expect(result).toEqual({
      status: 'NOT_ACCEPTED',
      acceptedByProvider: false,
      queued: false,
      failureReason: 'DELIVERY_LOG_CREATE_FAILED',
    });
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('updates invitation status sent when an invitation email send is scucessful', async () => {
    await sendEmail({
      emailType: 'ORGANISATION_TRAINEE_INVITE',
      recipientEmail: 'johan@example.com',
      relatedEntity: {
        invitationId: 'invitation01',
        organisationId: 'organisation01',
        actionTokenId: 'actiontoken01',
      },
      templateData: {
        organisationName: 'Test Org',
        actionToken: 'rawactiontokenqwertyuiopasdfghjklzxcvbnm',
        actionTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    expect(invitationMock.update).toHaveBeenCalledWith({
      where: { id: 'invitation01' },
      data: { status: 'SENT' },
    });
  });

  it('updates invitation status to failed when an invitation send fails', async () => {
    sendMailMock.mockRejectedValue(new Error('SMTP not working'));
    await sendEmail({
      emailType: 'ORGANISATION_TRAINEE_INVITE',
      recipientEmail: 'johan@example.com',
      relatedEntity: {
        invitationId: 'invitation01',
        organisationId: 'organisation01',
        actionTokenId: 'actiontoken01',
      },
      templateData: {
        organisationName: 'Test Org',
        actionToken: 'rawactiontokenqwertyuiopasdfghjklzxcvbnm',
        actionTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    expect(invitationMock.update).toHaveBeenCalledWith({
      where: { id: 'invitation01' },
      data: { status: 'FAILED_TO_SEND' },
    });
  });

  it('does not update invitation status for noninvites', async () => {
    await sendEmail({
      emailType: 'ROLE_CHANGED_NOTIFICATION',
      recipientEmail: 'johan@example.com',
      relatedEntity: { invitationId: 'invitation01', userId: 'user01' },
      templateData: { firstName: 'Johan', roleName: 'platform admin' },
    });
    expect(invitationMock.update).not.toHaveBeenCalled();
  });

  it('returns not accepted for missing template variables before creating delivery log', async () => {
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
      status: 'NOT_ACCEPTED',
      acceptedByProvider: false,
      queued: false,
      deliveryLogId: undefined,
      failureReason: 'TEMPLATE_RENDER_FAILED',
    });
    expect(emailDeliveryLogMock.create).not.toHaveBeenCalled();
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('returns accepted persistence failed when the sent delivery log update fails', async () => {
    emailDeliveryLogMock.update.mockRejectedValueOnce(new Error('database unavailable'));

    const result = await sendEmail(baseInput);

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(emailDeliveryLogMock.update).toHaveBeenCalledWith(sentLogUpdate);
    expect(emailDeliveryLogMock.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deliveryStatus: 'FAILED' }),
      }),
    );
    expect(result).toEqual({
      status: 'ACCEPTED_PERSISTENCE_FAILED',
      acceptedByProvider: true,
      queued: true,
      deliveryLogId: 'emaillog01',
      providerMessageId: 'smtpmessage01',
      persistenceFailures: [deliveryLogSentWriteFailure],
      persistenceFailureReason: 'DELIVERY_LOG_SENT_WRITE_FAILED',
    });
  });

  it('still attempts invitation persistence when the sent delivery log update fails', async () => {
    emailDeliveryLogMock.update.mockRejectedValueOnce(new Error('database unavailable'));

    const result = await sendEmail({
      emailType: 'ORGANISATION_ADMIN_PROMOTION_INVITE',
      recipientEmail: 'admin@example.com',
      relatedEntity: {
        invitationId: 'invitation01',
        organisationId: 'organisation01',
        actionTokenId: 'actiontoken01',
      },
      templateData: {
        firstName: 'Tara',
        organisationName: 'Test Org',
        actionToken: 'rawactiontokenqwertyuiopasdfghjklzxcvbnm',
        actionTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    expect(emailDeliveryLogMock.update).toHaveBeenCalledWith(sentLogUpdate);
    expect(invitationMock.update).toHaveBeenCalledWith({
      data: { status: 'SENT' },
      where: { id: 'invitation01' },
    });
    expect(result).toEqual({
      status: 'ACCEPTED_PERSISTENCE_FAILED',
      acceptedByProvider: true,
      queued: true,
      deliveryLogId: 'emaillog01',
      providerMessageId: 'smtpmessage01',
      persistenceFailures: [deliveryLogSentWriteFailure],
      persistenceFailureReason: 'DELIVERY_LOG_SENT_WRITE_FAILED',
    });
  });

  it('keeps the sent log when invitation persistence fails after SMTP acceptance', async () => {
    invitationMock.update.mockRejectedValueOnce(new Error('invitation update failed'));

    const result = await sendEmail({
      emailType: 'ORGANISATION_TRAINEE_INVITE',
      recipientEmail: 'johan@example.com',
      relatedEntity: {
        invitationId: 'invitation01',
        organisationId: 'organisation01',
        actionTokenId: 'actiontoken01',
      },
      templateData: {
        organisationName: 'Test Org',
        actionToken: 'rawactiontokenqwertyuiopasdfghjklzxcvbnm',
        actionTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    expect(emailDeliveryLogMock.update).toHaveBeenCalledWith(sentLogUpdate);
    expect(emailDeliveryLogMock.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deliveryStatus: 'FAILED' }),
      }),
    );
    expect(result).toEqual({
      status: 'ACCEPTED_PERSISTENCE_FAILED',
      acceptedByProvider: true,
      queued: true,
      deliveryLogId: 'emaillog01',
      providerMessageId: 'smtpmessage01',
      persistenceFailures: [invitationSentWriteFailure],
      persistenceFailureReason: 'INVITATION_SENT_WRITE_FAILED',
    });
  });

  it('reports both accepted-path persistence failures with stable codes', async () => {
    emailDeliveryLogMock.update.mockRejectedValueOnce(new Error('database unavailable'));
    invitationMock.update.mockRejectedValueOnce(new Error('invitation update failed'));

    const result = await sendEmail({
      emailType: 'ORGANISATION_ADMIN_PROMOTION_INVITE',
      recipientEmail: 'admin@example.com',
      relatedEntity: {
        invitationId: 'invitation01',
        organisationId: 'organisation01',
        actionTokenId: 'actiontoken01',
      },
      templateData: {
        firstName: 'Tara',
        organisationName: 'Test Org',
        actionToken: 'rawactiontokenqwertyuiopasdfghjklzxcvbnm',
        actionTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    expect(result).toEqual({
      status: 'ACCEPTED_PERSISTENCE_FAILED',
      acceptedByProvider: true,
      queued: true,
      deliveryLogId: 'emaillog01',
      providerMessageId: 'smtpmessage01',
      persistenceFailures: [deliveryLogSentWriteFailure, invitationSentWriteFailure],
      persistenceFailureReason: 'DELIVERY_LOG_SENT_WRITE_FAILED; INVITATION_SENT_WRITE_FAILED',
    });
  });

  it('still attempts invitation failed persistence when delivery-log failed persistence throws', async () => {
    sendMailMock.mockRejectedValue(new Error('SMTP not working'));
    emailDeliveryLogMock.update.mockRejectedValueOnce(new Error('database unavailable'));

    const result = await sendEmail({
      emailType: 'ORGANISATION_TRAINEE_INVITE',
      recipientEmail: 'johan@example.com',
      relatedEntity: {
        invitationId: 'invitation01',
        organisationId: 'organisation01',
        actionTokenId: 'actiontoken01',
      },
      templateData: {
        organisationName: 'Test Org',
        actionToken: 'rawactiontokenqwertyuiopasdfghjklzxcvbnm',
        actionTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    expect(emailDeliveryLogMock.update).toHaveBeenCalledWith({
      where: { id: 'emaillog01' },
      data: {
        deliveryStatus: 'FAILED',
        failedAt: expect.any(Date),
        failureReason: 'SMTP_NOT_ACCEPTED',
      },
    });
    expect(invitationMock.update).toHaveBeenCalledWith({
      where: { id: 'invitation01' },
      data: { status: 'FAILED_TO_SEND' },
    });
    expect(result).toEqual({
      status: 'NOT_ACCEPTED',
      acceptedByProvider: false,
      queued: false,
      deliveryLogId: 'emaillog01',
      failureReason: 'SMTP_NOT_ACCEPTED',
      persistenceFailures: [deliveryLogFailedWriteFailure],
    });
  });
}); //describe

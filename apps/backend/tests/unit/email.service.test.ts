import { beforeEach, describe, expect, it, vi } from 'vitest';

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

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: {
    emailDeliveryLog: emailDeliveryLogMock,
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

    sendMailMock.mockResolvedValue({
      messageId: 'smtpmessage01',
    });
  });

  it('creates a pending email log and updates it to sent when SMTP succeeds', async () => {
    const { sendEmail } = await import('../../src/services/email.service.js');

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

    expect(emailDeliveryLogMock.update).toHaveBeenCalledWith({
      where: { id: 'emaillog01' },
      data: {
        deliveryStatus: 'SENT',
        providerMessageId: 'smtpmessage01',
        sentAt: expect.any(Date),
      },
    });

    expect(result).toEqual({
      ok: true,
      messageId: 'smtpmessage01',
      deliveryLogId: 'emaillog01',
    });
  });

  it('updates the mail log to failed when SMTP fails', async () => {
    const { sendEmail } = await import('../../src/services/email.service.js');
    sendMailMock.mockRejectedValue(new Error('SMTP not working'));
    const result = await sendEmail(baseInput);

    expect(emailDeliveryLogMock.update).toHaveBeenCalledWith({
      where: { id: 'emaillog01' },
      data: {
        deliveryStatus: 'FAILED',
        failedAt: expect.any(Date),
        failureReason: 'SMTP not working',
      },
    });

    expect(result).toEqual({
      ok: false,
      error: 'SMTP not working',
      deliveryLogId: 'emaillog01',
    });
  });

  it('uses nullable defaults for optional relation fields', async () => {
    const { sendEmail } = await import('../../src/services/email.service.js');

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
    const { sendEmail } = await import('../../src/services/email.service.js');

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
      ok: true,
      messageId: 'smtpmessage01',
      deliveryLogId: 'emaillogfromtx',
    });
  });

  it('does not write fallback relation fields when a typed relation is provided', async () => {
    const { sendEmail } = await import('../../src/services/email.service.js');

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

  it('rejects fallback only email logs if there is no relatedEntityType', async () => {
    const { sendEmail } = await import('../../src/services/email.service.js');

    await expect(
      sendEmail({
        emailType: 'PASSWORD_RESET',
        recipientEmail: 'developer@example.com',
        relatedEntity: {},
        templateData: {
          firstName: 'Developer',
          actionToken: 'rawactiontokenqwertyuiopasdfghjklzxcvbnm',
          actionTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      }),
    ).rejects.toThrow('Emails without a typed relation must provide a fallbackType');

    expect(emailDeliveryLogMock.create).not.toHaveBeenCalled();
  });
});

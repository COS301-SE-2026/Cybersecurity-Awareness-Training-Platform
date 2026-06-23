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

const baseInput = {
  to: 'developer@example.com',
  subject: 'Testing Email 123!',
  text: 'Cool plain text body',
  html: '<p> AAA HTML Body</p>',
  emailType: 'EMAIL_VERIFICATION' as const,
  relatedEntityType: 'ACTIONTOKEN' as const,
  relatedEntityId: 'actiontoken01',
  actionTokenId: 'actiontoken01',
  userId: 'user01',
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

  it('creates a pending email log and updates it to sent when SMPT succeeds', async () => {
    const { sendEmail } = await import('../../src/services/email.service.js');

    const result = await sendEmail(baseInput);

    expect(emailDeliveryLogMock.create).toHaveBeenCalledWith({
      data: {
        recipientEmail: 'developer@example.com',
        emailType: 'EMAIL_VERIFICATION',
        relatedEntityType: 'ACTIONTOKEN',
        relatedEntityId: 'actiontoken01',
        userId: 'user01',
        actionTokenId: 'actiontoken01',
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
      subject: 'Testing Email 123!',
      text: 'Cool plain text body',
      html: '<p> AAA HTML Body</p>',
    });

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

  it('updates the mail log to failed when SMPT fails', async () => {
    const { sendEmail } = await import('../../src/services/email.service.js');
    sendMailMock.mockRejectedValue(new Error('SMTP not working'));
    const result = await sendEmail(baseInput);

    expect(emailDeliveryLogMock.update).toHaveBeenCalledWith({
      where: { id: 'emaillog01' },
      data: {
        deliveryStatus: 'FAILED',
        failedAt: expect.any(Date),
        failureReason: 'SMTP nor working',
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
      to: 'developer@example.com',
      subject: 'Testing Email 123!',
      text: 'Cool plain text body',
      emailType: 'PASSWORD_RESET',
      relatedEntityType: 'OTHER',
    });

    expect(emailDeliveryLogMock.create).toHaveBeenCalledWith({
      data: {
        recipientEmail: 'developer@example.com',
        emailType: 'PASSWORD_RESET',
        relatedEntityType: 'OTHER',
        relatedEntityId: null,
        actionTokenId: null,
        userId: null,
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
});

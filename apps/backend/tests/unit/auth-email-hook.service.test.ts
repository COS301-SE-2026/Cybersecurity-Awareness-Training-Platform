import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestAuthEmailSend } from '../../src/services/auth-email-hook.service.js';

const sendEmailMock = vi.hoisted(() => vi.fn());

vi.mock('../../src/services/email.service.js', () => ({
  sendEmail: sendEmailMock,
}));

describe('requestAuthEmailSend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps unsupported auth email types on the existing non-implemented path', async () => {
    const result = await requestAuthEmailSend({
      emailType: 'PASSWORD_RESET',
      recipientEmail: 'learner@example.test',
      userId: 'user-1',
      actionTokenId: 'action-token-1',
    });

    expect(result).toEqual({
      queued: false,
      reason: 'EMAIL_SERVICE_NOT_IMPLEMENTED',
    });
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('sends organisation request received email through the central email service', async () => {
    sendEmailMock.mockResolvedValue({
      ok: true,
      deliveryLogId: 'email-log-1',
      messageId: 'message-1',
    });

    const result = await requestAuthEmailSend({
      emailType: 'ORGANISATION_REQUEST_RECEIVED',
      recipientEmail: 'representative@example.test',
      organisationRegistrationRequestId: 'request-1',
      templateData: {
        organisationName: 'Example Consulting',
      },
    });

    expect(sendEmailMock).toHaveBeenCalledWith({
      to: 'representative@example.test',
      subject: 'We received your organisation registration request',
      text: [
        'We received the registration request for Example Consulting.',
        'The Insightful Phish team will review it before any organisation or account is created.',
      ].join('\n\n'),
      html: [
        '<p>We received the registration request for Example Consulting.</p>',
        '<p>The Insightful Phish team will review it before any organisation or account is created.</p>',
      ].join(''),
      emailType: 'ORGANISATION_REQUEST_RECEIVED',
      organisationRegistrationRequestId: 'request-1',
    });
    expect(result).toEqual({
      queued: true,
      deliveryLogId: 'email-log-1',
    });
  });

  it('escapes organisation names in HTML email content', async () => {
    sendEmailMock.mockResolvedValue({
      ok: true,
      deliveryLogId: 'email-log-1',
    });

    await requestAuthEmailSend({
      emailType: 'ORGANISATION_REQUEST_RECEIVED',
      recipientEmail: 'representative@example.test',
      organisationRegistrationRequestId: 'request-1',
      templateData: {
        organisationName: '<Example & Sons>',
      },
    });

    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('&lt;Example &amp; Sons&gt;'),
      }),
    );
  });

  it('maps central email service send failures to a safe hook result', async () => {
    sendEmailMock.mockResolvedValue({
      ok: false,
      error: 'SMTP unavailable',
      deliveryLogId: 'email-log-1',
    });

    const result = await requestAuthEmailSend({
      emailType: 'ORGANISATION_REQUEST_RECEIVED',
      recipientEmail: 'representative@example.test',
      organisationRegistrationRequestId: 'request-1',
    });

    expect(result).toEqual({
      queued: false,
      reason: 'EMAIL_SEND_FAILED',
      deliveryLogId: 'email-log-1',
    });
  });

  it('keeps hook failures non-throwing', async () => {
    sendEmailMock.mockRejectedValue(new Error('email service unavailable'));

    await expect(
      requestAuthEmailSend({
        emailType: 'ORGANISATION_REQUEST_RECEIVED',
        recipientEmail: 'representative@example.test',
        organisationRegistrationRequestId: 'request-1',
      }),
    ).resolves.toEqual({
      queued: false,
      reason: 'EMAIL_SEND_FAILED',
    });
  });
});

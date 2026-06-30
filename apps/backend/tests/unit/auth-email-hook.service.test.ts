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

  it('maps missing template data failures to a safe result hook', async () => {
    const result = await requestAuthEmailSend({
      emailType: 'EMAIL_VERIFICATION',
      recipientEmail: 'learner@example.test',
      userId: 'user-1',
      actionTokenId: 'action-token-1',
    });

    expect(result).toEqual({
      queued: false,
      reason: 'EMAIL_SEND_FAILED',
    });
    expect(sendEmailMock).toHaveBeenCalledWith({
      emailType: 'EMAIL_VERIFICATION',
      recipientEmail: 'learner@example.test',
      relatedEntity: {
        userId: 'user-1',
        actionTokenId: 'action-token-1',
        organisationId: null,
        invitationId: null,
        organisationRegistrationRequestId: null,
        fallbackType: undefined,
        fallbackId: null,
      },
      templateData: undefined,
    });
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
      emailType: 'ORGANISATION_REQUEST_RECEIVED',
      recipientEmail: 'representative@example.test',
      relatedEntity: {
        userId: null,
        actionTokenId: null,
        organisationId: null,
        invitationId: null,
        organisationRegistrationRequestId: 'request-1',
        fallbackType: undefined,
        fallbackId: null,
      },
      templateData: {
        organisationName: 'Example Consulting',
      },
    });
    expect(result).toEqual({
      queued: true,
      deliveryLogId: 'email-log-1',
    });
  });

  it('passes template data throurh to the central email service', async () => {
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
        templateData: {
          organisationName: '<Example & Sons>',
        },
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

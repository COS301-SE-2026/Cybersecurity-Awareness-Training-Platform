import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestAuthEmailSend } from '../../src/services/auth-email-hook.service.js';
import type { AuthEmailHookResult } from '../../src/services/auth-email-hook.service.js';

const sendEmailMock = vi.hoisted(() => vi.fn());

vi.mock('../../src/services/email.service.js', () => ({
  sendEmail: sendEmailMock,
}));

const acceptedEmailResult = {
  status: 'ACCEPTED',
  acceptedByProvider: true,
  queued: true,
  deliveryLogId: 'email-log-1',
  providerMessageId: 'message-1',
} satisfies AuthEmailHookResult;

const notAcceptedEmailResult = {
  status: 'NOT_ACCEPTED',
  acceptedByProvider: false,
  queued: false,
  failureReason: 'SMTP_NOT_ACCEPTED',
  deliveryLogId: 'email-log-1',
};

const acceptedEmailResultWithoutProviderMessageId = {
  status: 'ACCEPTED',
  acceptedByProvider: true,
  queued: true,
  deliveryLogId: 'email-log-1',
  // @ts-expect-error accepted outcomes must include provider evidence from SMTP.
} satisfies AuthEmailHookResult;

const acceptedPersistenceFailedResultWithoutFailures = {
  status: 'ACCEPTED_PERSISTENCE_FAILED',
  acceptedByProvider: true,
  queued: true,
  deliveryLogId: 'email-log-1',
  providerMessageId: 'message-1',
  reason: 'EMAIL_PERSISTENCE_FAILED',
  // @ts-expect-error accepted persistence failures must include at least one failed stage.
  persistenceFailures: [],
  persistenceFailureReason: '',
} satisfies AuthEmailHookResult;

void acceptedEmailResultWithoutProviderMessageId;
void acceptedPersistenceFailedResultWithoutFailures;

describe('requestAuthEmailSend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps missing template data failures to a safe result hook', async () => {
    sendEmailMock.mockResolvedValue({
      ...notAcceptedEmailResult,
      deliveryLogId: undefined,
    });

    const result = await requestAuthEmailSend({
      emailType: 'EMAIL_VERIFICATION',
      recipientEmail: 'learner@example.test',
      userId: 'user-1',
      actionTokenId: 'action-token-1',
    });

    expect(result).toEqual({
      status: 'NOT_ACCEPTED',
      acceptedByProvider: false,
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
    sendEmailMock.mockResolvedValue(acceptedEmailResult);

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
      status: 'ACCEPTED',
      acceptedByProvider: true,
      queued: true,
      deliveryLogId: 'email-log-1',
      providerMessageId: 'message-1',
    });
  });

  it('passes template data throurh to the central email service', async () => {
    sendEmailMock.mockResolvedValue(acceptedEmailResult);

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
    sendEmailMock.mockResolvedValue(notAcceptedEmailResult);

    const result = await requestAuthEmailSend({
      emailType: 'ORGANISATION_REQUEST_RECEIVED',
      recipientEmail: 'representative@example.test',
      organisationRegistrationRequestId: 'request-1',
    });

    expect(result).toEqual({
      status: 'NOT_ACCEPTED',
      acceptedByProvider: false,
      queued: false,
      reason: 'EMAIL_SEND_FAILED',
      deliveryLogId: 'email-log-1',
    });
  });

  it('preserves accepted persistence failures as queued results', async () => {
    sendEmailMock.mockResolvedValue({
      status: 'ACCEPTED_PERSISTENCE_FAILED',
      acceptedByProvider: true,
      queued: true,
      deliveryLogId: 'email-log-1',
      providerMessageId: 'message-1',
      persistenceFailures: [
        {
          stage: 'DELIVERY_LOG_SENT',
          code: 'DELIVERY_LOG_SENT_WRITE_FAILED',
        },
      ],
      persistenceFailureReason: 'DELIVERY_LOG_SENT_WRITE_FAILED',
    });

    const result = await requestAuthEmailSend({
      emailType: 'ORGANISATION_REQUEST_RECEIVED',
      recipientEmail: 'representative@example.test',
      organisationRegistrationRequestId: 'request-1',
    });

    expect(result).toEqual({
      status: 'ACCEPTED_PERSISTENCE_FAILED',
      acceptedByProvider: true,
      queued: true,
      deliveryLogId: 'email-log-1',
      providerMessageId: 'message-1',
      reason: 'EMAIL_PERSISTENCE_FAILED',
      persistenceFailures: [
        {
          stage: 'DELIVERY_LOG_SENT',
          code: 'DELIVERY_LOG_SENT_WRITE_FAILED',
        },
      ],
      persistenceFailureReason: 'DELIVERY_LOG_SENT_WRITE_FAILED',
    });
  });

  it('does not convert unexpected email service exceptions into NOT_ACCEPTED', async () => {
    sendEmailMock.mockRejectedValueOnce(new Error('email service unavailable'));

    await expect(
      requestAuthEmailSend({
        emailType: 'ORGANISATION_REQUEST_RECEIVED',
        recipientEmail: 'representative@example.test',
        organisationRegistrationRequestId: 'request-1',
      }),
    ).rejects.toThrow('email service unavailable');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestAuthEmailSend } from '../../src/services/auth-email-hook.service.js';
import type { AuthEmailHookResult } from '../../src/services/auth-email-hook.service.js';

const sendEmailMock = vi.hoisted(() => vi.fn());

vi.mock('../../src/services/email.service.js', () => ({
  sendEmail: sendEmailMock,
}));

const queuedEmailResult = {
  status: 'QUEUED',
  queueAccepted: true,
  queued: true,
  deliveryLogId: 'email-log-1',
  jobId: 'email-job-1',
} satisfies AuthEmailHookResult;

const notQueuedEmailResult = {
  status: 'NOT_QUEUED',
  queueAccepted: false,
  queued: false,
  failureReason: 'DELIVERY_QUEUE_CREATE_FAILED',
  deliveryLogId: 'email-log-1',
};

describe('requestAuthEmailSend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps queue failures to a safe result hook', async () => {
    sendEmailMock.mockResolvedValue({
      ...notQueuedEmailResult,
      deliveryLogId: undefined,
    });

    const result = await requestAuthEmailSend({
      emailType: 'EMAIL_VERIFICATION',
      recipientEmail: 'learner@example.test',
      userId: 'user-1',
      actionTokenId: 'action-token-1',
    });

    expect(result).toEqual({
      status: 'NOT_QUEUED',
      queueAccepted: false,
      queued: false,
      reason: 'EMAIL_QUEUE_FAILED',
    });
    expect(sendEmailMock).toHaveBeenCalledWith(
      {
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
      },
      undefined,
    );
  });

  it('queues organisation request received email through the central email service', async () => {
    sendEmailMock.mockResolvedValue(queuedEmailResult);

    const result = await requestAuthEmailSend({
      emailType: 'ORGANISATION_REQUEST_RECEIVED',
      recipientEmail: 'representative@example.test',
      organisationRegistrationRequestId: 'request-1',
      templateData: {
        organisationName: 'Example Consulting',
      },
    });

    expect(sendEmailMock).toHaveBeenCalledWith(
      {
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
      },
      undefined,
    );
    expect(result).toEqual(queuedEmailResult);
  });

  it('passes template data through to the central email service', async () => {
    sendEmailMock.mockResolvedValue(queuedEmailResult);

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
      undefined,
    );
  });

  it('maps central email service queue failures to a safe hook result', async () => {
    sendEmailMock.mockResolvedValue(notQueuedEmailResult);

    const result = await requestAuthEmailSend({
      emailType: 'ORGANISATION_REQUEST_RECEIVED',
      recipientEmail: 'representative@example.test',
      organisationRegistrationRequestId: 'request-1',
    });

    expect(result).toEqual({
      status: 'NOT_QUEUED',
      queueAccepted: false,
      queued: false,
      reason: 'EMAIL_QUEUE_FAILED',
      deliveryLogId: 'email-log-1',
    });
  });

  it('does not convert unexpected email service exceptions into NOT_QUEUED', async () => {
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

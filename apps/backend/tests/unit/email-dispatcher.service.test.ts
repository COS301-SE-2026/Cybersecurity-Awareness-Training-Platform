import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const MockSmtpDeliveryError = vi.hoisted(
  () =>
    class MockSmtpDeliveryError extends Error {
      constructor(
        message: string,
        readonly failureKind: 'RETRYABLE' | 'NON_RETRYABLE' | 'AMBIGUOUS',
        readonly reasonCode: string,
      ) {
        super(message);
        this.name = 'SmtpDeliveryError';
      }
    },
);

const repositoryMock = vi.hoisted(() => ({
  claimDueEmailDeliveryJobs: vi.fn(),
  recoverExpiredEmailDeliveryLeases: vi.fn(),
  recordEmailDeliveryAccepted: vi.fn(),
  recordEmailDeliveryTerminalFailure: vi.fn(),
  scheduleEmailDeliveryRetry: vi.fn(),
}));

const smtpMock = vi.hoisted(() => ({
  sendViaSMTP: vi.fn(),
}));

vi.mock('../../src/config/env.js', () => ({
  env: {
    EMAIL_DISPATCHER_ENABLED: true,
    EMAIL_DISPATCHER_POLL_INTERVAL_MS: 60_000,
    EMAIL_DISPATCHER_BATCH_SIZE: 5,
    EMAIL_DISPATCHER_LEASE_SECONDS: 30,
    EMAIL_DISPATCHER_RETRY_DEADLINE_SECONDS: 120,
    EMAIL_DISPATCHER_BACKOFF_SECONDS: [15, 30, 60],
  },
}));

vi.mock('../../src/repositories/email-delivery.repository.js', () => repositoryMock);

vi.mock('../../src/services/smtp-mailer.js', () => ({
  sendViaSMTP: smtpMock.sendViaSMTP,
  SmtpDeliveryError: MockSmtpDeliveryError,
}));

const { startEmailDispatcher } = await import('../../src/services/email-dispatcher.service.js');

const dispatchJob = {
  id: 'email-job-1',
  deliveryLogId: 'email-log-1',
  status: 'PROCESSING' as const,
  providerKind: 'SMTP' as const,
  recipientEmail: 'recipient@example.test',
  subject: 'Safe subject',
  textBody: 'Open https://frontend.example/verify?token=raw-token-value',
  htmlBody: '<a href="https://frontend.example/verify?token=raw-token-value">Open</a>',
  emailType: 'EMAIL_VERIFICATION' as const,
  invitationStateVersion: null,
  attemptCount: 1,
  maxAttempts: 4,
  firstAttemptAt: new Date('2026-08-09T10:00:00.000Z'),
  retryDeadlineAt: new Date('2026-08-09T10:02:00.000Z'),
  deliveryLog: {
    id: 'email-log-1',
    userId: 'user-1',
    actionTokenId: 'token-1',
    organisationId: null,
    organisationRegistrationRequestId: null,
    invitationId: null,
    fallbackRelatedEntityType: null,
    fallbackRelatedEntityId: null,
  },
};

async function runSingleDispatcherCycle() {
  const dispatcher = startEmailDispatcher();
  await vi.waitFor(() => {
    expect(repositoryMock.claimDueEmailDeliveryJobs).toHaveBeenCalled();
  });
  dispatcher.stop();
}

describe('email dispatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-09T10:00:05.000Z'));
    vi.clearAllMocks();
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    repositoryMock.claimDueEmailDeliveryJobs.mockResolvedValue([dispatchJob]);
    repositoryMock.recoverExpiredEmailDeliveryLeases.mockResolvedValue(undefined);
    repositoryMock.recordEmailDeliveryAccepted.mockResolvedValue(undefined);
    repositoryMock.recordEmailDeliveryTerminalFailure.mockResolvedValue(undefined);
    repositoryMock.scheduleEmailDeliveryRetry.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('recovers expired leases, claims due jobs, and records provider acceptance safely', async () => {
    smtpMock.sendViaSMTP.mockResolvedValue({
      acceptedByProvider: true,
      providerMessageId: 'provider-message-1',
    });

    await runSingleDispatcherCycle();

    expect(repositoryMock.recoverExpiredEmailDeliveryLeases).toHaveBeenCalledTimes(1);
    expect(repositoryMock.claimDueEmailDeliveryJobs).toHaveBeenCalledWith(
      expect.objectContaining({
        batchSize: 5,
        leaseSeconds: 30,
        retryDeadlineSeconds: 120,
      }),
    );
    expect(smtpMock.sendViaSMTP).toHaveBeenCalledWith({
      to: 'recipient@example.test',
      subject: 'Safe subject',
      text: 'Open https://frontend.example/verify?token=raw-token-value',
      html: '<a href="https://frontend.example/verify?token=raw-token-value">Open</a>',
    });
    expect(repositoryMock.recordEmailDeliveryAccepted).toHaveBeenCalledWith({
      jobId: 'email-job-1',
      deliveryLogId: 'email-log-1',
      providerMessageId: 'provider-message-1',
    });
    expect(repositoryMock.scheduleEmailDeliveryRetry).not.toHaveBeenCalled();
    expect(repositoryMock.recordEmailDeliveryTerminalFailure).not.toHaveBeenCalled();

    const logText = JSON.stringify(vi.mocked(console.info).mock.calls);
    expect(logText).not.toContain('recipient@example.test');
    expect(logText).not.toContain('raw-token-value');
    expect(logText).not.toContain('https://frontend.example/verify');
  });

  it.each([
    { attemptCount: 1, expectedDelayMs: 15_000 },
    { attemptCount: 2, expectedDelayMs: 30_000 },
    { attemptCount: 3, expectedDelayMs: 60_000 },
  ])('schedules bounded retry for retryable attempt $attemptCount', async (scenario) => {
    repositoryMock.claimDueEmailDeliveryJobs.mockResolvedValue([
      {
        ...dispatchJob,
        attemptCount: scenario.attemptCount,
      },
    ]);
    smtpMock.sendViaSMTP.mockRejectedValue(
      new MockSmtpDeliveryError('SMTP temporary failure', 'RETRYABLE', 'SMTP_TEMPORARY_FAILURE'),
    );

    await runSingleDispatcherCycle();

    const retryInput = repositoryMock.scheduleEmailDeliveryRetry.mock.calls[0]?.[0];
    expect(retryInput).toEqual(
      expect.objectContaining({
        jobId: 'email-job-1',
        providerOutcome: 'PROVIDER_TEMPORARY_FAILURE',
        reasonCode: 'SMTP_TEMPORARY_FAILURE',
      }),
    );
    const retryDelayMs =
      retryInput.nextAttemptAt.getTime() - new Date('2026-08-09T10:00:05.000Z').getTime();
    expect(retryDelayMs).toBeGreaterThanOrEqual(scenario.expectedDelayMs);
    expect(retryDelayMs).toBeLessThan(scenario.expectedDelayMs + 1_000);
    expect(repositoryMock.recordEmailDeliveryTerminalFailure).not.toHaveBeenCalled();
  });

  it('records terminal failure when retryable failure reaches max attempts', async () => {
    repositoryMock.claimDueEmailDeliveryJobs.mockResolvedValue([
      {
        ...dispatchJob,
        attemptCount: 4,
        maxAttempts: 4,
      },
    ]);
    smtpMock.sendViaSMTP.mockRejectedValue(
      new MockSmtpDeliveryError('SMTP temporary failure', 'RETRYABLE', 'SMTP_TEMPORARY_FAILURE'),
    );

    await runSingleDispatcherCycle();

    expect(repositoryMock.scheduleEmailDeliveryRetry).not.toHaveBeenCalled();
    expect(repositoryMock.recordEmailDeliveryTerminalFailure).toHaveBeenCalledWith({
      jobId: 'email-job-1',
      deliveryLogId: 'email-log-1',
      providerOutcome: 'PROVIDER_TEMPORARY_FAILURE',
      reasonCode: 'SMTP_TEMPORARY_FAILURE',
    });
  });

  it('records terminal failure when retry would exceed the retry deadline', async () => {
    repositoryMock.claimDueEmailDeliveryJobs.mockResolvedValue([
      {
        ...dispatchJob,
        retryDeadlineAt: new Date('2026-08-09T10:00:10.000Z'),
      },
    ]);
    smtpMock.sendViaSMTP.mockRejectedValue(
      new MockSmtpDeliveryError('SMTP temporary failure', 'RETRYABLE', 'SMTP_TEMPORARY_FAILURE'),
    );

    await runSingleDispatcherCycle();

    expect(repositoryMock.scheduleEmailDeliveryRetry).not.toHaveBeenCalled();
    expect(repositoryMock.recordEmailDeliveryTerminalFailure).toHaveBeenCalledWith({
      jobId: 'email-job-1',
      deliveryLogId: 'email-log-1',
      providerOutcome: 'PROVIDER_TEMPORARY_FAILURE',
      reasonCode: 'SMTP_TEMPORARY_FAILURE',
    });
  });

  it('does not retry ambiguous provider outcomes', async () => {
    smtpMock.sendViaSMTP.mockRejectedValue(
      new MockSmtpDeliveryError(
        'SMTP ambiguous failure',
        'AMBIGUOUS',
        'SMTP_AMBIGUOUS_TRANSPORT_FAILURE',
      ),
    );

    await runSingleDispatcherCycle();

    expect(repositoryMock.scheduleEmailDeliveryRetry).not.toHaveBeenCalled();
    expect(repositoryMock.recordEmailDeliveryTerminalFailure).toHaveBeenCalledWith({
      jobId: 'email-job-1',
      deliveryLogId: 'email-log-1',
      providerOutcome: 'PROVIDER_AMBIGUOUS',
      reasonCode: 'SMTP_AMBIGUOUS_TRANSPORT_FAILURE',
    });
  });

  it('does not retry definite non-retryable provider failures', async () => {
    smtpMock.sendViaSMTP.mockRejectedValue(
      new MockSmtpDeliveryError('SMTP permanent failure', 'NON_RETRYABLE', 'SMTP_AUTH_FAILED'),
    );

    await runSingleDispatcherCycle();

    expect(repositoryMock.scheduleEmailDeliveryRetry).not.toHaveBeenCalled();
    expect(repositoryMock.recordEmailDeliveryTerminalFailure).toHaveBeenCalledWith({
      jobId: 'email-job-1',
      deliveryLogId: 'email-log-1',
      providerOutcome: 'PROVIDER_REJECTED',
      reasonCode: 'SMTP_AUTH_FAILED',
    });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  claimDueEmailDeliveryJobs,
  markEmailDeliveryProviderPersistenceFailed,
  recoverExpiredEmailDeliveryLeases,
  recordEmailDeliveryAccepted,
  recordEmailDeliveryTerminalFailure,
  scheduleEmailDeliveryRetry,
  verifyEmailDeliveryClaimOwnership,
} from '../../../src/repositories/email-delivery.repository.js';

const txMock = vi.hoisted(() => ({
  actionToken: {
    findUnique: vi.fn(),
  },
  emailDeliveryJob: {
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  emailDeliveryLog: {
    update: vi.fn(),
  },
  invitation: {
    updateMany: vi.fn(),
  },
}));

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn((callback: (tx: typeof txMock) => unknown) => callback(txMock)),
  emailDeliveryJob: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  emailDeliveryLog: {
    update: vi.fn(),
  },
}));

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

const terminalJob = {
  emailType: 'ORGANISATION_TRAINEE_INVITE',
  invitationStateVersion: new Date('2026-08-01T10:00:00.000Z'),
  deliveryLog: {
    fallbackRelatedEntityType: null,
    fallbackRelatedEntityId: null,
    userId: null,
    actionTokenId: 'action-token-1',
    organisationId: 'organisation-1',
    organisationRegistrationRequestId: null,
    invitationId: 'invitation-1',
  },
};

describe('email-delivery.repository terminal transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    txMock.emailDeliveryJob.findUnique.mockResolvedValue(terminalJob);
    txMock.actionToken.findUnique.mockResolvedValue({
      id: 'action-token-1',
      revokedAt: null,
      usedAt: null,
    });
    txMock.invitation.updateMany.mockResolvedValue({ count: 1 });
    txMock.emailDeliveryJob.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.emailDeliveryJob.updateMany.mockResolvedValue({ count: 1 });
  });

  it('marks the related invitation sent when the dispatcher records provider acceptance', async () => {
    await recordEmailDeliveryAccepted({
      jobId: 'email-job-1',
      deliveryLogId: 'email-log-1',
      providerMessageId: 'provider-message-1',
      leaseOwner: 'dispatcher-1',
      now: new Date('2026-08-09T10:00:00.000Z'),
    });

    expect(txMock.emailDeliveryLog.update).toHaveBeenCalledWith({
      where: { id: 'email-log-1' },
      data: {
        deliveryStatus: 'SENT',
        providerMessageId: 'provider-message-1',
        sentAt: expect.any(Date),
      },
    });
    expect(txMock.emailDeliveryJob.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'email-job-1',
        status: 'PROCESSING',
        leaseOwner: 'dispatcher-1',
        leaseExpiresAt: { gt: new Date('2026-08-09T10:00:00.000Z') },
        terminalAt: null,
      },
      data: expect.objectContaining({
        status: 'SUCCEEDED',
        terminalAt: expect.any(Date),
        lastProviderOutcome: 'PROVIDER_ACCEPTED',
      }),
    });
    expect(txMock.invitation.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'invitation-1',
        status: { in: ['PENDING', 'SENT', 'FAILED_TO_SEND'] },
        updatedAt: new Date('2026-08-01T10:00:00.000Z'),
      },
      data: { status: 'SENT' },
    });
  });

  it('marks the related invitation failed when the dispatcher records terminal failure with definite rejection', async () => {
    await recordEmailDeliveryTerminalFailure({
      jobId: 'email-job-1',
      deliveryLogId: 'email-log-1',
      providerOutcome: 'PROVIDER_REJECTED',
      reasonCode: 'SMTP_PERMANENT_FAILURE',
      leaseOwner: 'dispatcher-1',
      now: new Date('2026-08-09T10:00:00.000Z'),
    });

    expect(txMock.emailDeliveryLog.update).toHaveBeenCalledWith({
      where: { id: 'email-log-1' },
      data: {
        deliveryStatus: 'FAILED',
        failedAt: expect.any(Date),
        failureReason: 'SMTP_PERMANENT_FAILURE',
      },
    });
    expect(txMock.emailDeliveryJob.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'email-job-1',
        status: 'PROCESSING',
        leaseOwner: 'dispatcher-1',
        leaseExpiresAt: { gt: new Date('2026-08-09T10:00:00.000Z') },
        terminalAt: null,
      },
      data: expect.objectContaining({
        status: 'FAILED',
        terminalAt: expect.any(Date),
        lastProviderOutcome: 'PROVIDER_REJECTED',
        lastReasonCode: 'SMTP_PERMANENT_FAILURE',
      }),
    });
    expect(txMock.invitation.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'invitation-1',
        status: { in: ['PENDING', 'SENT', 'FAILED_TO_SEND'] },
        updatedAt: new Date('2026-08-01T10:00:00.000Z'),
      },
      data: { status: 'FAILED_TO_SEND' },
    });
  });

  it('leaves the related invitation unchanged when terminal failure outcome is ambiguous', async () => {
    await recordEmailDeliveryTerminalFailure({
      jobId: 'email-job-1',
      deliveryLogId: 'email-log-1',
      providerOutcome: 'PROVIDER_AMBIGUOUS',
      reasonCode: 'SMTP_TIMEOUT_AMBIGUOUS',
      leaseOwner: 'dispatcher-1',
      now: new Date('2026-08-09T10:00:00.000Z'),
    });

    expect(txMock.emailDeliveryLog.update).toHaveBeenCalledWith({
      where: { id: 'email-log-1' },
      data: {
        deliveryStatus: 'FAILED',
        failedAt: expect.any(Date),
        failureReason: 'SMTP_TIMEOUT_AMBIGUOUS',
      },
    });
    expect(txMock.emailDeliveryJob.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'email-job-1',
        status: 'PROCESSING',
        leaseOwner: 'dispatcher-1',
        leaseExpiresAt: { gt: new Date('2026-08-09T10:00:00.000Z') },
        terminalAt: null,
      },
      data: expect.objectContaining({
        status: 'FAILED',
        terminalAt: expect.any(Date),
        lastProviderOutcome: 'PROVIDER_AMBIGUOUS',
        lastReasonCode: 'SMTP_TIMEOUT_AMBIGUOUS',
      }),
    });
    expect(txMock.invitation.updateMany).not.toHaveBeenCalled();
  });

  it('does not alter the related invitation when the associated token was already revoked', async () => {
    txMock.actionToken.findUnique.mockResolvedValueOnce({
      id: 'action-token-1',
      revokedAt: new Date('2026-08-05T10:00:00.000Z'),
      usedAt: null,
    });

    await recordEmailDeliveryTerminalFailure({
      jobId: 'email-job-1',
      deliveryLogId: 'email-log-1',
      providerOutcome: 'PROVIDER_REJECTED',
      reasonCode: 'SMTP_PERMANENT_FAILURE',
      leaseOwner: 'dispatcher-1',
      now: new Date('2026-08-09T10:00:00.000Z'),
    });

    expect(txMock.invitation.updateMany).not.toHaveBeenCalled();
  });
});

describe('email-delivery.repository queue claiming', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.emailDeliveryJob.findMany.mockResolvedValue([]);
  });

  it('marks expired processing leases terminal ambiguous instead of retrying without marking invitation failed', async () => {
    const now = new Date('2026-08-09T10:00:00.000Z');
    prismaMock.emailDeliveryJob.findMany.mockResolvedValue([
      {
        id: 'email-job-1',
        deliveryLogId: 'email-log-1',
        emailType: 'ORGANISATION_TRAINEE_INVITE',
        invitationStateVersion: new Date('2026-08-01T10:00:00.000Z'),
        deliveryLog: {
          fallbackRelatedEntityType: null,
          fallbackRelatedEntityId: null,
          userId: null,
          actionTokenId: 'action-token-1',
          organisationId: 'organisation-1',
          organisationRegistrationRequestId: null,
          invitationId: 'invitation-1',
        },
      },
    ]);
    txMock.emailDeliveryJob.updateMany.mockResolvedValue({ count: 1 });

    await recoverExpiredEmailDeliveryLeases({ now });

    expect(prismaMock.emailDeliveryJob.findMany).toHaveBeenCalledWith({
      where: {
        status: 'PROCESSING',
        leaseExpiresAt: { lt: now },
        terminalAt: null,
      },
      select: expect.any(Object),
    });
    expect(txMock.emailDeliveryJob.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'email-job-1',
        status: 'PROCESSING',
        leaseExpiresAt: { lt: now },
        terminalAt: null,
      },
      data: expect.objectContaining({
        status: 'FAILED',
        terminalAt: now,
        lastProviderOutcome: 'PROVIDER_AMBIGUOUS',
        lastReasonCode: 'EMAIL_PROCESSING_LEASE_EXPIRED',
      }),
    });
    expect(txMock.emailDeliveryLog.update).toHaveBeenCalledWith({
      where: { id: 'email-log-1' },
      data: {
        deliveryStatus: 'FAILED',
        failedAt: now,
        failureReason: 'EMAIL_PROCESSING_LEASE_EXPIRED',
      },
    });
    expect(txMock.invitation.updateMany).not.toHaveBeenCalled();
  });

  it('atomically claims due jobs with lease and retry deadline fields', async () => {
    const now = new Date('2026-08-09T10:00:00.000Z');
    const candidate = {
      id: 'email-job-1',
      deliveryLogId: 'email-log-1',
      status: 'PENDING',
      providerKind: 'SMTP',
      recipientEmail: 'recipient@example.test',
      subject: 'Subject',
      textBody: 'Text body',
      htmlBody: null,
      emailType: 'EMAIL_VERIFICATION',
      invitationStateVersion: null,
      attemptCount: 0,
      maxAttempts: 4,
      firstAttemptAt: null,
      retryDeadlineAt: null,
      createdAt: now,
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
    const claimed = {
      ...candidate,
      status: 'PROCESSING',
      attemptCount: 1,
      firstAttemptAt: now,
      retryDeadlineAt: new Date('2026-08-09T10:02:00.000Z'),
      leaseOwner: 'dispatcher-1',
      leaseExpiresAt: new Date('2026-08-09T10:00:30.000Z'),
    };
    prismaMock.emailDeliveryJob.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([candidate]);
    prismaMock.emailDeliveryJob.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.emailDeliveryJob.findUnique.mockResolvedValue(claimed);

    const result = await claimDueEmailDeliveryJobs({
      leaseOwner: 'dispatcher-1',
      batchSize: 10,
      leaseSeconds: 30,
      retryDeadlineSeconds: 120,
      now,
    });

    expect(prismaMock.emailDeliveryJob.findMany).toHaveBeenCalledWith({
      where: {
        status: { in: ['PENDING', 'RETRY_SCHEDULED'] },
        retryDeadlineAt: { lte: now },
        terminalAt: null,
      },
      select: expect.any(Object),
    });
    expect(prismaMock.emailDeliveryJob.findMany).toHaveBeenLastCalledWith({
      where: {
        status: { in: ['PENDING', 'RETRY_SCHEDULED'] },
        nextAttemptAt: { lte: now },
        terminalAt: null,
        OR: [{ retryDeadlineAt: null }, { retryDeadlineAt: { gt: now } }],
      },
      orderBy: [{ nextAttemptAt: 'asc' }, { createdAt: 'asc' }],
      take: 10,
      include: expect.any(Object),
    });
    expect(prismaMock.emailDeliveryJob.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'email-job-1',
        status: { in: ['PENDING', 'RETRY_SCHEDULED'] },
        nextAttemptAt: { lte: now },
        terminalAt: null,
        OR: [{ retryDeadlineAt: null }, { retryDeadlineAt: { gt: now } }],
      },
      data: {
        status: 'PROCESSING',
        leaseOwner: 'dispatcher-1',
        leasedAt: now,
        leaseExpiresAt: new Date('2026-08-09T10:00:30.000Z'),
        attemptCount: { increment: 1 },
        firstAttemptAt: now,
        retryDeadlineAt: new Date('2026-08-09T10:02:00.000Z'),
      },
    });
    expect(result).toEqual([claimed]);
  });

  it('does not return a job when the atomic claim no longer matches', async () => {
    prismaMock.emailDeliveryJob.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: 'email-job-1',
        firstAttemptAt: null,
        retryDeadlineAt: null,
      },
    ]);
    prismaMock.emailDeliveryJob.updateMany.mockResolvedValue({ count: 0 });

    const result = await claimDueEmailDeliveryJobs({
      leaseOwner: 'dispatcher-1',
      batchSize: 10,
      leaseSeconds: 30,
      retryDeadlineSeconds: 120,
      now: new Date('2026-08-09T10:00:00.000Z'),
    });

    expect(result).toEqual([]);
    expect(prismaMock.emailDeliveryJob.findUnique).not.toHaveBeenCalled();
  });

  it('does not return a read-back job when the lease owner has already changed', async () => {
    const now = new Date('2026-08-09T10:00:00.000Z');
    prismaMock.emailDeliveryJob.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: 'email-job-1',
        firstAttemptAt: null,
        retryDeadlineAt: null,
      },
    ]);
    prismaMock.emailDeliveryJob.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.emailDeliveryJob.findUnique.mockResolvedValue({
      id: 'email-job-1',
      status: 'PROCESSING',
      leaseOwner: 'dispatcher-2',
      leaseExpiresAt: new Date('2026-08-09T10:00:30.000Z'),
    });

    const result = await claimDueEmailDeliveryJobs({
      leaseOwner: 'dispatcher-1',
      batchSize: 10,
      leaseSeconds: 30,
      retryDeadlineSeconds: 120,
      now,
    });

    expect(result).toEqual([]);
  });

  it('does not claim jobs whose retry deadline has already passed', async () => {
    const now = new Date('2026-08-09T10:02:30.000Z');
    prismaMock.emailDeliveryJob.findMany.mockResolvedValueOnce([
      {
        id: 'email-job-1',
        deliveryLogId: 'email-log-1',
        emailType: 'EMAIL_VERIFICATION',
        invitationStateVersion: null,
        deliveryLog: {
          fallbackRelatedEntityType: null,
          fallbackRelatedEntityId: null,
          userId: 'user-1',
          actionTokenId: 'token-1',
          organisationId: null,
          organisationRegistrationRequestId: null,
          invitationId: null,
        },
      },
    ]);
    prismaMock.emailDeliveryJob.findMany.mockResolvedValueOnce([]);
    txMock.emailDeliveryJob.updateMany.mockResolvedValue({ count: 1 });

    const result = await claimDueEmailDeliveryJobs({
      leaseOwner: 'dispatcher-1',
      batchSize: 10,
      leaseSeconds: 75,
      retryDeadlineSeconds: 120,
      now,
    });

    expect(result).toEqual([]);
    expect(txMock.emailDeliveryJob.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'email-job-1',
        status: { in: ['PENDING', 'RETRY_SCHEDULED'] },
        retryDeadlineAt: { lte: now },
        terminalAt: null,
      },
      data: expect.objectContaining({
        status: 'FAILED',
        lastProviderOutcome: 'PROVIDER_TEMPORARY_FAILURE',
        lastReasonCode: 'EMAIL_RETRY_DEADLINE_EXCEEDED',
      }),
    });
    expect(txMock.emailDeliveryLog.update).toHaveBeenCalledWith({
      where: { id: 'email-log-1' },
      data: {
        deliveryStatus: 'FAILED',
        failedAt: now,
        failureReason: 'EMAIL_RETRY_DEADLINE_EXCEEDED',
      },
    });
  });

  it('verifies current lease ownership before dispatching', async () => {
    prismaMock.emailDeliveryJob.findFirst.mockResolvedValue({ id: 'email-job-1' });

    await expect(
      verifyEmailDeliveryClaimOwnership({
        jobId: 'email-job-1',
        leaseOwner: 'dispatcher-1',
        now: new Date('2026-08-09T10:00:00.000Z'),
      }),
    ).resolves.toBe(true);

    expect(prismaMock.emailDeliveryJob.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'email-job-1',
        status: 'PROCESSING',
        leaseOwner: 'dispatcher-1',
        leaseExpiresAt: { gt: new Date('2026-08-09T10:00:00.000Z') },
        terminalAt: null,
      },
      select: { id: true },
    });
  });

  it('does not schedule retry when the lease owner is stale', async () => {
    prismaMock.emailDeliveryJob.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      scheduleEmailDeliveryRetry({
        jobId: 'email-job-1',
        nextAttemptAt: new Date('2026-08-09T10:00:30.000Z'),
        providerOutcome: 'PROVIDER_TEMPORARY_FAILURE',
        reasonCode: 'SMTP_TEMPORARY_FAILURE',
        leaseOwner: 'old-dispatcher',
        now: new Date('2026-08-09T10:00:00.000Z'),
      }),
    ).resolves.toBe(false);
  });

  it('records accepted-safe state without retrying when accepted finalisation fails', async () => {
    prismaMock.emailDeliveryJob.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      markEmailDeliveryProviderPersistenceFailed({
        jobId: 'email-job-1',
        deliveryLogId: 'email-log-1',
        reasonCode: 'EMAIL_ACCEPTED_STATE_PERSISTENCE_FAILED',
        leaseOwner: 'dispatcher-1',
        now: new Date('2026-08-09T10:00:00.000Z'),
      }),
    ).resolves.toBe(true);

    expect(prismaMock.emailDeliveryJob.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'email-job-1',
        status: 'PROCESSING',
        leaseOwner: 'dispatcher-1',
        leaseExpiresAt: { gt: new Date('2026-08-09T10:00:00.000Z') },
        terminalAt: null,
      },
      data: expect.objectContaining({
        status: 'FAILED',
        lastProviderOutcome: 'PROVIDER_PERSISTENCE_FAILED',
        lastReasonCode: 'EMAIL_ACCEPTED_STATE_PERSISTENCE_FAILED',
      }),
    });
    expect(prismaMock.emailDeliveryLog.update).toHaveBeenCalledWith({
      where: { id: 'email-log-1' },
      data: {
        deliveryStatus: 'FAILED',
        failedAt: new Date('2026-08-09T10:00:00.000Z'),
        failureReason: 'EMAIL_ACCEPTED_STATE_PERSISTENCE_FAILED',
      },
    });
  });
});

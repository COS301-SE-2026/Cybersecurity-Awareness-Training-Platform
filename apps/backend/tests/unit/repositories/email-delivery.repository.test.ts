import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  claimDueEmailDeliveryJobs,
  recoverExpiredEmailDeliveryLeases,
  recordEmailDeliveryAccepted,
  recordEmailDeliveryTerminalFailure,
} from '../../../src/repositories/email-delivery.repository.js';

const txMock = vi.hoisted(() => ({
  actionToken: {
    findUnique: vi.fn(),
  },
  emailDeliveryJob: {
    findUnique: vi.fn(),
    update: vi.fn(),
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
    findUnique: vi.fn(),
    updateMany: vi.fn(),
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
  });

  it('marks the related invitation sent when the dispatcher records provider acceptance', async () => {
    await recordEmailDeliveryAccepted({
      jobId: 'email-job-1',
      deliveryLogId: 'email-log-1',
      providerMessageId: 'provider-message-1',
    });

    expect(txMock.emailDeliveryLog.update).toHaveBeenCalledWith({
      where: { id: 'email-log-1' },
      data: {
        deliveryStatus: 'SENT',
        providerMessageId: 'provider-message-1',
        sentAt: expect.any(Date),
      },
    });
    expect(txMock.emailDeliveryJob.update).toHaveBeenCalledWith({
      where: { id: 'email-job-1' },
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

  it('marks the related invitation failed when the dispatcher records terminal failure', async () => {
    await recordEmailDeliveryTerminalFailure({
      jobId: 'email-job-1',
      deliveryLogId: 'email-log-1',
      providerOutcome: 'PROVIDER_REJECTED',
      reasonCode: 'SMTP_PERMANENT_FAILURE',
    });

    expect(txMock.emailDeliveryLog.update).toHaveBeenCalledWith({
      where: { id: 'email-log-1' },
      data: {
        deliveryStatus: 'FAILED',
        failedAt: expect.any(Date),
        failureReason: 'SMTP_PERMANENT_FAILURE',
      },
    });
    expect(txMock.emailDeliveryJob.update).toHaveBeenCalledWith({
      where: { id: 'email-job-1' },
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
});

describe('email-delivery.repository queue claiming', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('recovers expired processing leases back into the retry queue', async () => {
    const now = new Date('2026-08-09T10:00:00.000Z');

    await recoverExpiredEmailDeliveryLeases({ now });

    expect(prismaMock.emailDeliveryJob.updateMany).toHaveBeenCalledWith({
      where: {
        status: 'PROCESSING',
        leaseExpiresAt: { lt: now },
        terminalAt: null,
      },
      data: {
        status: 'RETRY_SCHEDULED',
        leaseOwner: null,
        leasedAt: null,
        leaseExpiresAt: null,
        nextAttemptAt: now,
        lastReasonCode: 'LEASE_EXPIRED',
      },
    });
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
    };
    prismaMock.emailDeliveryJob.findMany.mockResolvedValue([candidate]);
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
        nextAttemptAt: { lte: now },
        terminalAt: null,
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
    prismaMock.emailDeliveryJob.findMany.mockResolvedValue([
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
});

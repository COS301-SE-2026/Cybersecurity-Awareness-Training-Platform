import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
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

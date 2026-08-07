import type {
  EmailDeliveryProviderOutcome,
  EmailDeliveryProviderKind,
  EmailDeliveryType,
  EmailRelatedEntityType,
  PrismaClient,
} from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { ACTIVE_INVITATION_STATUSES } from '../services/invitation-state-policy.js';

export type EmailDeliveryRelatedEntity = {
  fallbackType?: EmailRelatedEntityType;
  fallbackId?: string | null;
  userId?: string | null;
  actionTokenId?: string | null;
  invitationStateVersion?: string | null;
  organisationId?: string | null;
  organisationRegistrationRequestId?: string | null;
  invitationId?: string | null;
};

export type EmailDeliveryRepositoryClient = {
  $transaction?: PrismaClient['$transaction'];
  emailDeliveryLog: Pick<PrismaClient['emailDeliveryLog'], 'create' | 'update'>;
  emailDeliveryJob: Pick<PrismaClient['emailDeliveryJob'], 'create' | 'update'>;
  invitation: Pick<PrismaClient['invitation'], 'updateMany'>;
  actionToken: Pick<PrismaClient['actionToken'], 'findUnique'>;
};

export type EmailDeliveryDispatchJob = {
  id: string;
  deliveryLogId: string;
  status: 'PROCESSING';
  providerKind: EmailDeliveryProviderKind;
  recipientEmail: string;
  subject: string;
  textBody: string;
  htmlBody: string | null;
  emailType: EmailDeliveryType;
  invitationStateVersion: Date | null;
  attemptCount: number;
  maxAttempts: number;
  firstAttemptAt: Date | null;
  retryDeadlineAt: Date | null;
  deliveryLog: {
    id: string;
    userId: string | null;
    actionTokenId: string | null;
    organisationId: string | null;
    organisationRegistrationRequestId: string | null;
    invitationId: string | null;
    fallbackRelatedEntityType: EmailRelatedEntityType | null;
    fallbackRelatedEntityId: string | null;
  };
};

export type ClaimDueEmailDeliveryJobsInput = {
  leaseOwner: string;
  batchSize: number;
  leaseSeconds: number;
  retryDeadlineSeconds: number;
  now?: Date;
};

export type RecordEmailDeliveryAcceptedInput = {
  jobId: string;
  deliveryLogId: string;
  providerMessageId: string;
};

export type ScheduleEmailDeliveryRetryInput = {
  jobId: string;
  nextAttemptAt: Date;
  providerOutcome: EmailDeliveryProviderOutcome;
  reasonCode: string;
};

export type RecordEmailDeliveryTerminalFailureInput = {
  jobId: string;
  deliveryLogId: string;
  providerOutcome: EmailDeliveryProviderOutcome;
  reasonCode: string;
};

export type EnqueueEmailDeliveryInput = {
  emailType: EmailDeliveryType;
  recipientEmail: string;
  relatedEntity: EmailDeliveryRelatedEntity;
  subject: string;
  text: string;
  html?: string;
  maxAttempts: number;
};

export type EnqueuedEmailDelivery = {
  deliveryLogId: string;
  jobId: string;
};

export type MarkEmailDeliveryLogAcceptedInput = {
  deliveryLogId: string;
  jobId: string;
  providerMessageId: string;
};

export type MarkEmailDeliveryLogFailedInput = {
  deliveryLogId: string;
  jobId: string;
  failureReason: string;
};

type EmailDeliveryWritableClient = Pick<
  EmailDeliveryRepositoryClient,
  'emailDeliveryLog' | 'emailDeliveryJob' | 'invitation' | 'actionToken'
>;

function addSeconds(date: Date, seconds: number) {
  return new Date(date.getTime() + seconds * 1000);
}

function hasTypedRelation(entity: EmailDeliveryRelatedEntity): boolean {
  return Boolean(
    entity.userId ||
    entity.actionTokenId ||
    entity.organisationId ||
    entity.organisationRegistrationRequestId ||
    entity.invitationId,
  );
}

function isInvitationEmail(emailType: EmailDeliveryType): boolean {
  return (
    emailType === 'INITIAL_ORGANISATION_ADMIN_SETUP' ||
    emailType === 'ORGANISATION_TRAINEE_INVITE' ||
    emailType === 'ORGANISATION_ADMIN_PROMOTION_INVITE'
  );
}

function buildInvitationVersionFilter(entity: EmailDeliveryRelatedEntity) {
  return entity.invitationStateVersion
    ? { updatedAt: new Date(entity.invitationStateVersion) }
    : {};
}

async function runWrite<T>(
  client: EmailDeliveryRepositoryClient,
  action: (tx: EmailDeliveryWritableClient) => Promise<T>,
): Promise<T> {
  if (!client.$transaction) {
    return action(client);
  }

  return client.$transaction(async (tx) => action(tx as EmailDeliveryWritableClient));
}

async function markInvitationIfRelevant(
  input: {
    emailType: EmailDeliveryType;
    relatedEntity: EmailDeliveryRelatedEntity;
    status: 'SENT' | 'FAILED_TO_SEND';
  },
  client: EmailDeliveryWritableClient,
) {
  if (!input.relatedEntity.invitationId || !isInvitationEmail(input.emailType)) {
    return true;
  }

  if (input.relatedEntity.actionTokenId) {
    const token = await client.actionToken.findUnique({
      where: { id: input.relatedEntity.actionTokenId },
    });

    if (token && (token.revokedAt || token.usedAt)) {
      return false;
    }
  }

  const updateResult = await client.invitation.updateMany({
    data: { status: input.status },
    where: {
      id: input.relatedEntity.invitationId,
      status: { in: [...ACTIVE_INVITATION_STATUSES] },
      ...buildInvitationVersionFilter(input.relatedEntity),
    },
  });

  return updateResult.count > 0;
}

export async function enqueueEmailDelivery(
  input: EnqueueEmailDeliveryInput,
  client: EmailDeliveryRepositoryClient = prisma,
): Promise<EnqueuedEmailDelivery> {
  return runWrite(client, async (tx) => {
    const typedRelationExists = hasTypedRelation(input.relatedEntity);
    const deliveryLog = await tx.emailDeliveryLog.create({
      data: {
        recipientEmail: input.recipientEmail,
        emailType: input.emailType,
        fallbackRelatedEntityType: typedRelationExists ? null : input.relatedEntity.fallbackType,
        fallbackRelatedEntityId: typedRelationExists
          ? null
          : (input.relatedEntity.fallbackId ?? null),
        userId: input.relatedEntity.userId ?? null,
        actionTokenId: input.relatedEntity.actionTokenId ?? null,
        organisationId: input.relatedEntity.organisationId ?? null,
        organisationRegistrationRequestId:
          input.relatedEntity.organisationRegistrationRequestId ?? null,
        invitationId: input.relatedEntity.invitationId ?? null,
        deliveryStatus: 'PENDING',
      },
    });

    const deliveryJob = await tx.emailDeliveryJob.create({
      data: {
        deliveryLogId: deliveryLog.id,
        recipientEmail: input.recipientEmail,
        subject: input.subject,
        textBody: input.text,
        htmlBody: input.html ?? null,
        emailType: input.emailType,
        invitationStateVersion: input.relatedEntity.invitationStateVersion
          ? new Date(input.relatedEntity.invitationStateVersion)
          : null,
        maxAttempts: input.maxAttempts,
      },
    });

    return {
      deliveryLogId: deliveryLog.id,
      jobId: deliveryJob.id,
    };
  });
}

export async function markEmailDeliveryLogAccepted(
  input: MarkEmailDeliveryLogAcceptedInput,
  client: EmailDeliveryRepositoryClient = prisma,
) {
  await runWrite(client, async (tx) => {
    await tx.emailDeliveryLog.update({
      data: {
        deliveryStatus: 'SENT',
        providerMessageId: input.providerMessageId,
        sentAt: new Date(),
      },
      where: { id: input.deliveryLogId },
    });

    await tx.emailDeliveryJob.update({
      data: {
        status: 'SUCCEEDED',
        terminalAt: new Date(),
        lastProviderOutcome: 'PROVIDER_ACCEPTED',
      },
      where: { id: input.jobId },
    });
  });
}

export async function markEmailDeliveryLogFailed(
  input: MarkEmailDeliveryLogFailedInput,
  client: EmailDeliveryRepositoryClient = prisma,
) {
  await runWrite(client, async (tx) => {
    await tx.emailDeliveryLog.update({
      data: {
        deliveryStatus: 'FAILED',
        failedAt: new Date(),
        failureReason: input.failureReason,
      },
      where: { id: input.deliveryLogId },
    });

    await tx.emailDeliveryJob.update({
      data: {
        status: 'FAILED',
        terminalAt: new Date(),
        lastProviderOutcome: 'PROVIDER_REJECTED',
        lastReasonCode: input.failureReason,
      },
      where: { id: input.jobId },
    });
  });
}

export async function markEmailInvitationSentIfRelevant(
  input: {
    emailType: EmailDeliveryType;
    relatedEntity: EmailDeliveryRelatedEntity;
  },
  client: EmailDeliveryRepositoryClient = prisma,
) {
  return runWrite(client, (tx) =>
    markInvitationIfRelevant(
      {
        emailType: input.emailType,
        relatedEntity: input.relatedEntity,
        status: 'SENT',
      },
      tx,
    ),
  );
}

export async function markEmailInvitationFailedIfRelevant(
  input: {
    emailType: EmailDeliveryType;
    relatedEntity: EmailDeliveryRelatedEntity;
  },
  client: EmailDeliveryRepositoryClient = prisma,
) {
  return runWrite(client, (tx) =>
    markInvitationIfRelevant(
      {
        emailType: input.emailType,
        relatedEntity: input.relatedEntity,
        status: 'FAILED_TO_SEND',
      },
      tx,
    ),
  );
}

export async function recoverExpiredEmailDeliveryLeases(input: { now?: Date } = {}) {
  const now = input.now ?? new Date();

  await prisma.emailDeliveryJob.updateMany({
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
}

export async function claimDueEmailDeliveryJobs(
  input: ClaimDueEmailDeliveryJobsInput,
): Promise<EmailDeliveryDispatchJob[]> {
  const now = input.now ?? new Date();
  const leaseExpiresAt = addSeconds(now, input.leaseSeconds);

  const candidates = await prisma.emailDeliveryJob.findMany({
    where: {
      status: { in: ['PENDING', 'RETRY_SCHEDULED'] },
      nextAttemptAt: { lte: now },
      terminalAt: null,
    },
    orderBy: [{ nextAttemptAt: 'asc' }, { createdAt: 'asc' }],
    take: input.batchSize,
    include: {
      deliveryLog: {
        select: {
          id: true,
          userId: true,
          actionTokenId: true,
          organisationId: true,
          organisationRegistrationRequestId: true,
          invitationId: true,
          fallbackRelatedEntityType: true,
          fallbackRelatedEntityId: true,
        },
      },
    },
  });

  const claimedJobs: EmailDeliveryDispatchJob[] = [];

  for (const candidate of candidates) {
    const firstAttemptAt = candidate.firstAttemptAt ?? now;
    const retryDeadlineAt =
      candidate.retryDeadlineAt ?? addSeconds(firstAttemptAt, input.retryDeadlineSeconds);

    const claim = await prisma.emailDeliveryJob.updateMany({
      where: {
        id: candidate.id,
        status: { in: ['PENDING', 'RETRY_SCHEDULED'] },
        nextAttemptAt: { lte: now },
        terminalAt: null,
      },
      data: {
        status: 'PROCESSING',
        leaseOwner: input.leaseOwner,
        leasedAt: now,
        leaseExpiresAt,
        attemptCount: { increment: 1 },
        firstAttemptAt,
        retryDeadlineAt,
      },
    });

    if (claim.count !== 1) {
      continue;
    }

    const claimed = await prisma.emailDeliveryJob.findUnique({
      where: { id: candidate.id },
      include: {
        deliveryLog: {
          select: {
            id: true,
            userId: true,
            actionTokenId: true,
            organisationId: true,
            organisationRegistrationRequestId: true,
            invitationId: true,
            fallbackRelatedEntityType: true,
            fallbackRelatedEntityId: true,
          },
        },
      },
    });

    if (claimed?.status === 'PROCESSING') {
      claimedJobs.push(claimed as EmailDeliveryDispatchJob);
    }
  }

  return claimedJobs;
}

export async function recordEmailDeliveryAccepted(input: RecordEmailDeliveryAcceptedInput) {
  await prisma.$transaction(async (tx) => {
    await tx.emailDeliveryLog.update({
      where: { id: input.deliveryLogId },
      data: {
        deliveryStatus: 'SENT',
        providerMessageId: input.providerMessageId,
        sentAt: new Date(),
      },
    });

    await tx.emailDeliveryJob.update({
      where: { id: input.jobId },
      data: {
        status: 'SUCCEEDED',
        terminalAt: new Date(),
        leaseOwner: null,
        leasedAt: null,
        leaseExpiresAt: null,
        lastProviderOutcome: 'PROVIDER_ACCEPTED',
        lastReasonCode: null,
      },
    });
  });
}

export async function scheduleEmailDeliveryRetry(input: ScheduleEmailDeliveryRetryInput) {
  await prisma.emailDeliveryJob.update({
    where: { id: input.jobId },
    data: {
      status: 'RETRY_SCHEDULED',
      nextAttemptAt: input.nextAttemptAt,
      leaseOwner: null,
      leasedAt: null,
      leaseExpiresAt: null,
      lastProviderOutcome: input.providerOutcome,
      lastReasonCode: input.reasonCode,
    },
  });
}

export async function recordEmailDeliveryTerminalFailure(
  input: RecordEmailDeliveryTerminalFailureInput,
) {
  await prisma.$transaction(async (tx) => {
    await tx.emailDeliveryLog.update({
      where: { id: input.deliveryLogId },
      data: {
        deliveryStatus: 'FAILED',
        failedAt: new Date(),
        failureReason: input.reasonCode,
      },
    });

    await tx.emailDeliveryJob.update({
      where: { id: input.jobId },
      data: {
        status: 'FAILED',
        terminalAt: new Date(),
        leaseOwner: null,
        leasedAt: null,
        leaseExpiresAt: null,
        lastProviderOutcome: input.providerOutcome,
        lastReasonCode: input.reasonCode,
      },
    });
  });
}

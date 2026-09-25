import { randomUUID } from 'node:crypto';
import type {
  EmailDeliveryProviderOutcome,
  EmailDeliveryJobStatus,
  EmailDeliveryProviderKind,
  EmailDeliveryType,
  EmailRelatedEntityType,
  PrismaClient,
  PhishingSimulationStatus,
  Weekday,
  CampaignStatus,
} from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { ACTIVE_INVITATION_STATUSES } from '@insightful-phish/shared';

export type EmailDeliveryRelatedEntity = {
  fallbackType?: EmailRelatedEntityType;
  fallbackId?: string | null;
  userId?: string | null;
  actionTokenId?: string | null;
  invitationStateVersion?: string | null;
  organisationId?: string | null;
  organisationRegistrationRequestId?: string | null;
  invitationId?: string | null;
  campaignAssignmentId?: string | null;
};

export type EmailDeliveryRepositoryClient = {
  $transaction?: PrismaClient['$transaction'];
  emailDeliveryLog: Pick<PrismaClient['emailDeliveryLog'], 'create' | 'update'> &
    Partial<Pick<PrismaClient['emailDeliveryLog'], 'createMany' | 'findUnique'>>;
  emailDeliveryJob: Pick<PrismaClient['emailDeliveryJob'], 'create' | 'update'>;
  invitation: Pick<PrismaClient['invitation'], 'updateMany'>;
  actionToken: Pick<PrismaClient['actionToken'], 'findUnique'>;
};

export type EmailDeliveryDispatchJob = {
  id: string;
  deliveryLogId: string;
  status: 'PROCESSING';
  leaseOwner: string | null;
  leaseExpiresAt: Date | null;
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
    campaignAssignmentId?: string | null;
    fallbackRelatedEntityType: EmailRelatedEntityType | null;
    fallbackRelatedEntityId: string | null;
    phishingSimulationMessage?: {
      id: string;
      phishingSimulationId: string;
      providerProfileId: string;
      phishingSimulation: {
        organisationId: string;
        status: PhishingSimulationStatus;
        endAt: Date | null;
        sendFrom: string | null;
        sendUntil: string | null;
        weekdays: Weekday[];
        campaign: { status: CampaignStatus; startDate: Date | null; endDate: Date | null };
      };
      poolEmailId: string;
    } | null;
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
  leaseOwner: string;
  attemptCount: number;
  now?: Date;
};

export type ScheduleEmailDeliveryRetryInput = {
  jobId: string;
  nextAttemptAt: Date;
  providerOutcome: EmailDeliveryProviderOutcome;
  reasonCode: string;
  leaseOwner: string;
  attemptCount?: number;
  now?: Date;
};

export type RecordEmailDeliveryTerminalFailureInput = {
  jobId: string;
  deliveryLogId: string;
  providerOutcome: EmailDeliveryProviderOutcome;
  reasonCode: string;
  leaseOwner: string;
  attemptCount?: number;
  now?: Date;
};

export type VerifyEmailDeliveryClaimOwnershipInput = {
  jobId: string;
  leaseOwner: string;
  now?: Date;
};

export type CancelClaimedEmailDeliveryInput = {
  jobId: string;
  deliveryLogId: string;
  leaseOwner: string;
  reasonCode: string;
  now?: Date;
};

export type EnqueueEmailDeliveryInput = {
  idempotencyKey?: string | null;
  nextAttemptAt?: Date;
  emailType: EmailDeliveryType;
  recipientEmail: string;
  relatedEntity: EmailDeliveryRelatedEntity;
  subject: string;
  text: string;
  html?: string;
  maxAttempts: number;
  retryDeadlineAt?: Date;
};

export type EnqueuedEmailDelivery = {
  /** Present for keyed enqueue requests; legacy unkeyed results retain their shape. */
  created?: boolean;
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
export type ReleaseClaimedSimulationEmailDeliveryInput = {
  jobId: string;
  deliveryLogId: string;
  leaseOwner: string;
  attemptCount: number;
  reasonCode: string;
  now?: Date;
} & (
  | { status: 'RETRY_SCHEDULED'; nextAttemptAt: Date }
  | { status: 'CANCELLED' | 'FAILED'; nextAttemptAt?: never }
);

type EmailDeliveryWritableClient = Pick<
  EmailDeliveryRepositoryClient,
  'emailDeliveryLog' | 'emailDeliveryJob' | 'invitation' | 'actionToken'
>;

const emailDeliveryTerminalJobSelect = {
  emailType: true,
  invitationStateVersion: true,
  deliveryLog: {
    select: {
      fallbackRelatedEntityType: true,
      fallbackRelatedEntityId: true,
      userId: true,
      actionTokenId: true,
      organisationId: true,
      organisationRegistrationRequestId: true,
      invitationId: true,
    },
  },
} as const;

type EmailDeliveryJobWithRelation = {
  emailType: EmailDeliveryType;
  invitationStateVersion: Date | null;
  deliveryLog: {
    fallbackRelatedEntityType: EmailRelatedEntityType | null;
    fallbackRelatedEntityId: string | null;
    userId: string | null;
    actionTokenId: string | null;
    organisationId: string | null;
    organisationRegistrationRequestId: string | null;
    invitationId: string | null;
  };
};

const dueJobStatuses: EmailDeliveryJobStatus[] = ['PENDING', 'RETRY_SCHEDULED'];
const dueJobStatusFilter = { in: dueJobStatuses };

function addSeconds(date: Date, seconds: number) {
  return new Date(date.getTime() + seconds * 1000);
}

function hasTypedRelation(entity: EmailDeliveryRelatedEntity): boolean {
  return Boolean(
    entity.userId ||
    entity.actionTokenId ||
    entity.organisationId ||
    entity.organisationRegistrationRequestId ||
    entity.invitationId ||
    entity.campaignAssignmentId,
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

function buildRelatedEntityFromJob(job: EmailDeliveryJobWithRelation): EmailDeliveryRelatedEntity {
  return {
    fallbackType: job.deliveryLog.fallbackRelatedEntityType ?? undefined,
    fallbackId: job.deliveryLog.fallbackRelatedEntityId,
    userId: job.deliveryLog.userId,
    actionTokenId: job.deliveryLog.actionTokenId,
    organisationId: job.deliveryLog.organisationId,
    organisationRegistrationRequestId: job.deliveryLog.organisationRegistrationRequestId,
    invitationId: job.deliveryLog.invitationId,
    invitationStateVersion: job.invitationStateVersion?.toISOString() ?? null,
  };
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
  if (
    input.idempotencyKey !== undefined &&
    input.idempotencyKey !== null &&
    input.idempotencyKey.trim().length === 0
  ) {
    throw new Error('Email idempotency key must not be empty');
  }
  return runWrite(client, async (tx) => {
    const typedRelationExists = hasTypedRelation(input.relatedEntity);
    const data = {
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
      ...(input.relatedEntity.campaignAssignmentId
        ? { campaignAssignmentId: input.relatedEntity.campaignAssignmentId }
        : {}),
    } as const;

    let deliveryLog: { id: string };
    if (input.idempotencyKey != null) {
      const { createMany, findUnique } = tx.emailDeliveryLog;
      if (!createMany || !findUnique) {
        throw new Error('Idempotent email enqueue requires createMany and findUnique');
      }
      const id = randomUUID();
      // ON CONFLICT avoids aborting an outer transaction when another enqueue wins.
      const inserted = await createMany({
        data: { ...data, id, idempotencyKey: input.idempotencyKey },
        skipDuplicates: true,
      });
      if (inserted.count === 0) {
        const existing = await findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          select: { id: true, deliveryJob: { select: { id: true } } },
        });
        if (!existing?.deliveryJob) {
          throw new Error('Idempotent email delivery is missing its job');
        }
        return { deliveryLogId: existing.id, jobId: existing.deliveryJob.id, created: false };
      }
      deliveryLog = { id };
    } else {
      deliveryLog = await tx.emailDeliveryLog.create({ data });
    }

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
        ...(input.nextAttemptAt ? { nextAttemptAt: input.nextAttemptAt } : {}),
        ...(input.retryDeadlineAt ? { retryDeadlineAt: input.retryDeadlineAt } : {}),
      },
    });

    return {
      deliveryLogId: deliveryLog.id,
      jobId: deliveryJob.id,
      ...(input.idempotencyKey != null ? { created: true } : {}),
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
  const expiredJobs = await prisma.emailDeliveryJob.findMany({
    where: {
      status: { in: ['PROCESSING', 'SUBMITTING'] },
      leaseExpiresAt: { lt: now },
      terminalAt: null,
    },
    select: {
      id: true,
      status: true,
      deliveryLogId: true,
      emailType: true,
      invitationStateVersion: true,
      deliveryLog: {
        select: {
          phishingSimulationMessage: { select: { phishingSimulationId: true } },
          fallbackRelatedEntityType: true,
          fallbackRelatedEntityId: true,
          userId: true,
          actionTokenId: true,
          organisationId: true,
          organisationRegistrationRequestId: true,
          invitationId: true,
        },
      },
    },
  });

  for (const job of expiredJobs) {
    await prisma.$transaction(async (tx) => {
      const simulationId = job.deliveryLog.phishingSimulationMessage?.phishingSimulationId;
      if (simulationId !== undefined) {
        const lockKey = `PHISHING_SIMULATION:${simulationId}`;
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
      }
      const current = await tx.emailDeliveryJob.findUnique({
        where: { id: job.id },
        select: {
          status: true,
          simulationHandoffClaim: true,
          attemptCount: true,
          maxAttempts: true,
          retryDeadlineAt: true,
        },
      });
      if (current?.status !== job.status) return;
      const safeSimulationClaim =
        job.emailType === 'PHISHING_SIMULATION_MESSAGE' &&
        simulationId !== undefined &&
        job.status === 'PROCESSING' &&
        current.simulationHandoffClaim;
      if (safeSimulationClaim) {
        const simulation = await tx.phishingSimulation.findUnique({
          where: { id: simulationId },
          select: { stopRequestedAt: true },
        });
        const stopped = simulation === null || simulation.stopRequestedAt !== null;
        const retryable =
          !stopped &&
          current.attemptCount < current.maxAttempts &&
          (current.retryDeadlineAt === null || current.retryDeadlineAt > now);
        const status = stopped ? 'CANCELLED' : retryable ? 'RETRY_SCHEDULED' : 'FAILED';
        const reasonCode = stopped
          ? 'PHISHING_SIMULATION_STOP_REQUESTED'
          : 'EMAIL_PRE_SUBMISSION_LEASE_EXPIRED';
        const changed = await tx.emailDeliveryJob.updateMany({
          where: {
            id: job.id,
            status: 'PROCESSING',
            simulationHandoffClaim: true,
            leaseExpiresAt: { lt: now },
            terminalAt: null,
          },
          data: {
            status,
            terminalAt: retryable ? null : now,
            nextAttemptAt: retryable ? now : undefined,
            leaseOwner: null,
            leasedAt: null,
            leaseExpiresAt: null,
            lastProviderOutcome: null,
            lastReasonCode: reasonCode,
          },
        });
        if (changed.count !== 1) return;
        if (!retryable) {
          await tx.emailDeliveryLog.update({
            where: { id: job.deliveryLogId },
            data: {
              deliveryStatus: stopped ? 'CANCELLED' : 'FAILED',
              ...(stopped ? {} : { failedAt: now }),
              failureReason: reasonCode,
            },
          });
          await tx.phishingSimulationMessage.updateMany({
            where: { emailDeliveryLogId: job.deliveryLogId, dispatchStatus: 'QUEUED' },
            data: { dispatchStatus: stopped ? 'CANCELLED' : 'FAILED' },
          });
        }
        return;
      }
      const updateResult = await tx.emailDeliveryJob.updateMany({
        where: {
          id: job.id,
          status: job.status,
          leaseExpiresAt: { lt: now },
          terminalAt: null,
        },
        data: {
          status: 'FAILED',
          terminalAt: now,
          leasedAt: null,
          leaseExpiresAt: null,
          lastProviderOutcome: 'PROVIDER_AMBIGUOUS',
          lastReasonCode:
            job.status === 'SUBMITTING'
              ? 'EMAIL_SUBMISSION_OUTCOME_UNKNOWN'
              : 'EMAIL_PROCESSING_LEASE_EXPIRED',
        },
      });

      if (updateResult.count !== 1) {
        return;
      }

      await tx.emailDeliveryLog.update({
        where: { id: job.deliveryLogId },
        data: {
          deliveryStatus: 'FAILED',
          failedAt: now,
          failureReason:
            job.status === 'SUBMITTING'
              ? 'EMAIL_SUBMISSION_OUTCOME_UNKNOWN'
              : 'EMAIL_PROCESSING_LEASE_EXPIRED',
        },
      });
    });
  }
}

async function expireJobsPastRetryDeadline(now: Date) {
  const expiredJobs = await prisma.emailDeliveryJob.findMany({
    where: {
      status: dueJobStatusFilter,
      retryDeadlineAt: { lte: now },
      terminalAt: null,
    },
    select: {
      id: true,
      deliveryLogId: true,
      emailType: true,
      invitationStateVersion: true,
      deliveryLog: {
        select: {
          fallbackRelatedEntityType: true,
          fallbackRelatedEntityId: true,
          userId: true,
          actionTokenId: true,
          organisationId: true,
          organisationRegistrationRequestId: true,
          invitationId: true,
        },
      },
    },
  });

  for (const job of expiredJobs) {
    await prisma.$transaction(async (tx) => {
      const updateResult = await tx.emailDeliveryJob.updateMany({
        where: {
          id: job.id,
          status: dueJobStatusFilter,
          retryDeadlineAt: { lte: now },
          terminalAt: null,
        },
        data: {
          status: 'FAILED',
          terminalAt: now,
          leaseOwner: null,
          leasedAt: null,
          leaseExpiresAt: null,
          lastProviderOutcome: 'PROVIDER_TEMPORARY_FAILURE',
          lastReasonCode: 'EMAIL_RETRY_DEADLINE_EXCEEDED',
        },
      });

      if (updateResult.count !== 1) {
        return;
      }

      await tx.emailDeliveryLog.update({
        where: { id: job.deliveryLogId },
        data: {
          deliveryStatus: 'FAILED',
          failedAt: now,
          failureReason: 'EMAIL_RETRY_DEADLINE_EXCEEDED',
        },
      });

      await markInvitationIfRelevant(
        {
          emailType: job.emailType,
          relatedEntity: {
            fallbackType: job.deliveryLog.fallbackRelatedEntityType ?? undefined,
            fallbackId: job.deliveryLog.fallbackRelatedEntityId,
            userId: job.deliveryLog.userId,
            actionTokenId: job.deliveryLog.actionTokenId,
            organisationId: job.deliveryLog.organisationId,
            organisationRegistrationRequestId: job.deliveryLog.organisationRegistrationRequestId,
            invitationId: job.deliveryLog.invitationId,
            invitationStateVersion: job.invitationStateVersion?.toISOString() ?? null,
          },
          status: 'FAILED_TO_SEND',
        },
        tx,
      );
    });
  }
}

export async function claimDueEmailDeliveryJobs(
  input: ClaimDueEmailDeliveryJobsInput,
): Promise<EmailDeliveryDispatchJob[]> {
  const now = input.now ?? new Date();
  const leaseExpiresAt = addSeconds(now, input.leaseSeconds);

  await expireJobsPastRetryDeadline(now);

  const candidates = await prisma.emailDeliveryJob.findMany({
    where: {
      status: dueJobStatusFilter,
      nextAttemptAt: { lte: now },
      terminalAt: null,
      OR: [{ retryDeadlineAt: null }, { retryDeadlineAt: { gt: now } }],
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
          campaignAssignmentId: true,
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
        status: dueJobStatusFilter,
        nextAttemptAt: { lte: now },
        terminalAt: null,
        OR: [{ retryDeadlineAt: null }, { retryDeadlineAt: { gt: now } }],
      },
      data: {
        status: 'PROCESSING',
        simulationHandoffClaim: candidate.emailType === 'PHISHING_SIMULATION_MESSAGE',
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
            campaignAssignmentId: true,
            fallbackRelatedEntityType: true,
            fallbackRelatedEntityId: true,
            phishingSimulationMessage: {
              select: {
                id: true,
                phishingSimulationId: true,
                providerProfileId: true,
                phishingSimulation: {
                  select: {
                    organisationId: true,
                    status: true,
                    endAt: true,
                    sendFrom: true,
                    sendUntil: true,
                    weekdays: true,
                    campaign: { select: { status: true, startDate: true, endDate: true } },
                  },
                },
                poolEmailId: true,
              },
            },
          },
        },
      },
    });

    if (
      claimed?.status === 'PROCESSING' &&
      claimed.leaseOwner === input.leaseOwner &&
      claimed.leaseExpiresAt?.getTime() === leaseExpiresAt.getTime()
    ) {
      claimedJobs.push(claimed as EmailDeliveryDispatchJob);
    }
  }

  return claimedJobs;
}

export async function verifyEmailDeliveryClaimOwnership(
  input: VerifyEmailDeliveryClaimOwnershipInput,
) {
  const now = input.now ?? new Date();
  const job = await prisma.emailDeliveryJob.findFirst({
    where: {
      id: input.jobId,
      status: 'PROCESSING',
      leaseOwner: input.leaseOwner,
      leaseExpiresAt: { gt: now },
      terminalAt: null,
    },
    select: { id: true },
  });

  return Boolean(job);
}

export async function cancelClaimedEmailDelivery(input: CancelClaimedEmailDeliveryInput) {
  const now = input.now ?? new Date();
  let cancelled = false;

  await prisma.$transaction(async (tx) => {
    const updateResult = await tx.emailDeliveryJob.updateMany({
      where: {
        id: input.jobId,
        status: 'PROCESSING',
        leaseOwner: input.leaseOwner,
        leaseExpiresAt: { gt: now },
        terminalAt: null,
      },
      data: {
        status: 'CANCELLED',
        terminalAt: now,
        leaseOwner: null,
        leasedAt: null,
        leaseExpiresAt: null,
        lastProviderOutcome: null,
        lastReasonCode: input.reasonCode,
      },
    });
    if (updateResult.count !== 1) return;

    await tx.emailDeliveryLog.update({
      where: { id: input.deliveryLogId },
      data: {
        deliveryStatus: 'CANCELLED',
        failureReason: input.reasonCode,
      },
    });
    cancelled = true;
  });

  return cancelled;
}

export async function recordEmailDeliveryAccepted(input: RecordEmailDeliveryAcceptedInput) {
  const now = input.now ?? new Date();
  let recorded = false;

  await prisma.$transaction(async (tx) => {
    const job = await tx.emailDeliveryJob.findUnique({
      where: { id: input.jobId },
      select: emailDeliveryTerminalJobSelect,
    });

    const updateResult = await tx.emailDeliveryJob.updateMany({
      where: {
        id: input.jobId,
        deliveryLogId: input.deliveryLogId,
        status: { in: ['PROCESSING', 'SUBMITTING'] },
        leaseOwner: input.leaseOwner,
        attemptCount: input.attemptCount,
        terminalAt: null,
      },
      data: {
        status: 'SUCCEEDED',
        terminalAt: now,
        leaseOwner: null,
        leasedAt: null,
        leaseExpiresAt: null,
        lastProviderOutcome: 'PROVIDER_ACCEPTED',
        lastReasonCode: null,
      },
    });

    if (updateResult.count !== 1) {
      return;
    }

    await tx.emailDeliveryLog.update({
      where: { id: input.deliveryLogId },
      data: {
        deliveryStatus: 'SENT',
        providerMessageId: input.providerMessageId,
        sentAt: now,
        failedAt: null,
        failureReason: null,
      },
    });

    await tx.phishingSimulationMessage.updateMany({
      where: { emailDeliveryLogId: input.deliveryLogId, dispatchStatus: 'QUEUED' },
      data: { dispatchStatus: 'SUBMITTED' },
    });

    if (job) {
      await markInvitationIfRelevant(
        {
          emailType: job.emailType,
          relatedEntity: buildRelatedEntityFromJob(job),
          status: 'SENT',
        },
        tx,
      );
    }

    recorded = true;
  });

  return recorded;
}

export async function reconcileAcceptedEmailDelivery(input: RecordEmailDeliveryAcceptedInput) {
  const now = input.now ?? new Date();
  let recorded = false;
  await prisma.$transaction(async (tx) => {
    const job = await tx.emailDeliveryJob.findUnique({
      where: { id: input.jobId },
      select: {
        ...emailDeliveryTerminalJobSelect,
        status: true,
        attemptCount: true,
        leaseOwner: true,
        deliveryLogId: true,
        lastProviderOutcome: true,
      },
    });
    if (
      job === null ||
      job.deliveryLogId !== input.deliveryLogId ||
      job.attemptCount !== input.attemptCount ||
      job.leaseOwner !== input.leaseOwner ||
      !(
        job.status === 'SUBMITTING' ||
        job.status === 'PROCESSING' ||
        (job.status === 'FAILED' && job.lastProviderOutcome === 'PROVIDER_AMBIGUOUS')
      )
    ) {
      return;
    }
    const changed = await tx.emailDeliveryJob.updateMany({
      where: {
        id: input.jobId,
        deliveryLogId: input.deliveryLogId,
        attemptCount: input.attemptCount,
        leaseOwner: input.leaseOwner,
        status: job.status,
        lastProviderOutcome: job.lastProviderOutcome,
      },
      data: {
        status: 'SUCCEEDED',
        terminalAt: now,
        leaseOwner: null,
        leasedAt: null,
        leaseExpiresAt: null,
        lastProviderOutcome: 'PROVIDER_ACCEPTED',
        lastReasonCode: 'EMAIL_ACCEPTED_STATE_RECONCILED',
      },
    });
    if (changed.count !== 1) return;
    await tx.emailDeliveryLog.update({
      where: { id: input.deliveryLogId },
      data: {
        deliveryStatus: 'SENT',
        providerMessageId: input.providerMessageId,
        sentAt: now,
        failedAt: null,
        failureReason: null,
      },
    });
    await tx.phishingSimulationMessage.updateMany({
      where: {
        emailDeliveryLogId: input.deliveryLogId,
        dispatchStatus: { in: ['QUEUED', 'FAILED'] },
      },
      data: { dispatchStatus: 'SUBMITTED' },
    });
    recorded = true;
  });
  return recorded;
}

export async function scheduleEmailDeliveryRetry(input: ScheduleEmailDeliveryRetryInput) {
  const updateResult = await prisma.emailDeliveryJob.updateMany({
    where: {
      id: input.jobId,
      status: { in: ['PROCESSING', 'SUBMITTING'] },
      leaseOwner: input.leaseOwner,
      ...(input.attemptCount === undefined ? {} : { attemptCount: input.attemptCount }),
      terminalAt: null,
    },
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

  return updateResult.count === 1;
}

export async function recordEmailDeliveryTerminalFailure(
  input: RecordEmailDeliveryTerminalFailureInput,
) {
  const now = input.now ?? new Date();
  let recorded = false;

  await prisma.$transaction(async (tx) => {
    const job = await tx.emailDeliveryJob.findUnique({
      where: { id: input.jobId },
      select: emailDeliveryTerminalJobSelect,
    });

    const updateResult = await tx.emailDeliveryJob.updateMany({
      where: {
        id: input.jobId,
        status: { in: ['PROCESSING', 'SUBMITTING'] },
        leaseOwner: input.leaseOwner,
        ...(input.attemptCount === undefined ? {} : { attemptCount: input.attemptCount }),
        terminalAt: null,
      },
      data: {
        status: 'FAILED',
        terminalAt: now,
        leaseOwner: null,
        leasedAt: null,
        leaseExpiresAt: null,
        lastProviderOutcome: input.providerOutcome,
        lastReasonCode: input.reasonCode,
      },
    });

    if (updateResult.count !== 1) {
      return;
    }

    await tx.emailDeliveryLog.update({
      where: { id: input.deliveryLogId },
      data: {
        deliveryStatus: 'FAILED',
        failedAt: now,
        failureReason: input.reasonCode,
      },
    });

    if (job && input.providerOutcome !== 'PROVIDER_AMBIGUOUS') {
      await markInvitationIfRelevant(
        {
          emailType: job.emailType,
          relatedEntity: buildRelatedEntityFromJob(job),
          status: 'FAILED_TO_SEND',
        },
        tx,
      );
    }

    recorded = true;
  });

  return recorded;
}

export async function releaseClaimedSimulationEmailDelivery(
  input: ReleaseClaimedSimulationEmailDeliveryInput,
) {
  const now = input.now ?? new Date();
  let released = false;
  await prisma.$transaction(async (tx) => {
    const updateResult = await tx.emailDeliveryJob.updateMany({
      where: {
        id: input.jobId,
        deliveryLogId: input.deliveryLogId,
        emailType: 'PHISHING_SIMULATION_MESSAGE',
        status: 'PROCESSING',
        leaseOwner: input.leaseOwner,
        leaseExpiresAt: { gt: now },
        terminalAt: null,
        attemptCount: input.attemptCount,
      },
      data: {
        status: input.status,
        ...(input.status === 'RETRY_SCHEDULED'
          ? { nextAttemptAt: input.nextAttemptAt }
          : { terminalAt: now }),
        leaseOwner: null,
        leasedAt: null,
        leaseExpiresAt: null,
        attemptCount: { decrement: 1 },
        ...(input.attemptCount === 1 ? { firstAttemptAt: null } : {}),
        lastReasonCode: input.reasonCode,
      },
    });
    if (updateResult.count !== 1) {
      return;
    }
    if (input.status === 'CANCELLED') {
      await tx.emailDeliveryLog.update({
        where: { id: input.deliveryLogId },
        data: { deliveryStatus: 'CANCELLED', failureReason: input.reasonCode },
      });
    } else if (input.status === 'FAILED') {
      await tx.emailDeliveryLog.update({
        where: { id: input.deliveryLogId },
        data: { deliveryStatus: 'FAILED', failedAt: now, failureReason: input.reasonCode },
      });
    }
    released = true;
  });
  return released;
}

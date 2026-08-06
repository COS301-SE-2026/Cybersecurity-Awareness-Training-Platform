import type {
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

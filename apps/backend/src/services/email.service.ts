import type {
  EmailDeliveryType,
  EmailRelatedEntityType,
  PrismaClient,
} from '../generated/prisma/client.js';
import { ACTIVE_INVITATION_STATUSES } from './invitation-state-policy.js';
import { prisma } from '../lib/prisma.js';
import { renderEmail } from './email-template-renderer.js';
import { sendViaSMTP } from './smtp-mailer.js';

type EmailPrismaClient = {
  emailDeliveryLog: Pick<PrismaClient['emailDeliveryLog'], 'create' | 'update'>;
  invitation: Pick<PrismaClient['invitation'], 'update' | 'updateMany' | 'findUnique'>;
  actionToken: Pick<PrismaClient['actionToken'], 'findUnique'>;
};
export type SendEmailRelatedEntity = {
  fallbackType?: EmailRelatedEntityType;
  fallbackId?: string | null;
  userId?: string | null;
  actionTokenId?: string | null;
  invitationStateVersion?: string | null;
  organisationId?: string | null;
  organisationRegistrationRequestId?: string | null;
  invitationId?: string | null;
};
export interface SendEmailInput {
  emailType: EmailDeliveryType;
  recipientEmail: string;
  relatedEntity: SendEmailRelatedEntity;
  templateData?: unknown;
}
export type SendEmailOutput =
  | { ok: true; messageId?: string; deliveryLogId: string; deliveryStatus: 'SENT' | 'UNKNOWN' }
  | { ok: false; error: string; deliveryLogId?: string; deliveryStatus: 'FAILED' };

function isInvitationEmail(emailType: EmailDeliveryType) {
  return (
    emailType === 'INITIAL_ORGANISATION_ADMIN_SETUP' ||
    emailType === 'ORGANISATION_TRAINEE_INVITE' ||
    emailType === 'ORGANISATION_ADMIN_PROMOTION_INVITE'
  );
}

async function markInvitationSentIfRelevant(input: SendEmailInput, client: EmailPrismaClient) {
  if (!input.relatedEntity.invitationId || !isInvitationEmail(input.emailType)) {
    return;
  }
  const invitationStateVersion = input.relatedEntity.invitationStateVersion
    ? new Date(input.relatedEntity.invitationStateVersion)
    : null;
  if (input.relatedEntity.actionTokenId) {
    const token = await client.actionToken.findUnique({
      where: { id: input.relatedEntity.actionTokenId },
    });
    if (token && (token.revokedAt || token.usedAt)) {
      return;
    }
  }
  await client.invitation.updateMany({
    data: { status: 'SENT' },
    where: {
      id: input.relatedEntity.invitationId,
      status: { in: [...ACTIVE_INVITATION_STATUSES] },
      ...(invitationStateVersion ? { updatedAt: invitationStateVersion } : {}),
    },
  });
}
async function markInvitationFailedIfRelevant(input: SendEmailInput, client: EmailPrismaClient) {
  if (!input.relatedEntity.invitationId || !isInvitationEmail(input.emailType)) {
    return;
  }
  const invitationStateVersion = input.relatedEntity.invitationStateVersion
    ? new Date(input.relatedEntity.invitationStateVersion)
    : null;
  if (input.relatedEntity.actionTokenId) {
    const token = await client.actionToken.findUnique({
      where: { id: input.relatedEntity.actionTokenId },
    });
    if (token && (token.revokedAt || token.usedAt)) {
      return;
    }
  }
  await client.invitation.updateMany({
    data: { status: 'FAILED_TO_SEND' },
    where: {
      id: input.relatedEntity.invitationId,
      status: { in: [...ACTIVE_INVITATION_STATUSES] },
      ...(invitationStateVersion ? { updatedAt: invitationStateVersion } : {}),
    },
  });
}

export async function sendEmail(
  input: SendEmailInput,
  client: EmailPrismaClient = prisma,
): Promise<SendEmailOutput> {
  const renderedEmail = renderEmail(input.emailType, input.templateData);
  const hasTypedRelation = Boolean(
    input.relatedEntity.userId ||
    input.relatedEntity.actionTokenId ||
    input.relatedEntity.organisationId ||
    input.relatedEntity.organisationRegistrationRequestId ||
    input.relatedEntity.invitationId,
  );

  if (!hasTypedRelation && !input.relatedEntity.fallbackType) {
    throw new Error('Emails without a typed relation must provide a fallbackType');
  }

  const deliveryLog = await client.emailDeliveryLog.create({
    data: {
      recipientEmail: input.recipientEmail,
      emailType: input.emailType,
      fallbackRelatedEntityType: hasTypedRelation ? null : input.relatedEntity.fallbackType,
      fallbackRelatedEntityId: hasTypedRelation ? null : (input.relatedEntity.fallbackId ?? null),
      userId: input.relatedEntity.userId ?? null,
      actionTokenId: input.relatedEntity.actionTokenId ?? null,
      organisationId: input.relatedEntity.organisationId ?? null,
      organisationRegistrationRequestId:
        input.relatedEntity.organisationRegistrationRequestId ?? null,
      invitationId: input.relatedEntity.invitationId ?? null,
      deliveryStatus: 'PENDING',
    },
  });

  try {
    const providerResult = await sendViaSMTP({ to: input.recipientEmail, ...renderedEmail });
    try {
      await client.emailDeliveryLog.update({
        data: {
          deliveryStatus: 'SENT',
          providerMessageId: providerResult.messageId,
          sentAt: new Date(),
        },
        where: { id: deliveryLog.id },
      });
      await markInvitationSentIfRelevant(input, client);
    } catch (persistenceError) {
      console.error('Email sent via SMTP but post-send database update failed:', persistenceError);
      return {
        ok: true,
        messageId: providerResult.messageId,
        deliveryLogId: deliveryLog.id,
        deliveryStatus: 'UNKNOWN' as const,
      };
    }

    return {
      ok: true,
      messageId: providerResult.messageId,
      deliveryLogId: deliveryLog.id,
      deliveryStatus: 'SENT' as const,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown SMTP error';
    try {
      await client.emailDeliveryLog.update({
        data: { deliveryStatus: 'FAILED', failedAt: new Date(), failureReason: message },
        where: { id: deliveryLog.id },
      });
      await markInvitationFailedIfRelevant(input, client);
    } catch (logError) {
      console.error('Failed to log email delivery failure:', logError);
    }
    return {
      ok: false,
      error: message,
      deliveryLogId: deliveryLog.id,
      deliveryStatus: 'FAILED' as const,
    };
  }
}

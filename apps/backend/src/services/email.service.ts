import type {
  EmailDeliveryType,
  EmailRelatedEntityType,
  PrismaClient,
} from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { renderEmail } from './email-template-renderer.js';
import { sendViaSMTP } from './smtp-mailer.js';

type EmailPrismaClient = {
  emailDeliveryLog: Pick<PrismaClient['emailDeliveryLog'], 'create' | 'update'>;
  invitation: Pick<PrismaClient['invitation'], 'update'>;
};
export type SendEmailRelatedEntity = {
  fallbackType?: EmailRelatedEntityType;
  fallbackId?: string | null;
  userId?: string | null;
  actionTokenId?: string | null;
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
  | { ok: true; messageId?: string; deliveryLogId: string }
  | { ok: false; error: string; deliveryLogId?: string };

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
  await client.invitation.update({
    data: { status: 'SENT' },
    where: { id: input.relatedEntity.invitationId },
  });
}
async function markInvitationFailedIfRelevant(input: SendEmailInput, client: EmailPrismaClient) {
  if (!input.relatedEntity.invitationId || !isInvitationEmail(input.emailType)) {
    return;
  }
  await client.invitation.update({
    data: { status: 'FAILED_TO_SEND' },
    where: { id: input.relatedEntity.invitationId },
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
    await client.emailDeliveryLog.update({
      data: {
        deliveryStatus: 'SENT',
        providerMessageId: providerResult.messageId,
        sentAt: new Date(),
      },
      where: { id: deliveryLog.id },
    });
    await markInvitationSentIfRelevant(input, client);

    return { ok: true, messageId: providerResult.messageId, deliveryLogId: deliveryLog.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown SMTP error';
    await client.emailDeliveryLog.update({
      data: { deliveryStatus: 'FAILED', failedAt: new Date(), failureReason: message },
      where: { id: deliveryLog.id },
    });
    await markInvitationFailedIfRelevant(input, client);
    return { ok: false, error: message, deliveryLogId: deliveryLog.id };
  }
}

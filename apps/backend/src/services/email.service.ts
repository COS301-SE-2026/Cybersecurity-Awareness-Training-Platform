import type { EmailDeliveryType, EmailRelatedEntityType } from '../generated/prisma/client.js';
import { env } from '../config/env.js';
import type { EmailDeliveryRepositoryClient } from '../repositories/email-delivery.repository.js';
import { enqueueEmailDelivery } from '../repositories/email-delivery.repository.js';
import { renderEmail } from './email-template-renderer.js';

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

export type EmailQueueFailureReason = 'TEMPLATE_RENDER_FAILED' | 'DELIVERY_QUEUE_CREATE_FAILED';

export type EmailSendOutcome =
  | {
      status: 'QUEUED';
      queueAccepted: true;
      queued: true;
      deliveryLogId: string;
      jobId: string;
    }
  | {
      status: 'NOT_QUEUED';
      queueAccepted: false;
      queued: false;
      deliveryLogId?: string;
      failureReason: EmailQueueFailureReason;
    };

export const shouldRevokeTokenForEmailOutcome = (outcome: EmailSendOutcome): boolean =>
  outcome.status === 'NOT_QUEUED';

function validateRelatedEntity(input: SendEmailInput) {
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
}

export async function sendEmail(
  input: SendEmailInput,
  client?: EmailDeliveryRepositoryClient,
): Promise<EmailSendOutcome> {
  let renderedEmail: ReturnType<typeof renderEmail>;

  try {
    renderedEmail = renderEmail(input.emailType, input.templateData);
    validateRelatedEntity(input);
  } catch {
    return {
      status: 'NOT_QUEUED',
      queueAccepted: false,
      queued: false,
      failureReason: 'TEMPLATE_RENDER_FAILED',
    };
  }

  try {
    const pendingDelivery = await enqueueEmailDelivery(
      {
        emailType: input.emailType,
        recipientEmail: input.recipientEmail,
        relatedEntity: input.relatedEntity,
        subject: renderedEmail.subject,
        text: renderedEmail.text,
        html: renderedEmail.html,
        maxAttempts: env.EMAIL_DISPATCHER_MAX_ATTEMPTS,
      },
      client,
    );

    return {
      status: 'QUEUED',
      queueAccepted: true,
      queued: true,
      deliveryLogId: pendingDelivery.deliveryLogId,
      jobId: pendingDelivery.jobId,
    };
  } catch {
    return {
      status: 'NOT_QUEUED',
      queueAccepted: false,
      queued: false,
      failureReason: 'DELIVERY_QUEUE_CREATE_FAILED',
    };
  }
}

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
  campaignAssignmentId?: string | null;
};

export interface SendEmailInput {
  emailType: EmailDeliveryType;
  recipientEmail: string;
  relatedEntity: SendEmailRelatedEntity;
  templateData?: unknown;
  idempotencyKey?: string;
}

export type QueueCampaignAssignedEmailInput = {
  assignmentId: string;
  campaignId: string;
  campaignName: string;
  organisationId: string;
  organisationName: string;
  recipientUserId: string;
  recipientEmail: string;
  recipientFirstName?: string;
  availableAt?: Date | null;
  dueAt?: Date | null;
};

export type QueueCampaignSelfEnrolledEmailInput = {
  assignmentId: string;
  campaignId: string;
  campaignName: string;
  recipientUserId: string;
  recipientEmail: string;
  recipientFirstName?: string;
  dueAt?: Date | null;
};

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
    input.relatedEntity.invitationId ||
    input.relatedEntity.campaignAssignmentId,
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
        idempotencyKey: input.idempotencyKey,
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

export function queueCampaignAssignedEmail(
  input: QueueCampaignAssignedEmailInput,
): Promise<EmailSendOutcome> {
  return sendEmail({
    emailType: 'CAMPAIGN_ASSIGNED',
    recipientEmail: input.recipientEmail,
    relatedEntity: {
      userId: input.recipientUserId,
      organisationId: input.organisationId,
      campaignAssignmentId: input.assignmentId,
    },
    idempotencyKey: `campaign-assigned:${input.assignmentId}`,
    templateData: {
      firstName: input.recipientFirstName,
      campaignId: input.campaignId,
      campaignName: input.campaignName,
      organisationName: input.organisationName,
      availableAt: input.availableAt,
      dueAt: input.dueAt,
    },
  });
}

export function queueCampaignSelfEnrolledEmail(
  input: QueueCampaignSelfEnrolledEmailInput,
): Promise<EmailSendOutcome> {
  return sendEmail({
    emailType: 'CAMPAIGN_SELF_ENROLLED',
    recipientEmail: input.recipientEmail,
    relatedEntity: {
      userId: input.recipientUserId,
      campaignAssignmentId: input.assignmentId,
    },
    idempotencyKey: `campaign-self-enrolled:${input.assignmentId}`,
    templateData: {
      firstName: input.recipientFirstName,
      campaignId: input.campaignId,
      campaignName: input.campaignName,
      dueAt: input.dueAt,
    },
  });
}

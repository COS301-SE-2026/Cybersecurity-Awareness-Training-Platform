import type { EmailDeliveryType } from '../generated/prisma/client.js';
import { sendEmail } from './email.service.js';
import type { EmailSendOutcome } from './email.service.js';

export type AuthEmailType = EmailDeliveryType;
export type AuthEmailHookInput = {
  emailType: AuthEmailType;
  recipientEmail: string;
  actionTokenId?: string | null;
  userId?: string | null;
  organisationId?: string | null;
  invitationId?: string | null;
  organisationRegistrationRequestId?: string | null;
  templateData?: unknown;
  relatedEntityType?: 'EMAIL_CHANGE_REQUEST' | 'OTHER';
  relatedEntityId?: string | null;
};

type QueuedEmailOutcome = Extract<EmailSendOutcome, { status: 'QUEUED' }>;

export type AuthEmailHookResult =
  | QueuedEmailOutcome
  | {
      status: 'NOT_QUEUED';
      queueAccepted: false;
      queued: false;
      reason: 'EMAIL_QUEUE_FAILED';
      deliveryLogId?: string;
    };

export const shouldRevokeTokenForAuthEmailResult = (result: AuthEmailHookResult): boolean =>
  result.status === 'NOT_QUEUED';

export async function requestAuthEmailSend(
  input: AuthEmailHookInput,
): Promise<AuthEmailHookResult> {
  const result = await sendEmail({
    emailType: input.emailType,
    recipientEmail: input.recipientEmail,
    relatedEntity: {
      userId: input.userId ?? null,
      actionTokenId: input.actionTokenId ?? null,
      organisationId: input.organisationId ?? null,
      invitationId: input.invitationId ?? null,
      organisationRegistrationRequestId: input.organisationRegistrationRequestId ?? null,
      fallbackType: input.relatedEntityType,
      fallbackId: input.relatedEntityId ?? null,
    },
    templateData: input.templateData,
  });

  switch (result.status) {
    case 'NOT_QUEUED':
      return {
        status: 'NOT_QUEUED',
        queueAccepted: false,
        queued: false,
        reason: 'EMAIL_QUEUE_FAILED',
        deliveryLogId: result.deliveryLogId,
      };
    case 'QUEUED':
      return result;
  }
}

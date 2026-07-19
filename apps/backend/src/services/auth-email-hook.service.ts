import { sendEmail } from './email.service.js';
import type { EmailDeliveryType } from '../generated/prisma/client.js';
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

type AcceptedEmailOutcome = Extract<EmailSendOutcome, { status: 'ACCEPTED' }>;

type AcceptedPersistenceFailedEmailOutcome = Extract<
  EmailSendOutcome,
  { status: 'ACCEPTED_PERSISTENCE_FAILED' }
>;

export type AuthEmailHookResult =
  | AcceptedEmailOutcome
  | {
      status: 'NOT_ACCEPTED';
      acceptedByProvider: false;
      queued: false;
      reason: 'EMAIL_SEND_FAILED';
      deliveryLogId?: string;
    }
  | (AcceptedPersistenceFailedEmailOutcome & {
      reason: 'EMAIL_PERSISTENCE_FAILED';
    });

export const shouldRevokeTokenForAuthEmailResult = (result: AuthEmailHookResult): boolean =>
  result.status === 'NOT_ACCEPTED';

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
    case 'NOT_ACCEPTED':
      return {
        status: 'NOT_ACCEPTED',
        acceptedByProvider: false,
        queued: false,
        reason: 'EMAIL_SEND_FAILED',
        deliveryLogId: result.deliveryLogId,
      };
    case 'ACCEPTED_PERSISTENCE_FAILED':
      return {
        ...result,
        reason: 'EMAIL_PERSISTENCE_FAILED',
      };
    case 'ACCEPTED':
      return result;
  }
}

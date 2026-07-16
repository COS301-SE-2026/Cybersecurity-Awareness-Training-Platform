import { sendEmail } from './email.service.js';
import type { EmailDeliveryType } from '../generated/prisma/client.js';

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

export type AuthEmailHookResult =
  | {
      status: 'ACCEPTED';
      acceptedByProvider: true;
      queued: true;
      deliveryLogId: string;
      providerMessageId?: string;
    }
  | {
      status: 'NOT_ACCEPTED';
      acceptedByProvider: false;
      queued: false;
      reason: 'EMAIL_SEND_FAILED';
      deliveryLogId?: string;
    }
  | {
      status: 'ACCEPTED_PERSISTENCE_FAILED';
      acceptedByProvider: true;
      queued: true;
      deliveryLogId?: string;
      providerMessageId?: string;
      reason: 'EMAIL_PERSISTENCE_FAILED';
      persistenceFailureReason: string;
    };

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
        status: 'ACCEPTED_PERSISTENCE_FAILED',
        acceptedByProvider: true,
        queued: true,
        deliveryLogId: result.deliveryLogId,
        providerMessageId: result.providerMessageId,
        reason: 'EMAIL_PERSISTENCE_FAILED',
        persistenceFailureReason: result.persistenceFailureReason,
      };
    case 'ACCEPTED':
      return {
        status: 'ACCEPTED',
        acceptedByProvider: true,
        queued: true,
        deliveryLogId: result.deliveryLogId,
        providerMessageId: result.providerMessageId,
      };
  }
}

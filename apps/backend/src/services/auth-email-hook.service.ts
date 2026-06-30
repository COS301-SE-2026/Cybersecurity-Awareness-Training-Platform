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
  | { queued: true; deliveryLogId: string }
  | {
      queued: false;
      reason: 'EMAIL_SEND_FAILED';
      deliveryLogId?: string;
    };

export async function requestAuthEmailSend(
  input: AuthEmailHookInput,
): Promise<AuthEmailHookResult> {
  try {
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

    if (!result.ok) {
      return { queued: false, reason: 'EMAIL_SEND_FAILED', deliveryLogId: result.deliveryLogId };
    }

    return {
      queued: true,
      deliveryLogId: result.deliveryLogId,
    };
  } catch {
    return { queued: false, reason: 'EMAIL_SEND_FAILED' };
  }
}

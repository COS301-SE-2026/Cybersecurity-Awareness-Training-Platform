import { sendEmail } from './email.service.js';

export type AuthEmailType =
  | 'EMAIL_VERIFICATION'
  | 'PASSWORD_RESET'
  | 'PASSWORD_CHANGED'
  | 'EMAIL_CHANGE_CONFIRMATION'
  | 'EMAIL_CHANGE_WARNING'
  | 'ORGANISATION_REQUEST_RECEIVED'
  | 'INITIAL_ORGANISATION_ADMIN_SETUP'
  | 'ORGANISATION_TRAINEE_INVITE'
  | 'ORGANISATION_ADMIN_PROMOTION_INVITE'
  | 'PLATFORM_ADMIN_INVITE'
  | 'PLATFORM_ADMIN_UPGRADE_CONFIRMATION';

export type AuthEmailHookInput = {
  emailType: AuthEmailType;
  recipientEmail: string;
  actionTokenId?: string | null;
  userId?: string | null;
  organisationId?: string | null;
  invitationId?: string | null;
  organisationRegistrationRequestId?: string | null;
  templateData?: Record<string, unknown>;
};

export type AuthEmailHookResult =
  | { queued: true; deliveryLogId: string }
  | {
      queued: false;
      reason: 'EMAIL_SERVICE_NOT_IMPLEMENTED' | 'EMAIL_SEND_FAILED';
      deliveryLogId?: string;
    };

export async function requestAuthEmailSend(
  input: AuthEmailHookInput,
): Promise<AuthEmailHookResult> {
  if (input.emailType !== 'ORGANISATION_REQUEST_RECEIVED') {
    return {
      queued: false,
      reason: 'EMAIL_SERVICE_NOT_IMPLEMENTED',
    };
  }

  try {
    const organisationName = organisationNameFromTemplateData(input.templateData);
    const result = await sendEmail({
      to: input.recipientEmail,
      subject: 'We received your organisation registration request',
      text: [
        `We received the registration request for ${organisationName}.`,
        'The Insightful Phish team will review it before any organisation or account is created.',
      ].join('\n\n'),
      html: [
        `<p>We received the registration request for ${escapeHtml(organisationName)}.</p>`,
        '<p>The Insightful Phish team will review it before any organisation or account is created.</p>',
      ].join(''),
      emailType: 'ORGANISATION_REQUEST_RECEIVED',
      organisationRegistrationRequestId: input.organisationRegistrationRequestId ?? null,
    });

    if (!result.ok) {
      return {
        queued: false,
        reason: 'EMAIL_SEND_FAILED',
        deliveryLogId: result.deliveryLogId,
      };
    }

    return {
      queued: true,
      deliveryLogId: result.deliveryLogId,
    };
  } catch {
    return {
      queued: false,
      reason: 'EMAIL_SEND_FAILED',
    };
  }
}

function organisationNameFromTemplateData(templateData: Record<string, unknown> | undefined) {
  const organisationName = templateData?.organisationName;

  return typeof organisationName === 'string' && organisationName.trim()
    ? organisationName.trim()
    : 'your organisation';
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return entities[character];
  });
}

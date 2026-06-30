import { env } from '../config/env.js';
import { sendEmail, type SendEmailInput } from './email.service.js';

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
  const supportedTypes: AuthEmailType[] = [
    'ORGANISATION_REQUEST_RECEIVED',
    'EMAIL_VERIFICATION',
    'EMAIL_CHANGE_CONFIRMATION',
    'EMAIL_CHANGE_WARNING',
  ];

  if (!supportedTypes.includes(input.emailType)) {
    return {
      queued: false,
      reason: 'EMAIL_SERVICE_NOT_IMPLEMENTED',
    };
  }

  try {
    let subject = '';
    let text = '';
    let html = '';

    if (input.emailType === 'ORGANISATION_REQUEST_RECEIVED') {
      const organisationName = organisationNameFromTemplateData(input.templateData);
      subject = 'We received your organisation registration request';
      text = [
        `We received the registration request for ${organisationName}.`,
        'The Insightful Phish team will review it before any organisation or account is created.',
      ].join('\n\n');
      html = [
        `<p>We received the registration request for ${escapeHtml(organisationName)}.</p>`,
        '<p>The Insightful Phish team will review it before any organisation or account is created.</p>',
      ].join('');
    } else if (input.emailType === 'EMAIL_VERIFICATION') {
      const actionToken = input.templateData?.actionToken;
      const verificationUrl = `${env.FRONTEND_ORIGIN}/auth/verify-email?token=${actionToken}`;
      subject = 'Verify your email address';
      text = [
        'Please verify your email address by clicking the following link:',
        verificationUrl,
        'This link will expire in 24 hours.',
      ].join('\n\n');
      html = [
        '<p>Please verify your email address by clicking the link below:</p>',
        `<p><a href="${verificationUrl}">${verificationUrl}</a></p>`,
        '<p>This link will expire in 24 hours.</p>',
      ].join('');
    } else if (input.emailType === 'EMAIL_CHANGE_CONFIRMATION') {
      subject = 'Your email has been updated';
      text = 'Your Insightful Phish account email has been successfully updated.';
      html = '<p>Your Insightful Phish account email has been successfully updated.</p>';
    } else if (input.emailType === 'EMAIL_CHANGE_WARNING') {
      const newEmail = (input.templateData?.newEmail as string) || 'a new email address';
      subject = 'Security Alert: Email address changed';
      text = [
        `The email address for your Insightful Phish account was recently changed to ${newEmail}.`,
        'If you did not make this change, please contact support immediately.',
      ].join('\n\n');
      html = [
        `<p>The email address for your Insightful Phish account was recently changed to <strong>${escapeHtml(newEmail)}</strong>.</p>`,
        '<p>If you did not make this change, please contact support immediately.</p>',
      ].join('');
    }

    const sendEmailInput: SendEmailInput = {
      to: input.recipientEmail,
      subject,
      text,
      html,
      emailType: input.emailType,
      organisationRegistrationRequestId: input.organisationRegistrationRequestId ?? null,
    };
    if (input.userId !== undefined) {
      sendEmailInput.userId = input.userId;
    }
    if (input.actionTokenId !== undefined) {
      sendEmailInput.actionTokenId = input.actionTokenId;
    }

    const result = await sendEmail(sendEmailInput);

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

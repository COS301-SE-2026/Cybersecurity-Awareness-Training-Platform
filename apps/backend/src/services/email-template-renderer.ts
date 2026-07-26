import type { EmailDeliveryType } from '../generated/prisma/enums.js';
import { env } from '../config/env.js';
import { escapeHtml, renderBrandedEmailOrFallback } from './email-rendering-helper.js';

import {
  emailVerificationTemplateDataSchema,
  passwordResetTemplateDataSchema,
  passwordChangedTemplateDataSchema,
  emailChangeConfirmationTemplateDataSchema,
  emailChangeWarningTemplateDataSchema,
  organisationRequestReceivedTemplateDataSchema,
  organisationRequestRejectedTemplateDataSchema,
  initialOrganisationAdminSetupTemplateDataSchema,
  organisationTraineeInviteTemplateDataSchema,
  organisationAdminPromotionInviteTemplateDataSchema,
  platformAdminInviteTemplateDataSchema,
  roleChangedNotificationTemplateDataSchema,
  platformAdminUpgradeConfirmationTemplateDataSchema,
} from '@insightful-phish/shared';
export type RenderedEmail = { subject: string; text: string; html: string };

function actionUrl(path: string, rawToken: string) {
  const url = new URL(path, env.FRONTEND_ORIGIN);
  url.searchParams.set('token', rawToken);
  return url.toString();
}
function setupUrl(rawToken: string) {
  return new URL(`/setup/token/${rawToken}`, env.FRONTEND_ORIGIN).toString();
}

function greeting(firstName?: string) {
  return firstName ? `Hi ${firstName},` : `Hi,`;
}
function simpleEmail(input: {
  subject: string;
  heading: string;
  lines: string[];
  action?: { label: string; url: string; expiresAt?: Date };
}): RenderedEmail {
  const actionTextLines = input.action
    ? [
        `${input.action.label}: ${input.action.url}`,
        ...(input.action.expiresAt ? [expiryLines(input.action.expiresAt)] : []),
      ]
    : [];
  const textParts = [input.heading, ...input.lines, ...actionTextLines];
  const text = textParts.join('\n\n');

  const htmlLines = input.lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('');

  const actionHtml = input.action
    ? [
        `<p><a href="${escapeHtml(input.action.url)}">${escapeHtml(input.action.label)}</a></p>`,
        ...(input.action.expiresAt
          ? [`<p>${escapeHtml(expiryLines(input.action.expiresAt))}</p>`]
          : []),
      ].join('')
    : '';

  return {
    subject: input.subject,
    text,
    html: `<h1>${escapeHtml(input.heading)}</h1>${htmlLines}${actionHtml}`,
  };
}
function expiryLines(expiresAt: Date, now = new Date()) {
  const milliseconds = expiresAt.getTime() - now.getTime();
  const totalMinutes = Math.max(1, Math.ceil(milliseconds / (60 * 1000)));
  if (totalMinutes <= 60) {
    return `This link expires in ${totalMinutes} ${totalMinutes === 1 ? 'minute' : 'minutes'}.`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const hourText = `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  const minutes = totalMinutes % 60;
  if (minutes === 0) {
    return `This link expires in ${hourText}.`;
  }
  const minuteText = `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  return `This link expires in ${hourText} and ${minuteText}.`;
}

export function renderEmail(emailType: EmailDeliveryType, templateData: unknown): RenderedEmail {
  switch (emailType) {
    case 'EMAIL_VERIFICATION': {
      const data = emailVerificationTemplateDataSchema.parse(templateData);
      const url = actionUrl('/verify-email', data.actionToken);
      const fallback = simpleEmail({
        subject: 'Verify your email address',
        heading: 'Verify your email',
        lines: [
          greeting(data.firstName),
          `Welcome to Insightful Phish.`,
          'Before you can start using your account, please verify your email address.',
        ],
        action: { label: 'Verify email', url, expiresAt: data.actionTokenExpiresAt },
      });

      return renderBrandedEmailOrFallback(
        {
          templateId: 'EMAIL_VERIFICATION',
          subject: fallback.subject,
          previewText: 'Verify your Insightful Phish email address.',
          title: 'Verify your email',
          greeting: greeting(data.firstName),
          sections: [
            'Welcome to Insightful Phish.',
            'Before you can start using your account, please verify your email address.',
          ],
          cta: {
            label: 'Verify email',
            url,
          },
          expiryText: expiryLines(data.actionTokenExpiresAt),
        },
        fallback,
      );
    } //email_verification

    case 'PASSWORD_RESET': {
      const data = passwordResetTemplateDataSchema.parse(templateData);
      const url = actionUrl('/reset-password', data.actionToken);
      const fallback = simpleEmail({
        subject: 'Reset your password',
        heading: 'Reset your password',
        lines: [
          greeting(data.firstName),
          `We received a request to reset your Insightful Phish password.`,
          `If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.`,
        ],
        action: { label: 'Reset password', url, expiresAt: data.actionTokenExpiresAt },
      });

      return renderBrandedEmailOrFallback(
        {
          templateId: 'PASSWORD_RESET',
          subject: fallback.subject,
          previewText: 'Reset your Insightful Phish password.',
          title: 'Reset your password',
          greeting: greeting(data.firstName),
          sections: [
            'We received a request to reset your Insightful Phish password.',
            'If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.',
          ],
          cta: {
            label: 'Reset password',
            url,
          },
          expiryText: expiryLines(data.actionTokenExpiresAt),
        },
        fallback,
      );
    } //password reset

    case 'PASSWORD_CHANGED': {
      const data = passwordChangedTemplateDataSchema.parse(templateData);
      const fallback = simpleEmail({
        subject: 'Your password was changed',
        heading: 'Password changed',
        lines: [
          greeting(data.firstName),
          `Your Insightful Phish password was changed successfully`,
          'If you made this change, no further action is required.',
          `If you did not change your password, please contact support immediately.`,
        ],
      });

      return renderBrandedEmailOrFallback(
        {
          templateId: 'PASSWORD_CHANGED',
          subject: fallback.subject,
          previewText: 'Your Insightful Phish password was changed.',
          title: 'Password changed',
          greeting: greeting(data.firstName),
          sections: [
            'Your Insightful Phish password was changed successfully',
            'If you made this change, no further action is required.',
            'If you did not change your password, please contact support immediately.',
          ],
          support: {
            subject: 'Password changed help',
            body: 'I need help with a password change on my account.',
          },
        },
        fallback,
      );
    } //password changed

    case 'EMAIL_CHANGE_CONFIRMATION': {
      const data = emailChangeConfirmationTemplateDataSchema.parse(templateData);
      const url = actionUrl('/confirm-email-change', data.actionToken);
      const fallback = simpleEmail({
        subject: 'Confirm your new email address',
        heading: 'Confirm your email change',
        lines: [
          greeting(data.firstName),
          `We received a request to change your Insightful Phish email address.`,
          `Your account email will change from ${data.oldEmail} to ${data.newEmail}.`,
        ],
        action: { label: 'Confirm email change', url, expiresAt: data.actionTokenExpiresAt },
      });

      return renderBrandedEmailOrFallback(
        {
          templateId: 'EMAIL_CHANGE_CONFIRMATION',
          subject: fallback.subject,
          previewText: 'Confirm your Insightful Phish email change.',
          title: 'Confirm your email change',
          greeting: greeting(data.firstName),
          sections: [
            'We received a request to change your Insightful Phish email address.',
            `Your account email will change from ${data.oldEmail} to ${data.newEmail}.`,
          ],
          cta: {
            label: 'Confirm email change',
            url,
          },
          expiryText: expiryLines(data.actionTokenExpiresAt),
        },
        fallback,
      );
    } //email change confirmation

    case 'EMAIL_CHANGE_WARNING': {
      const data = emailChangeWarningTemplateDataSchema.parse(templateData);
      const fallback = simpleEmail({
        subject: 'Email change requested',
        heading: 'Email change requested',
        lines: [
          greeting(data.firstName),
          `A request was made to change your Insightful Phish email address from ${data.oldEmail} to ${data.newEmail}.`,
          `The new email address must still be confirmed before the change takes effect.`,
          `If you did not request this change, please contact support immediately.`,
        ],
      });

      return renderBrandedEmailOrFallback(
        {
          templateId: 'EMAIL_CHANGE_WARNING',
          subject: fallback.subject,
          previewText: 'An Insightful Phish email change was requested.',
          title: 'Email change requested',
          greeting: greeting(data.firstName),
          sections: [
            `A request was made to change your Insightful Phish email address from ${data.oldEmail} to ${data.newEmail}.`,
            'The new email address must still be confirmed before the change takes effect.',
            'If you did not request this change, please contact support immediately.',
          ],
          support: {
            subject: 'Email change help',
            body: 'I need help with an email change request on my account.',
          },
        },
        fallback,
      );
    } //email change warning

    case 'ORGANISATION_REQUEST_RECEIVED': {
      const data = organisationRequestReceivedTemplateDataSchema.parse(templateData);
      return simpleEmail({
        subject: "We've received your organisation registration request",
        heading: 'Request received',
        lines: [
          greeting(),
          `Thank you for requesting to register ${data.organisationName} with Insightful Phish.`,
          `Your organisation registration request has been received.`,
          'Our team will review your request and notify you once we have an update.',
          `You will be able to complete your account setup once your request has been approved.`,
        ],
      });
    } //organisation reqeust received

    // Please use INTITIAL_ROGANISATION_ADMIN_SETUP if the organisation was approved.
    // case 'ORGANISATION_REQUEST_APPROVED':{
    //   const data = organisationRequestApprovedTemplateDataSchema.parse(templateData);
    //   const url = actionUrl('/register', data.actionToken);
    //   return simpleEmail({
    //     subject: 'Your Insightful Phish organisation registration request was approved',
    //     heading: 'Organisation Registration approved',
    //     lines: [`Your request to register ${data.organisationName} for Insightful Phish was approved.`, `Use the setup link below to create the first organisation admin account.`, `Setup link: ${url}`],
    //     action: {label:'Set up first organisation admin account', url}
    //   });
    // }//organisation request approved

    case 'ORGANISATION_REQUEST_REJECTED': {
      const data = organisationRequestRejectedTemplateDataSchema.parse(templateData);
      return simpleEmail({
        subject: 'Your organisation registration request was not approved',
        heading: 'Request not approved',
        lines: [
          greeting(),
          `Unfortunately, your request to register ${data.organisationName} for Insightful Phish was not approved.`,
          `Reason: `,
          data.rejectionReason ? `${data.rejectionReason}` : 'No reason provided.',
          'If you believe this is incorrect or require additional information, please contact support.',
        ],
      });
    } //organisation request denied

    case 'INITIAL_ORGANISATION_ADMIN_SETUP': {
      const data = initialOrganisationAdminSetupTemplateDataSchema.parse(templateData);
      const url = setupUrl(data.actionToken);
      const expiryText = expiryLines(data.actionTokenExpiresAt);
      const fallback = simpleEmail({
        subject: `Your organisation has been approved`,
        heading: 'Organisation approved',
        lines: [
          greeting(data.firstName),
          `Good news! Your request to register ${data.organisationName} for Insightful Phish has been approved.`,
          `The next step is to create the first organisation administrator account.`,
        ],
        action: {
          label: 'Set up administrator account',
          url,
          expiresAt: data.actionTokenExpiresAt,
        },
      });

      return renderBrandedEmailOrFallback(
        {
          templateId: 'INITIAL_ORGANISATION_ADMIN_SETUP',
          subject: fallback.subject,
          previewText: 'Your organisation has been approved.',
          title: 'Organisation approved',
          greeting: greeting(data.firstName),
          sections: [
            `Good news! Your request to register ${data.organisationName} for Insightful Phish has been approved.`,
            'The next step is to create the first organisation administrator account.',
          ],
          cta: {
            label: 'Set up administrator account',
            url,
          },
          expiryText,
          support: {
            subject: 'Initial administrator setup help',
            body: `I need help setting up the first administrator account for ${data.organisationName}.`,
          },
        },
        fallback,
      );
    } //organisation reqeust approved

    case 'ORGANISATION_TRAINEE_INVITE': {
      const data = organisationTraineeInviteTemplateDataSchema.parse(templateData);
      const url = setupUrl(data.actionToken);
      const lines = [
        greeting(data.firstName),
        `You have been invited to join ${data.organisationName} on Insightful Phish.`,
      ];

      if (data.requiresAccountConflictResolution) {
        lines.push(
          'This email address is currently associated with your individual Insightful Phish account.',
          'Before you can accept this invitation, you must either change the email address on your existing account or delete that account.',
          'Once this has been done, you can return to this invitation and continue.',
        );
      }

      return simpleEmail({
        subject: `You're invited to join ${data.organisationName}`,
        heading: 'Organisation invitation',
        lines,
        action: { label: 'Accept invitation', url, expiresAt: data.actionTokenExpiresAt },
      });
    } //organisation trainee invite

    case 'ORGANISATION_ADMIN_PROMOTION_INVITE': {
      const data = organisationAdminPromotionInviteTemplateDataSchema.parse(templateData);
      const url = actionUrl('/accept-invite', data.actionToken);
      return simpleEmail({
        subject: `You're invited to become an organisation administrator`,
        heading: 'Administrator invitation',
        lines: [
          greeting(data.firstName),
          `You have been invited to become an organisation administrator for ${data.organisationName}.`,
          `Organisation administrators can manage trainees, campaigns and organisation settings.`,
          `Accepting this invitation will replace your trainee access with administrator access.`,
        ],
        action: { label: 'Accept administrator invite', url, expiresAt: data.actionTokenExpiresAt },
      });
    } //organisation admin invite

    case 'PLATFORM_ADMIN_INVITE': {
      const data = platformAdminInviteTemplateDataSchema.parse(templateData);
      const url = setupUrl(data.actionToken);
      return simpleEmail({
        subject: `You're invited to join the Insightful Phish team`,
        heading: 'Platform administrator invitation',
        lines: [
          greeting(data.firstName),
          `You have been invited to join Insightful Phish as a platform administrator.`,
          `Platform administrators manage organisations and content available to individual trainees, and oversee the platform.`,
        ],
        action: {
          label: 'Create administrator account',
          url,
          expiresAt: data.actionTokenExpiresAt,
        },
      });
    } //platform admin invite

    case 'PLATFORM_ADMIN_UPGRADE_CONFIRMATION': {
      const data = platformAdminUpgradeConfirmationTemplateDataSchema.parse(templateData);
      const url = actionUrl('/accept-invite', data.actionToken);
      return simpleEmail({
        subject: `Confirm your platform administrator upgrade`,
        heading: 'Confirm administrator upgrade',
        lines: [
          greeting(data.firstName),
          `You have been invited to upgrade your existing account to a platform administrator account.`,
          `Accepting this upgrade will replace your current trainee account with platform administrator access.`,
          `If you do not wish to become a platform administrator, simply ignore this email.`,
        ],
        action: { label: 'Confirm upgrade', url, expiresAt: data.actionTokenExpiresAt },
      });
    } //platform admin invite

    case 'ROLE_CHANGED_NOTIFICATION': {
      const data = roleChangedNotificationTemplateDataSchema.parse(templateData);
      return simpleEmail({
        subject: 'Your role has changed',
        heading: 'Role updated',
        lines: [
          greeting(data.firstName),
          data.organisationName
            ? `Your role in ${data.organisationName} has been updated to ${data.roleName}.`
            : `Your Insightful Phish role has been updated to ${data.roleName}.`,
          'If you were not expecting this change, please contact support.',
        ],
      });
    } //role changed notification

    default:
      throw new Error(`Unsupported email template: ${emailType satisfies never}`);
  }
}

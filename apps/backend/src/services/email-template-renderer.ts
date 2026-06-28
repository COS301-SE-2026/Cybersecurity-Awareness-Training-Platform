import type { EmailDeliveryType } from '../generated/prisma/enums.js';
import { env } from '../config/env.js';
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
} from '@insightful-phish/shared';
export type RenderedEmail = { subject: string; text: string; html: string };

function actionUrl(path: string, rawToken: string) {
  const url = new URL(path, env.FRONTEND_ORIGIN);
  url.searchParams.set('token', rawToken);
  return url.toString();
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
function simpleEmail(input: {
  subject: string;
  heading: string;
  lines: string[];
  action?: { label: string; url: string };
}): RenderedEmail {
  const text = input.lines.join('\n\n');
  const htmlLines = input.lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('');
  const actionHtml = input.action
    ? `<p><a href="${escapeHtml(input.action.url)}">${escapeHtml(input.action.label)}</a></p>`
    : '';
  return {
    subject: input.subject,
    text,
    html: `<h1>${escapeHtml(input.heading)}</h1>${htmlLines}${actionHtml}`,
  };
}

export function renderEmail(emailType: EmailDeliveryType, templateData: unknown): RenderedEmail {
  switch (emailType) {
    case 'EMAIL_VERIFICATION': {
      const data = emailVerificationTemplateDataSchema.parse(templateData);
      const url = actionUrl('/verify-email', data.actionToken);
      return simpleEmail({
        subject: 'Verify your Insightful Phish email',
        heading: 'Verify your email',
        lines: [
          `Hi ${data.firstName},`,
          `Please verify your email address to activate your Insightful Phish account.`,
          `Verification link: ${url}`,
        ],
        action: { label: 'Verify email', url },
      });
    } //email_verification

    case 'PASSWORD_RESET': {
      const data = passwordResetTemplateDataSchema.parse(templateData);
      const url = actionUrl('/reset-password', data.actionToken);
      return simpleEmail({
        subject: 'Reset your Insightful Phish password',
        heading: 'Verify your password',
        lines: [
          `Hi ${data.firstName},`,
          `Use the link below to reset your password.`,
          `If you did not make this password reset request, please contact support.`,
          `Reset link: ${url}`,
        ],
        action: { label: 'Reset password', url },
      });
    } //password reset

    case 'PASSWORD_CHANGED': {
      const data = passwordChangedTemplateDataSchema.parse(templateData);
      return simpleEmail({
        subject: 'Your Insightful Phish password was changed',
        heading: 'Password changed',
        lines: [
          `Hi ${data.firstName},`,
          `Your Insightful Phish password was changed successfully`,
          `If you did not make this change, please contact support.`,
        ],
      });
    } //password changed

    case 'EMAIL_CHANGE_CONFIRMATION': {
      const data = emailChangeConfirmationTemplateDataSchema.parse(templateData);
      const url = actionUrl('/confirm-email-change', data.actionToken);
      return simpleEmail({
        subject: 'Confirm your new Insightful Phish email address',
        heading: 'Confirm your email change',
        lines: [
          `Hi ${data.firstName},`,
          `Please confirm that ${data.newEmail} should be used from now on for your Insightful Phish account. Once you have confirmed this new email address, you will no longer be able to use your old email address (${data.oldEmail}).`,
          `Confirmation link: ${url}`,
        ],
        action: { label: 'Confirm email change', url },
      });
    } //email change confirmation

    case 'EMAIL_CHANGE_WARNING': {
      const data = emailChangeWarningTemplateDataSchema.parse(templateData);
      return simpleEmail({
        subject: 'A request was made to change your Insightful Phish email address',
        heading: 'Email change requested',
        lines: [
          `Hi ${data.firstName},`,
          `A request was made to change your Insightful Phish account email address from ${data.oldEmail} to ${data.newEmail}.`,
          `Please check the inbox of ${data.newEmail} to confirm this change.`,
          `If you did not request this change, please contact support.`,
        ],
      });
    } //email change warning

    case 'ORGANISATION_REQUEST_RECEIVED': {
      const data = organisationRequestReceivedTemplateDataSchema.parse(templateData);
      return simpleEmail({
        subject: 'We received your organisation registration request for Insightful Phish',
        heading: 'Organisation registration request received',
        lines: [
          `We have received your organisation registration request for ${data.organisationName}`,
          `The Insightful Phish team will review it and will get back to you. Please keep an eye on this email inbox for feedback.`,
          `Only after your request has been approved will you be able to finish account setup.`,
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
        subject: 'Insightful Phish organisation registration request was not approved',
        heading: 'Organisation Registration update',
        lines: [
          `Unfortunately, your request to register ${data.organisationName} for Insightful Phish was not approved.`,
          `The following reason was provided: `,
          data.rejectionReason ? `Reason: ${data.rejectionReason}` : 'No reason provided.',
        ],
      });
    } //organisation request denied

    case 'INITIAL_ORGANISATION_ADMIN_SETUP': {
      const data = initialOrganisationAdminSetupTemplateDataSchema.parse(templateData);
      const url = actionUrl('/registration', data.actionToken);
      return simpleEmail({
        subject: `Your organisation registration request on InsightfulPhish was approved`,
        heading: 'Organisation approved',
        lines: [
          `Hi ${data.firstName},`,
          `Your request to register ${data.organisationName} for Insightful Phish was approved.`,
          `Use the setup link below to create the first organisation admin account.`,
          `Setup link: ${url}`,
        ],
        action: { label: 'Set up first admin account', url },
      });
    } //organisation reqeust approved

    case 'ORGANISATION_TRAINEE_INVITE': {
      const data = organisationTraineeInviteTemplateDataSchema.parse(templateData);
      const url = actionUrl('/registration', data.actionToken);
      return simpleEmail({
        subject: `You have been invited to join ${data.organisationName} on Insightful Phish`,
        heading: 'Organisation invitation',
        lines: [
          `Hi ${data.firstName},`,
          `You have been invited to join ${data.organisationName} on Insightful Phish.`,
          `Use the setup link below to create your Insightful Phish Account.`,
          `Setup link: ${url}`,
        ],
        action: { label: 'Accept invite', url },
      });
    } //organisation trainee invite

    case 'ORGANISATION_ADMIN_PROMOTION_INVITE': {
      const data = organisationAdminPromotionInviteTemplateDataSchema.parse(templateData);
      const url = actionUrl('/invite', data.actionToken);
      return simpleEmail({
        subject: `Admin invitation for ${data.organisationName}`,
        heading: 'Admin invitation',
        lines: [
          `Hi ${data.firstName},`,
          `You have been invited to become an organisation admin for ${data.organisationName} on Insightful Phish.`,
          `Use the link below to accept this invitation.`,
          `Note: If you decide to accept this invitation, you will no longer be able to access trainee-specific flows. You will instead be allowed to create content for general trainees and manage trainees.`,
          `Accept admin invitation link: ${url}`,
        ],
        action: { label: 'Accept admin invite', url },
      });
    } //organisation admin invite

    case 'PLATFORM_ADMIN_INVITE': {
      const data = platformAdminInviteTemplateDataSchema.parse(templateData);
      const url = actionUrl('/invite', data.actionToken);
      return simpleEmail({
        subject: `Insightful Phish Platform admin invitation`,
        heading: 'Admin invitation',
        lines: [
          `Hi ${data.firstName},`,
          `You have been invited to become an Insightful Phish admin invitation.`,
          `Use the link below to accept this invitation.`,
          `Note: If you decide to accept this invitation, you will no longer be able to access trainee-specific flows. You will instead be allowed to create content for trainees and manage organisations.`,
          `Accept admin invitation link: ${url}`,
        ],
        action: { label: 'Accept admin invite', url },
      });
    } //platform admin invite

    case 'ROLE_CHANGED_NOTIFICATION': {
      const data = roleChangedNotificationTemplateDataSchema.parse(templateData);
      return simpleEmail({
        subject: 'Your Insightful Phish role was changed',
        heading: 'Role changed',
        lines: [
          `Hi ${data.firstName},`,
          data.organisationName
            ? `Your role for ${data.organisationName} on Insightful Phish is now ${data.roleName}.`
            : `Your role on Insightful Phish is now ${data.roleName}.`,
        ],
      });
    } //role changed notification

    default:
      throw new Error(`Unsupported email template: ${emailType satisfies never}`);
  }
}

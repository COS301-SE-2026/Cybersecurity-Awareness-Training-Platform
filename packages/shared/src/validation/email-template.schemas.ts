import { z } from 'zod';
import { requiredTrimmedStringSchema } from './common.schemas.js';
export type TokenTemplateData = { firstName: string; actionToken: string };
export type EmailChangeConfirmationTemplateData = {
  firstName: string;
  oldEmail: string;
  newEmail: string;
  actionToken: string;
};

const displayNameSchema = requiredTrimmedStringSchema({
  requiredMessage: 'Display name is required.',
  maxLength: 100,
  maxMessage: 'Display name must be at most 100 characters.',
});
const organisationNameSchema = requiredTrimmedStringSchema({
  requiredMessage: 'Organisation name is required.',
  maxLength: 200,
  maxMessage: 'Organisation name must be at most 200 characters.',
});
const rawActionTokenSchema = z
  .string({
    required_error: 'Action token is required.',
    invalid_type_error: 'Action token is required.',
  })
  .min(32, 'Action token is invalid.')
  .max(512, 'Action token is invalid.')
  .regex(/^[A-Za-z0-9_-]+$/);
const emailAddressSchema = z.string().trim().email().max(254).toLowerCase();
const actionTokenExpiresAtSchema = z.coerce.date({
  required_error: 'Action token expiry is required.',
  invalid_type_error: 'Action token expiry is required',
});
const optionalDisplayNameSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  displayNameSchema.optional(),
);
const campaignIdSchema = z.string().uuid('Campaign ID must be a valid UUID.');
const campaignNameSchema = requiredTrimmedStringSchema({
  requiredMessage: 'Campaign name is required.',
  maxLength: 200,
  maxMessage: 'Campaign name must be at most 200 characters.',
});
const optionalCampaignDateSchema = z.coerce.date().nullable().optional();

export const emailVerificationTemplateDataSchema = z
  .object({
    firstName: displayNameSchema,
    actionToken: rawActionTokenSchema,
    actionTokenExpiresAt: actionTokenExpiresAtSchema,
  })
  .strict();
export const passwordResetTemplateDataSchema = z
  .object({
    firstName: displayNameSchema,
    actionToken: rawActionTokenSchema,
    actionTokenExpiresAt: actionTokenExpiresAtSchema,
  })
  .strict();
export const passwordChangedTemplateDataSchema = z
  .object({ firstName: displayNameSchema })
  .strict();
export const emailChangeConfirmationTemplateDataSchema = z
  .object({
    firstName: displayNameSchema,
    oldEmail: emailAddressSchema,
    newEmail: emailAddressSchema,
    actionToken: rawActionTokenSchema,
    actionTokenExpiresAt: actionTokenExpiresAtSchema,
  })
  .strict();
export const emailChangeWarningTemplateDataSchema = z
  .object({
    firstName: displayNameSchema,
    oldEmail: emailAddressSchema,
    newEmail: emailAddressSchema,
  })
  .strict();
export const organisationRequestReceivedTemplateDataSchema = z
  .object({ organisationName: organisationNameSchema })
  .strict();
export const organisationRequestRejectedTemplateDataSchema = z
  .object({
    organisationName: organisationNameSchema,
    rejectionReason: z.string().trim().max(1000).optional(),
  })
  .strict();
export const initialOrganisationAdminSetupTemplateDataSchema = z
  .object({
    firstName: displayNameSchema,
    organisationName: organisationNameSchema,
    actionToken: rawActionTokenSchema,
    actionTokenExpiresAt: actionTokenExpiresAtSchema,
  })
  .strict();
export const organisationTraineeInviteTemplateDataSchema = z
  .object({
    firstName: optionalDisplayNameSchema,
    organisationName: organisationNameSchema,
    actionToken: rawActionTokenSchema,
    actionTokenExpiresAt: actionTokenExpiresAtSchema,
    requiresAccountConflictResolution: z.boolean().optional().default(false),
  })
  .strict();
export const organisationAdminPromotionInviteTemplateDataSchema = z
  .object({
    firstName: displayNameSchema,
    organisationName: organisationNameSchema,
    actionToken: rawActionTokenSchema,
    actionTokenExpiresAt: actionTokenExpiresAtSchema,
  })
  .strict();
export const platformAdminInviteTemplateDataSchema = z
  .object({
    firstName: optionalDisplayNameSchema,
    actionToken: rawActionTokenSchema,
    actionTokenExpiresAt: actionTokenExpiresAtSchema,
  })
  .strict();
export const platformAdminUpgradeConfirmationTemplateDataSchema = z
  .object({
    firstName: displayNameSchema,
    actionToken: rawActionTokenSchema,
    actionTokenExpiresAt: actionTokenExpiresAtSchema,
  })
  .strict();
export const roleChangedNotificationTemplateDataSchema = z
  .object({
    firstName: displayNameSchema,
    organisationName: organisationNameSchema.optional(),
    roleName: requiredTrimmedStringSchema({
      requiredMessage: 'Role name is required.',
      maxLength: 100,
      maxMessage: 'Role name must be at most 100 characters',
    }),
  })
  .strict();
export const campaignAssignedTemplateDataSchema = z
  .object({
    firstName: optionalDisplayNameSchema,
    campaignId: campaignIdSchema,
    campaignName: campaignNameSchema,
    organisationName: organisationNameSchema.optional(),
    availableAt: optionalCampaignDateSchema,
    dueAt: optionalCampaignDateSchema,
  })
  .strict();
export const campaignSelfEnrolledTemplateDataSchema = z
  .object({
    firstName: optionalDisplayNameSchema,
    campaignId: campaignIdSchema,
    campaignName: campaignNameSchema,
    dueAt: optionalCampaignDateSchema,
  })
  .strict();
export const campaignDeadlineReminderTemplateDataSchema = z
  .object({
    firstName: optionalDisplayNameSchema,
    campaignId: campaignIdSchema,
    campaignName: campaignNameSchema,
    dueAt: z.coerce.date(),
  })
  .strict();

export type CampaignAssignedTemplateData = z.infer<typeof campaignAssignedTemplateDataSchema>;
export type CampaignSelfEnrolledTemplateData = z.infer<
  typeof campaignSelfEnrolledTemplateDataSchema
>;
export type CampaignDeadlineReminderTemplateData = z.infer<
  typeof campaignDeadlineReminderTemplateDataSchema
>;

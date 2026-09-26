import { z } from 'zod';
import { idParamSchema, requiredTrimmedStringSchema } from './common.schemas.js';

const emailProviderProfileDisplayNameSchema = requiredTrimmedStringSchema({
  requiredMessage: 'Please enter a profile display name.',
  maxLength: 100,
  maxMessage: 'Profile display name must be at most 100 characters.',
});
const smtpHostSchema = requiredTrimmedStringSchema({
  requiredMessage: 'Please enter an SMTP host.',
  maxLength: 253,
  maxMessage: 'SMTP host must be at most 253 characters.',
})
  .toLowerCase()
  .regex(/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i, 'SMTP host must be a valid hostname.')
  .refine(
    (host) =>
      host
        .split('.')
        .every((label) => label.length <= 63 && !label.startsWith('-') && !label.endsWith('-')),
    'SMTP host must be a valid hostname.',
  )
  .refine(
    (host) => /[a-z]/i.test(host.slice(host.lastIndexOf('.') + 1)),
    'SMTP host must be a valid hostname.',
  );
const smtpPortSchema = z
  .number({
    required_error: 'Please enter an SMTP port.',
    invalid_type_error: 'SMTP port must be a number.',
  })
  .int('SMTP port must be a whole number.')
  .refine((port) => port === 465 || port === 587, 'SMTP port must be 465 or 587.');
const smtpSecureSchema = z.boolean({
  required_error: 'Please select an SMTP secure mode.',
  invalid_type_error: 'SMTP secure mode must be true or false.',
});
const smtpUsernameSchema = requiredTrimmedStringSchema({
  requiredMessage: 'Please enter an SMTP username.',
  maxLength: 320,
  maxMessage: 'SMTP username must be at most 320 characters.',
});
const smtpCredentialSchema = z
  .string({
    required_error: 'Please enter an SMTP credential.',
    invalid_type_error: 'SMTP credential must be a string.',
  })
  .min(1, 'Please enter an SMTP credential.')
  .max(4096, 'SMTP credential must be at most 4096 characters.');
const smtpFromAddressSchema = z
  .string({
    required_error: 'Please enter a From address.',
    invalid_type_error: 'From address must be a string.',
  })
  .trim()
  .email('From address must be a valid email address.')
  .max(254, 'From address must be at most 254 characters.')
  .toLowerCase();
const smtpFromNameSchema = z
  .string({ invalid_type_error: 'From name must be a string or null.' })
  .trim()
  .min(1, 'From name must not be empty.')
  .max(100, 'From name must be at most 100 characters.')
  .nullable();
const smtpReplyToSchema = z
  .string({ invalid_type_error: 'Reply-to address must be a string or null.' })
  .trim()
  .email('Reply-to address must be a valid email address.')
  .max(254, 'Reply-to address must be at most 254 characters.')
  .toLowerCase()
  .nullable();
export const emailProviderProfileStatusSchema = z.enum(['ACTIVE', 'DISABLED'], {
  errorMap: () => ({ message: 'Please select a supported email provider profile status.' }),
});
const emailProviderProfileWriteFieldsSchema = z
  .object({
    displayName: emailProviderProfileDisplayNameSchema,
    smtpHost: smtpHostSchema,
    smtpPort: smtpPortSchema,
    smtpSecure: smtpSecureSchema,
    smtpUsername: smtpUsernameSchema,
    credential: smtpCredentialSchema,
    fromAddress: smtpFromAddressSchema,
    fromName: smtpFromNameSchema.optional(),
    replyTo: smtpReplyToSchema.optional(),
  })
  .strict();
export const createEmailProviderProfileRequestSchema =
  emailProviderProfileWriteFieldsSchema.superRefine(validateSmtpPortAndSecurity);
export const updateEmailProviderProfileRequestSchema = emailProviderProfileWriteFieldsSchema
  .partial()
  .extend({ status: emailProviderProfileStatusSchema.optional() })
  .strict()
  .refine((request) => Object.keys(request).length > 0, {
    message: 'Please provide at least one email provider profile field to update.',
  })
  .superRefine(validateSmtpPortAndSecurity);
export const emailProviderProfileCollectionRequestParamsSchema = z
  .object({ organisationId: idParamSchema })
  .strict();
export const emailProviderProfileDetailRequestParamsSchema =
  emailProviderProfileCollectionRequestParamsSchema.extend({ profileId: idParamSchema }).strict();
export const emailProviderProfileSummarySchema = z
  .object({
    id: idParamSchema,
    organisationId: idParamSchema.nullable(),
    displayName: emailProviderProfileDisplayNameSchema,
    providerKind: z.literal('SMTP'),
    status: emailProviderProfileStatusSchema,
    fromAddress: smtpFromAddressSchema,
    fromName: smtpFromNameSchema,
    replyTo: smtpReplyToSchema,
    inUse: z.boolean(),
  })
  .strict();
export const emailProviderProfileManagementDetailResponseSchema = emailProviderProfileSummarySchema
  .extend({
    organisationId: idParamSchema,
    smtpHost: smtpHostSchema,
    smtpPort: smtpPortSchema,
    smtpSecure: smtpSecureSchema,
    smtpUsername: smtpUsernameSchema,
  })
  .strict();
export const emailProviderProfileListResponseSchema = z
  .object({ items: z.array(emailProviderProfileSummarySchema) })
  .strict();
export const emailProviderProfileConnectionCheckResponseSchema = z
  .object({ connected: z.literal(true) })
  .strict();
export const emailProviderProfileTestEmailResponseSchema = z
  .object({ sent: z.literal(true) })
  .strict();
export type EmailProviderProfileStatusDto = z.infer<typeof emailProviderProfileStatusSchema>;
export type CreateEmailProviderProfileRequestDto = z.infer<
  typeof createEmailProviderProfileRequestSchema
>;
export type UpdateEmailProviderProfileRequestDto = z.infer<
  typeof updateEmailProviderProfileRequestSchema
>;
export type EmailProviderProfileCollectionRequestParamsDto = z.infer<
  typeof emailProviderProfileCollectionRequestParamsSchema
>;
export type EmailProviderProfileDetailRequestParamsDto = z.infer<
  typeof emailProviderProfileDetailRequestParamsSchema
>;
export type EmailProviderProfileSummaryDto = z.infer<typeof emailProviderProfileSummarySchema>;
export type EmailProviderProfileManagementDetailResponseDto = z.infer<
  typeof emailProviderProfileManagementDetailResponseSchema
>;
export type EmailProviderProfileListResponseDto = z.infer<
  typeof emailProviderProfileListResponseSchema
>;
export type EmailProviderProfileConnectionCheckResponseDto = z.infer<
  typeof emailProviderProfileConnectionCheckResponseSchema
>;
export type EmailProviderProfileTestEmailResponseDto = z.infer<
  typeof emailProviderProfileTestEmailResponseSchema
>;

function validateSmtpPortAndSecurity(
  input: { smtpPort?: number; smtpSecure?: boolean },
  context: z.RefinementCtx,
) {
  if (input.smtpPort === undefined && input.smtpSecure === undefined) return;

  if (input.smtpPort === undefined) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['smtpPort'],
      message: 'SMTP port is required when SMTP secure mode is updated.',
    });
    return;
  }

  if (input.smtpSecure === undefined) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['smtpSecure'],
      message: 'SMTP secure mode is required when SMTP port is updated.',
    });
    return;
  }

  const expectedSecureMode = input.smtpPort === 465;
  if (input.smtpSecure !== expectedSecureMode) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['smtpSecure'],
      message: `SMTP secure mode must be ${expectedSecureMode} when SMTP port is ${input.smtpPort}.`,
    });
  }
}

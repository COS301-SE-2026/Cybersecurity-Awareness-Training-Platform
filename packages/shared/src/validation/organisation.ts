import { z } from 'zod';
import { requiredTrimmedStringSchema } from './common.schemas.js';

export const getPlatformOrganisationParamsSchema = z
  .object({
    organisationId: z.string().uuid('Organisation ID must be a valid UUID'),
  })
  .strict();

export type GetPlatformOrganisationParamsDto = z.infer<typeof getPlatformOrganisationParamsSchema>;

export const resendInitialAdminSetupParamsSchema = z
  .object({
    organisationId: z.string().uuid('Organisation ID must be a valid UUID'),
  })
  .strict();

export type ResendInitialAdminSetupParamsDto = z.infer<typeof resendInitialAdminSetupParamsSchema>;

export const resendInitialAdminSetupResponseSchema = z
  .object({
    success: z.boolean(),
    emailQueued: z.boolean(),
    setupStatus: z.lazy(() => initialAdminSetupStatusSchema),
  })
  .strict();

export type ResendInitialAdminSetupResponseDto = z.infer<
  typeof resendInitialAdminSetupResponseSchema
>;

// Reason codes reported when a resend is ineligible. null means eligible with no caveat.
export const resendEligibilityReasonSchema = z.enum([
  'ORGANISATION_NOT_ONBOARDING',
  'INVITATION_NOT_ELIGIBLE',
  'SETUP_ALREADY_COMPLETED',
  'ACTIVE_SETUP_TOKEN_EXISTS',
  'SETUP_TOKEN_EXPIRED',
  'SETUP_EMAIL_FAILED',
  'CONCURRENT_RESEND_IN_PROGRESS',
]);

export const resendEligibilitySchema = z
  .object({
    isEligible: z.boolean(),
    reason: resendEligibilityReasonSchema.nullable(),
  })
  .strict();

export type ResendEligibilityDto = z.infer<typeof resendEligibilitySchema>;

// Lifecycle status of a single action token. Precedence: REVOKED > USED > EXPIRED > AVAILABLE.
export const actionTokenStatusSchema = z.enum(['AVAILABLE', 'USED', 'REVOKED', 'EXPIRED']);

// Delivery status values returned by the email delivery subsystem.
export const emailDeliveryStatusSchema = z.enum(['PENDING', 'SENT', 'FAILED']);

// Invitation status values.
export const invitationStatusSchema = z.enum([
  'PENDING',
  'SENT',
  'ACCEPTED',
  'COMPLETED',
  'EXPIRED',
  'REVOKED',
  'REJECTED',
  'FAILED_TO_SEND',
]);

//Admin account status values.
export const adminStatusSchema = z.enum(['ACTIVE', 'DISABLED']);

//Timeline event types.
export const timelineEventTypeSchema = z.enum(['AUDIT_LOG', 'EMAIL_DELIVERY']);

// Audit action types that apear in onboarding timelines.
// this is the stable allowlist -- the service filters to these values.

export const timelineAuditActionSchema = z.enum([
  'CREATED',
  'CONTACTED',
  'APPROVED',
  'REJECTED',
  'RESENT',
  'ACCEPTED',
  'COMPLETED',
  'ENABLED',
  'SUSPENDED',
  'REACTIVATED',
]);

export const timelineEventSchema = z
  .object({
    id: z.string().uuid(),
    type: timelineEventTypeSchema,
    timestamp: z.string().datetime(),
    action: z.string(),
    summary: z.string(),
    actor: z.string().nullable(),
    outcome: z.string().nullable(),
    // metadata is always null in timeline responses \ raw audit data is never exposed.
    metadata: z.null(),
  })
  .strict();

export type TimelineEventDto = z.infer<typeof timelineEventSchema>;

export const initialAdminSetupStatusSchema = z
  .object({
    id: z.string().uuid(),
    status: invitationStatusSchema,
    recipientEmail: z.string().email(),
    expiresAt: z.string().datetime(),
    latestActionToken: z
      .object({
        id: z.string().uuid(),
        expiresAt: z.string().datetime(),
        usedAt: z.string().datetime().nullable(),
        revokedAt: z.string().datetime().nullable(),
        // Precedence: REVOKED > USED > EXPIRED > AVAILABLE
        status: actionTokenStatusSchema,
      })
      .strict()
      .nullable(),
    latestEmailDelivery: z
      .object({
        id: z.string().uuid(),
        deliveryStatus: emailDeliveryStatusSchema,
        sentAt: z.string().datetime().nullable(),
        failedAt: z.string().datetime().nullable(),
        // failureReason intentionally kept as nullable string -- it's an opaque internal code,
        // not displayed raw to end users.
        failureReason: z.string().nullable(),
      })
      .strict()
      .nullable(),
  })
  .strict()
  .nullable();

export type InitialAdminSetupStatusDto = z.infer<typeof initialAdminSetupStatusSchema>;

export const organisationAdminSummarySchema = z
  .object({
    id: z.string().uuid(),
    adminStatus: adminStatusSchema,
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email(),
    isInitialAdmin: z.boolean(),
  })
  .strict();

export type OrganisationAdminSummaryDto = z.infer<typeof organisationAdminSummarySchema>;

//Organisation status values. PENDING_ONBOARDING is the initial state after approval.
//request-only is not a valid state for an organisation detail -- only for request detail.
export const organisationStatusSchema = z.enum([
  'PENDING_ONBOARDING',
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED',
  'DISABLED',
  'ARCHIVED',
]);

export const ORGANISATION_INFORMATION_LIMITS = {
  profile: {
    nameMaxLength: 200,
    descriptionMaxLength: 2_000,
    websiteMaxLength: 2_048,
    primaryDomainMaxLength: 253,
    approximateSizeMin: 1,
    approximateSizeMax: 100_000,
  },
  context: {
    maxActiveItems: 12,
    maxExampleEmailItems: 5,
    nameMaxLength: 200,
    descriptionMaxLength: 2_000,
    contentSummaryMaxLength: 5_000,
  },
} as const;

function emptyTextAsNull(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
function nullableTrimmedTextSchema(input: { fieldName: string; maxLength: number }) {
  return z.preprocess(
    emptyTextAsNull,
    z
      .string({ invalid_type_error: `${input.fieldName} must be text or null.` })
      .trim()
      .max(input.maxLength, `${input.fieldName} must be at most ${input.maxLength} characters.`)
      .nullable(),
  );
}

const nullableOrganisationWebsiteSchema = z.preprocess(
  emptyTextAsNull,
  z
    .string({
      invalid_type_error: 'Please enter a valid organisation website URL.',
    })
    .trim()
    .url('Organisation website must be a valid URL.')
    .max(
      ORGANISATION_INFORMATION_LIMITS.profile.websiteMaxLength,
      `Organisation website must be at most ${ORGANISATION_INFORMATION_LIMITS.profile.websiteMaxLength} characters.`,
    )
    .refine((value) => {
      try {
        const protocol = new URL(value).protocol;
        return protocol === 'http:' || protocol === 'https:';
      } catch {
        return false;
      }
    }, 'Organisation website must use http or https.')
    .nullable(),
);

const nullablePrimaryDomainSchema = z.preprocess(
  emptyTextAsNull,
  z
    .string({ invalid_type_error: 'Primary domain must be a hostname or null' })
    .trim()
    .toLowerCase()
    .max(
      ORGANISATION_INFORMATION_LIMITS.profile.primaryDomainMaxLength,
      `Primary domain must be at most ${ORGANISATION_INFORMATION_LIMITS.profile.primaryDomainMaxLength} characters.`,
    )
    .regex(
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/,
      'Primary domain must be a valid hostname',
    )
    .nullable(),
);

export const organisationProfileUpdateSchema = z
  .object({
    name: requiredTrimmedStringSchema({
      requiredMessage: 'Organisation name is required.',
      maxLength: ORGANISATION_INFORMATION_LIMITS.profile.nameMaxLength,
      maxMessage: `Organisation name must be at most ${ORGANISATION_INFORMATION_LIMITS.profile.nameMaxLength} characters.`,
    }),
    description: nullableTrimmedTextSchema({
      fieldName: 'Organisation description',
      maxLength: ORGANISATION_INFORMATION_LIMITS.profile.descriptionMaxLength,
    }),
    website: nullableOrganisationWebsiteSchema,
    primaryDomain: nullablePrimaryDomainSchema,
    approximateSize: z
      .number({
        invalid_type_error: 'Approximate organisation size must be a number or null.',
      })
      .int('Approximate organisation size must be a whole number.')
      .min(
        ORGANISATION_INFORMATION_LIMITS.profile.approximateSizeMin,
        `Approximate organisation size must be at least ${ORGANISATION_INFORMATION_LIMITS.profile.approximateSizeMin}.`,
      )
      .max(
        ORGANISATION_INFORMATION_LIMITS.profile.approximateSizeMax,
        `Approximate organisation size must be at most ${ORGANISATION_INFORMATION_LIMITS.profile.approximateSizeMax}.`,
      )
      .nullable(),
  })
  .strict();

export type OrganisationProfileUpdateDto = z.infer<typeof organisationProfileUpdateSchema>;

export const organisationContextTypeSchema = z.enum([
  'LOGO',
  'BRAND_GUIDELINES',
  'SECURITY_POLICY',
  'STAFF_STRUCTURE',
  'INTERNAL_TERMINOLOGY',
  'APPROVED_DOMAINS',
  'EMAIL_SIGNATURE_FORMAT',
  'OTHER',
]);
export const editableOrganisationContextTypeSchema = organisationContextTypeSchema.exclude([
  'LOGO',
]);
export const organisationContextProcessingStatusSchema = z.enum([
  'UPLOADED',
  'PROCESSING',
  'READY',
  'NEEDS_REVIEW',
  'ARCHIVED',
]);
export const organisationContextContentKindSchema = z.enum(['FREE_TEXT', 'EXAMPLE_EMAIL']);
export const organisationContextMetadataSchema = z
  .object({ kind: organisationContextContentKindSchema })
  .strict();
export type OrganisationContextMetadataDto = z.infer<typeof organisationContextMetadataSchema>;
export const organisationContextResponseSchema = z
  .object({
    id: z.string().uuid(),
    organisationId: z.string().uuid(),
    uploadedByUserId: z.string().uuid().nullable(),
    contextType: organisationContextTypeSchema,
    name: z.string(),
    description: z.string().nullable(),
    contentSummary: z.string().nullable(),
    contentRef: z.string().nullable(),
    metadata: z.record(z.unknown()).nullable(),
    processingStatus: organisationContextProcessingStatusSchema,
    aiUsable: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();
const organisationContextIdSchema = z.string().uuid('Context ID must be a valid UUID.');
const organisationContextNameSchema = requiredTrimmedStringSchema({
  requiredMessage: 'Context name is required.',
  maxLength: ORGANISATION_INFORMATION_LIMITS.context.nameMaxLength,
  maxMessage: `Context name must be at most ${ORGANISATION_INFORMATION_LIMITS.context.nameMaxLength} characters`,
});
const organisationContextDescriptionSchema = nullableTrimmedTextSchema({
  fieldName: 'Context description',
  maxLength: ORGANISATION_INFORMATION_LIMITS.context.descriptionMaxLength,
});
const organisationContextContentSummarySchema = requiredTrimmedStringSchema({
  requiredMessage: 'Context text is required',
  maxLength: ORGANISATION_INFORMATION_LIMITS.context.contentSummaryMaxLength,
  maxMessage: `Context text must be at most ${ORGANISATION_INFORMATION_LIMITS.context.contentSummaryMaxLength} characters.`,
});

const saveOrganisationContextActionSchema = z
  .object({
    action: z.literal('SAVE'),
    contextId: organisationContextIdSchema.nullable(),
    contextType: editableOrganisationContextTypeSchema,
    name: organisationContextNameSchema,
    description: organisationContextDescriptionSchema,
    contentSummary: organisationContextContentSummarySchema,
    metadata: organisationContextMetadataSchema,
  })
  .strict();
const markOrganisationContextReadyActionSchema = z
  .object({
    action: z.literal('MARK_READY'),
    contextId: organisationContextIdSchema,
  })
  .strict();
const setOrganisationContextAiUsableActionSchema = z
  .object({
    action: z.literal('SET_AI_USABLE'),
    contextId: organisationContextIdSchema,
    aiUsable: z.boolean(),
  })
  .strict();
const archiveOrganisationContextActionSchema = z
  .object({
    action: z.literal('ARCHIVE'),
    contextId: organisationContextIdSchema,
  })
  .strict();

export const organisationContextActionSchema = z.discriminatedUnion('action', [
  saveOrganisationContextActionSchema,
  markOrganisationContextReadyActionSchema,
  setOrganisationContextAiUsableActionSchema,
  archiveOrganisationContextActionSchema,
]);
export type OrganisationContextActionDto = z.infer<typeof organisationContextActionSchema>;

export const organisationInformationUpdateRequestSchema = z
  .object({
    profile: organisationProfileUpdateSchema.optional(),
    contextAction: organisationContextActionSchema.optional(),
  })
  .strict()
  .superRefine((request, context) => {
    if (request.profile === undefined && request.contextAction === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A profile update or context action is required',
      });
    }
  });
export type OrganisationInformationUpdateRequestDto = z.infer<
  typeof organisationInformationUpdateRequestSchema
>;

// export type OrganisationInformationReadOnlyReasonDto = 'MISSING_PERMISSION' | null;
// export type OrganisationInformationCapabilitiesDto = {
//   canEdit: boolean;
//   readOnlyReason: OrganisationInformationReadOnlyReasonDto;
// };
export const organisationInformationCapabilitiesSchema = z
  .object({ canEdit: z.boolean(), readOnlyReason: z.literal('MISSING_PERMISSION').nullable() })
  .strict();
export type OrganisationInformationCapabilitiesDto = z.infer<
  typeof organisationInformationCapabilitiesSchema
>;
export type OrganisationInformationReadOnlyReasonDto =
  OrganisationInformationCapabilitiesDto['readOnlyReason'];

export const platformOrganisationDetailSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    status: organisationStatusSchema,
    // request-only is excluded -- organisations always have a status, never request-only.
    detailType: z.enum([
      'onboarding organisation',
      'active organisation',
      'suspended organisation',
      'disabled organisation',
    ]),
    description: z.string().nullable(),
    approximateSize: z.number().int().nullable(),
    website: z.string().nullable(),
    primaryDomain: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    _count: z
      .object({
        adminProfiles: z.number().int().nonnegative(),
        traineeProfiles: z.number().int().nonnegative(),
      })
      .strict(),
    registrationRequest: z
      .object({
        id: z.string().uuid(),
        representativeFirstName: z.string(),
        representativeLastName: z.string(),
        representativeEmail: z.string().email(),
        submittedWebsite: z.string().nullable(),
        submittedPrimaryDomain: z.string().nullable(),
      })
      .strict()
      .nullable(),
    setupStatus: initialAdminSetupStatusSchema,
    resendEligibility: resendEligibilitySchema,
    admins: z.array(organisationAdminSummarySchema),
    timeline: z.array(timelineEventSchema),
  })
  .strict();

export type PlatformOrganisationDetailDto = z.infer<typeof platformOrganisationDetailSchema>;

export const ownOrganisationDetailSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    website: z.string().nullable(),
    primaryDomain: z.string().nullable(),
    approximateSize: z.number().int().nullable(),
    registeredTraineeCount: z.number().int().nonnegative(),
    registrationDate: z.string().datetime(),
    status: organisationStatusSchema,
    contexts: z.array(organisationContextResponseSchema),
    capabilities: organisationInformationCapabilitiesSchema,
  })
  .strict();

export type OwnOrganisationDetailDto = z.infer<typeof ownOrganisationDetailSchema>;

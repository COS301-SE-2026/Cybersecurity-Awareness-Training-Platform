import { z } from 'zod';

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

/** Reason codes reported when a resend is ineligible. null means eligible with no caveat. */
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

/** Lifecycle status of a single action token. Precedence: REVOKED > USED > EXPIRED > AVAILABLE. */
export const actionTokenStatusSchema = z.enum(['AVAILABLE', 'USED', 'REVOKED', 'EXPIRED']);

/** Delivery status values returned by the email delivery subsystem. */
export const emailDeliveryStatusSchema = z.enum(['PENDING', 'SENT', 'FAILED']);

/** Invitation status values. */
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

/** Admin account status values. */
export const adminStatusSchema = z.enum(['ACTIVE', 'DISABLED']);

/** Timeline event types. */
export const timelineEventTypeSchema = z.enum(['AUDIT_LOG', 'EMAIL_DELIVERY']);

/**
 * Audit action types that appear in onboarding timelines.
 * This is the stable allowlist -- the service filters to these values.
 */
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
    // metadata is always null in timeline responses -- raw audit data is never exposed.
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

/**
 * Organisation status values. PENDING_ONBOARDING is the initial state after approval.
 * request-only is not a valid state for an organisation detail -- only for request detail.
 */
export const organisationStatusSchema = z.enum([
  'PENDING_ONBOARDING',
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED',
  'DISABLED',
  'ARCHIVED',
]);

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

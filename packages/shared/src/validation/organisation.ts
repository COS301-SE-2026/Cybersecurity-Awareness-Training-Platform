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

export const resendEligibilitySchema = z
  .object({
    isEligible: z.boolean(),
    reason: z.string().nullable(),
  })
  .strict();

export type ResendEligibilityDto = z.infer<typeof resendEligibilitySchema>;

export const timelineEventSchema = z
  .object({
    id: z.string().uuid(),
    type: z.enum(['AUDIT_LOG', 'EMAIL_DELIVERY']),
    timestamp: z.string(),
    action: z.string(),
    summary: z.string(),
    actor: z.string().nullable(),
    status: z.string().nullable().optional(),
    outcome: z.string().nullable(),
    metadata: z.record(z.any()).nullable().optional(),
  })
  .strict();

export type TimelineEventDto = z.infer<typeof timelineEventSchema>;

export const initialAdminSetupStatusSchema = z
  .object({
    id: z.string().uuid(),
    status: z.string(),
    recipientEmail: z.string().email(),
    expiresAt: z.string(),
    latestActionToken: z
      .object({
        id: z.string().uuid(),
        expiresAt: z.string(),
        usedAt: z.string().nullable(),
        revokedAt: z.string().nullable(),
        status: z.enum(['AVAILABLE', 'USED', 'REVOKED', 'EXPIRED']),
      })
      .strict()
      .nullable(),
    latestEmailDelivery: z
      .object({
        id: z.string().uuid(),
        deliveryStatus: z.string(),
        sentAt: z.string().nullable(),
        failedAt: z.string().nullable(),
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
    adminStatus: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email(),
    isInitialAdmin: z.boolean(),
  })
  .strict();

export type OrganisationAdminSummaryDto = z.infer<typeof organisationAdminSummarySchema>;

export const platformOrganisationDetailSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    status: z.string(),
    detailType: z.enum([
      'request-only',
      'onboarding organisation',
      'active organisation',
      'suspended organisation',
      'disabled organisation',
    ]),
    description: z.string().nullable(),
    approximateSize: z.number().nullable(),
    website: z.string().nullable(),
    primaryDomain: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    _count: z
      .object({
        adminProfiles: z.number(),
        traineeProfiles: z.number(),
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

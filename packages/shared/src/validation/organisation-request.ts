import { z } from 'zod';
import {
  initialAdminSetupStatusSchema,
  resendEligibilitySchema,
  timelineEventSchema,
} from './organisation.js';

export const getOrganisationRequestDetailsParamsSchema = z
  .object({
    requestId: z.string().uuid('Request ID must be a valid UUID'),
  })
  .strict();

export type GetOrganisationRequestDetailsParamsDto = z.infer<
  typeof getOrganisationRequestDetailsParamsSchema
>;

export const platformOrganisationRequestDetailsResponseSchema = z
  .object({
    id: z.string().uuid(),
    submittedOrganisationName: z.string(),
    detailType: z.enum([
      'request-only',
      'onboarding organisation',
      'active organisation',
      'suspended organisation',
      'disabled organisation',
    ]),
    submittedWebsite: z.string().nullable(),
    submittedOrganisationDescription: z.string().nullable(),
    submittedOrganisationSize: z.number().nullable(),
    submittedPrimaryDomain: z.string().nullable(),
    representativeFirstName: z.string(),
    representativeLastName: z.string(),
    representativeEmail: z.string().email(),
    representativePhone: z.string().nullable(),
    status: z.string(),
    contactedByIpAdminId: z.string().uuid().nullable(),
    approvedByIpAdminId: z.string().uuid().nullable(),
    rejectedByIpAdminId: z.string().uuid().nullable(),
    approvedOrganisationId: z.string().uuid().nullable(),
    contactedAt: z.string().nullable(),
    approvedAt: z.string().nullable(),
    rejectedAt: z.string().nullable(),
    rejectionReason: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    setupStatus: initialAdminSetupStatusSchema,
    resendEligibility: resendEligibilitySchema,
    timeline: z.array(timelineEventSchema),
  })
  .strict();

export type PlatformOrganisationRequestDetailsResponseDto = z.infer<
  typeof platformOrganisationRequestDetailsResponseSchema
>;

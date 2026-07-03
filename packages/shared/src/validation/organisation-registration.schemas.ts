import { z } from 'zod';
import { requiredTrimmedStringSchema } from './common.schemas.js';

const MAX_ORGANISATION_SIZE = 100_000;

const representativeEmailSchema = z
  .string({
    required_error: 'Please enter a representative email address.',
    invalid_type_error: 'Please enter a valid representative email address.',
  })
  .trim()
  .min(1, 'Please enter a representative email address.')
  .max(254, 'Representative email address must be at most 254 characters.')
  .email('Please enter a valid representative email address.')
  .toLowerCase();

const websiteUrlSchema = z
  .string({
    required_error: 'Please enter an organisation website URL.',
    invalid_type_error: 'Please enter a valid organisation website URL.',
  })
  .trim()
  .url('Please enter a valid organisation website URL.')
  .max(2048, 'Organisation website URL must be at most 2048 characters.')
  .refine((value) => {
    try {
      const protocol = new URL(value).protocol;
      return protocol === 'http:' || protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Organisation website URL must use http or https.');

const optionalTrimmedString = (value: unknown) => {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};
const optionalOrganisationDescriptionSchema = z.preprocess(
  optionalTrimmedString,
  z
    .string({ invalid_type_error: 'Please enter a valid organisation description.' })
    .max(2000, 'Organisation description must be at most 2000 characters.')
    .optional(),
);
const optionalWebsiteUrlSchema = z.preprocess(optionalTrimmedString, websiteUrlSchema.optional());

export const createOrganisationRegistrationRequestSchema = z
  .object({
    organisationName: requiredTrimmedStringSchema({
      requiredMessage: 'Please enter an organisation name.',
      maxLength: 200,
      maxMessage: 'Organisation name must be at most 200 characters.',
    }),
    organisationDescription: optionalOrganisationDescriptionSchema,
    organisationSize: z
      .number({
        required_error: 'Please enter an approximate organisation size.',
        invalid_type_error: 'Organisation size must be a number.',
      })
      .int('Organisation size must be a whole number.')
      .min(1, 'Organisation size must be at least 1.')
      .max(MAX_ORGANISATION_SIZE, `Organisation size must be at most ${MAX_ORGANISATION_SIZE}.`),
    organisationWebsiteUrl: optionalWebsiteUrlSchema,
    representativeFirstName: requiredTrimmedStringSchema({
      requiredMessage: 'Please enter a representative first name.',
      maxLength: 100,
      maxMessage: 'Representative first name must be at most 100 characters.',
    }),
    representativeLastName: requiredTrimmedStringSchema({
      requiredMessage: 'Please enter a representative last name.',
      maxLength: 100,
      maxMessage: 'Representative last name must be at most 100 characters.',
    }),
    representativeEmail: representativeEmailSchema,
  })
  .strict();

export type CreateOrganisationRegistrationRequestDto = z.infer<
  typeof createOrganisationRegistrationRequestSchema
>;

export type OrganisationRegistrationRequestResponseDto = {
  requestId: string;
  status: 'PENDING_REVIEW';
  confirmationEmailQueued: boolean;
};

export const listOrganisationRequestsQuerySchema = z
  .object({
    status: z.enum(['PENDING_REVIEW', 'CONTACTED', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
    search: z.string().trim().optional(),
    sort: z.string().trim().optional(),
    page: z.preprocess(
      (val) => (val ? parseInt(val as string, 10) : undefined),
      z.number().int().min(1).optional().default(1),
    ),
    limit: z.preprocess(
      (val) => (val ? parseInt(val as string, 10) : undefined),
      z.number().int().min(1).max(100).optional().default(10),
    ),
  })
  .strict();

export type ListOrganisationRequestsQueryDto = z.infer<typeof listOrganisationRequestsQuerySchema>;

export const approveOrganisationRequestSchema = z
  .object({
    organisationName: z
      .string()
      .trim()
      .min(1, 'Organisation name cannot be empty.')
      .max(200, 'Organisation name must be at most 200 characters.')
      .optional(),
    initialAdminEmail: z
      .string({
        required_error: 'Initial admin email confirmation is required.',
      })
      .trim()
      .email('Please enter a valid email address.')
      .toLowerCase(),
  })
  .strict();

export type ApproveOrganisationRequestDto = z.infer<typeof approveOrganisationRequestSchema>;

export const rejectOrganisationRequestSchema = z
  .object({
    rejectionReason: z
      .string({
        required_error: 'Please enter a rejection reason.',
      })
      .trim()
      .min(1, 'Please enter a rejection reason.')
      .max(1000, 'Rejection reason must be at most 1000 characters.'),
  })
  .strict();

export type RejectOrganisationRequestDto = z.infer<typeof rejectOrganisationRequestSchema>;

export const organisationRequestIdParamsSchema = z
  .object({
    requestId: z.string().uuid('Request ID must be a valid UUID'),
  })
  .strict();

export type OrganisationRequestIdParamsDto = z.infer<typeof organisationRequestIdParamsSchema>;

export const platformOrganisationIdParamsSchema = z
  .object({
    organisationId: z.string().uuid('Organisation ID must be a valid UUID'),
  })
  .strict();

export type PlatformOrganisationIdParamsDto = z.infer<typeof platformOrganisationIdParamsSchema>;

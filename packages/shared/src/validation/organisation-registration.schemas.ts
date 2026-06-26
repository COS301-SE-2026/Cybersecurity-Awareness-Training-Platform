import { z } from 'zod';
import { requiredTrimmedStringSchema } from './common.schemas.js';

export const organisationSizeValues = ['SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE'] as const;

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

export const createOrganisationRegistrationRequestSchema = z
  .object({
    organisationName: requiredTrimmedStringSchema({
      requiredMessage: 'Please enter an organisation name.',
      maxLength: 200,
      maxMessage: 'Organisation name must be at most 200 characters.',
    }),
    organisationDescription: requiredTrimmedStringSchema({
      requiredMessage: 'Please enter an organisation description.',
      maxLength: 2000,
      maxMessage: 'Organisation description must be at most 2000 characters.',
    }),
    organisationSize: z.enum(organisationSizeValues, {
      required_error: 'Please select an organisation size.',
      invalid_type_error: 'Please select a valid organisation size.',
    }),
    organisationWebsiteUrl: websiteUrlSchema,
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

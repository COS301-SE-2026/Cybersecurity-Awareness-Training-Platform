import { z } from 'zod';

type TrimmedStringOptions = {
  requiredMessage: string;
  maxMessage: string;
  maxLength: number;
};

export const idParamSchema = z
  .string({
    required_error: 'Invalid identifier format.',
    invalid_type_error: 'Invalid identifier format.',
  })
  .trim()
  .uuid('Invalid identifier format.');

export function requiredTrimmedStringSchema({
  requiredMessage,
  maxMessage,
  maxLength,
}: TrimmedStringOptions) {
  return z
    .string({
      required_error: requiredMessage,
      invalid_type_error: requiredMessage,
    })
    .trim()
    .min(1, requiredMessage)
    .max(maxLength, maxMessage);
}

export function optionalTrimmedStringSchema(maxLength: number, maxMessage: string) {
  return z.string().trim().max(maxLength, maxMessage);
}

export const validationErrorDetailSchema = z.object({
  field: z.string().max(200, 'Field name must be at most 200 characters.'),
  message: z.string().max(2000, 'Validation message must be at most 2000 characters.'),
});

export const apiErrorResponseSchema = z.object({
  error: z.string().max(200, 'Error code must be at most 200 characters.'),
  message: z.string().max(2000, 'Error message must be at most 2000 characters.').optional(),
  fields: z.array(z.string().max(200, 'Field name must be at most 200 characters.')).optional(),
  details: z.array(validationErrorDetailSchema).optional(),
});

export const successResponseSchema = z.object({
  success: z.literal(true),
});

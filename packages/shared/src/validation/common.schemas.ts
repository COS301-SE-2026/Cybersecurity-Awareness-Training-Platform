import { z } from 'zod';

export const idParamSchema = z.string().uuid();

export const validationErrorDetailSchema = z.object({
  field: z.string(),
  message: z.string(),
});

export const apiErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  fields: z.array(z.string()).optional(),
  details: z.array(validationErrorDetailSchema).optional(),
});

export const successResponseSchema = z.object({
  success: z.literal(true),
});

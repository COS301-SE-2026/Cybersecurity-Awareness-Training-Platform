import { z } from 'zod';
import { requiredTrimmedStringSchema } from './common.schemas.js';

const emailSchema = z
  .string({
    required_error: 'Please enter an email address.',
    invalid_type_error: 'Please enter a valid email address.',
  })
  .trim()
  .min(1, 'Please enter an email address.')
  .max(254, 'Email address must be at most 254 characters.')
  .email('Please enter a valid email address.')
  .toLowerCase();

const firstNameSchema = requiredTrimmedStringSchema({
  requiredMessage: 'Please enter a first name.',
  maxLength: 100,
  maxMessage: 'First name must be at most 100 characters.',
});

const lastNameSchema = requiredTrimmedStringSchema({
  requiredMessage: 'Please enter a last name.',
  maxLength: 100,
  maxMessage: 'Last name must be at most 100 characters.',
});

const passwordSchema = z
  .string({
    required_error: 'Please enter a password.',
    invalid_type_error: 'Please enter a password.',
  })
  .min(12, 'Password must be at least 12 characters long')
  .max(128, 'Password must be at most 128 characters long')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(/[^\sA-Za-z0-9]/, 'Password must contain at least one special character');

function withPasswordConfirmation<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return schema
    .extend({
      password: passwordSchema,
      confirmPassword: z.string({
        required_error: 'Please confirm your password.',
        invalid_type_error: 'Please confirm your password.',
      }),
    })
    .strict()
    .superRefine((value, context) => {
      if (value.password !== value.confirmPassword) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['confirmPassword'],
          message: 'Password confirmation must match password.',
        });
      }
    });
}

export const authRegisterRequestSchema = z
  .object({
    email: emailSchema,
    firstName: firstNameSchema,
    lastName: lastNameSchema,
    password: passwordSchema,
  })
  .strict();

export const setupTokenParamsSchema = z
  .object({
    token: z
      .string()
      .min(32, 'Setup token is invalid.')
      .max(512, 'Setup token is invalid.')
      .regex(/^[A-Za-z0-9_-]+$/, 'Setup token is invalid.'),
  })
  .strict();

export const setupCompleteRequestSchema = withPasswordConfirmation(
  z.object({
    firstName: firstNameSchema,
    lastName: lastNameSchema,
  }),
);

export const authLoginRequestSchema = z
  .object({
    email: emailSchema,
    password: z
      .string({
        required_error: 'Please enter your password.',
        invalid_type_error: 'Please enter your password.',
      })
      .min(1, 'Please enter your password.')
      .max(128, 'Password must be at most 128 characters long.'),
    rememberMe: z.boolean().optional(),
  })
  .strict();

export const authResendVerificationRequestSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

export const authForgotPasswordRequestSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

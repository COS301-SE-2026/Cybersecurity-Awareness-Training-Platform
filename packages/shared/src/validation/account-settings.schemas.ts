import { z } from 'zod';
import { emailSchema, firstNameSchema, lastNameSchema, passwordSchema } from './auth.schemas.js';
import { idParamSchema } from './common.schemas.js';
import { ORGANISATION_SECURITY_SETTINGS_LIMITS } from './organisation-security-settings.schemas.js';

const tokenSchema = z
  .string({
    required_error: 'Token is required.',
    invalid_type_error: 'Token must be a string.',
  })
  .min(32, 'Token is invalid.')
  .max(512, 'Token is invalid.')
  .regex(/^[A-Za-z0-9_-]+$/, 'Token is invalid.');

const currentPasswordSchema = z
  .string({
    required_error: 'Please enter your current password.',
    invalid_type_error: 'Please enter your current password.',
  })
  .min(1, 'Please enter your current password.')
  .max(128, 'Password must be at most 128 characters long.');

function optionalNullableIntegerField(input: { fieldLabel: string; min: number; max: number }) {
  return z
    .number({
      invalid_type_error: `${input.fieldLabel} must be a number or null`,
    })
    .int(`${input.fieldLabel} must be a whole number`)
    .min(input.min, `${input.fieldLabel} must be at least ${input.min}`)
    .max(input.max, `${input.fieldLabel} must be at most ${input.max}`)
    .nullable()
    .optional();
}

export const accountProfileUpdateRequestSchema = z
  .object({
    firstName: firstNameSchema,
    lastName: lastNameSchema,
  })
  .strict();

export const accountChangeEmailRequestSchema = z
  .object({
    newEmail: emailSchema,
    confirmNewEmail: emailSchema,
    password: currentPasswordSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.newEmail !== value.confirmNewEmail) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmNewEmail'],
        message: 'Email confirmation must match new email.',
      });
    }
  });

export const accountVerifyEmailChangeRequestSchema = z
  .object({
    token: tokenSchema,
  })
  .strict();

export const accountChangePasswordRequestSchema = z
  .object({
    currentPassword: currentPasswordSchema,
    newPassword: passwordSchema,
    confirmNewPassword: z.string({
      required_error: 'Please confirm your password.',
      invalid_type_error: 'Please confirm your password.',
    }),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.newPassword !== value.confirmNewPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmNewPassword'],
        message: 'Password confirmation must match password.',
      });
    }
  });

export const accountSessionIdParamsSchema = z
  .object({
    sessionId: idParamSchema,
  })
  .strict();

export const accountSecurityPreferencesRequestSchema = z
  .object({
    preferredRegularSessionLengthHours: optionalNullableIntegerField({
      fieldLabel: 'Preferred regular session length hours',
      min: ORGANISATION_SECURITY_SETTINGS_LIMITS.regularSession.regularSessionLengthHours.min,
      max: ORGANISATION_SECURITY_SETTINGS_LIMITS.regularSession.regularSessionLengthHours.max,
    }),
    preferredRememberMeSessionLengthHours: optionalNullableIntegerField({
      fieldLabel: 'Preferred remember-me session length hours',
      min: ORGANISATION_SECURITY_SETTINGS_LIMITS.rememberMe.maxRememberedSessionHours.min,
      max: ORGANISATION_SECURITY_SETTINGS_LIMITS.rememberMe.maxRememberedSessionHours.max,
    }),
    preferredIdleTimeoutMinutes: optionalNullableIntegerField({
      fieldLabel: 'Preferred idle timeout minutes',
      min: ORGANISATION_SECURITY_SETTINGS_LIMITS.idleTimeout.idleTimeoutMinutes.min,
      max: ORGANISATION_SECURITY_SETTINGS_LIMITS.idleTimeout.idleTimeoutMinutes.max,
    }),
  })
  .strict();

export type AccountProfileUpdateRequestDto = z.infer<typeof accountProfileUpdateRequestSchema>;
export type AccountChangeEmailRequestDto = z.infer<typeof accountChangeEmailRequestSchema>;
export type AccountChangePasswordRequestDto = z.infer<typeof accountChangePasswordRequestSchema>;
export type AccountSessionIdParamsDto = z.infer<typeof accountSessionIdParamsSchema>;
export type AccountSecurityPreferencesRequestDto = z.infer<
  typeof accountSecurityPreferencesRequestSchema
>;

export const accountDeletionBlockedReasonSchema = z.enum([
  'PLATFORM_SELF_DELETION_NOT_SUPPORTED',
  'ORGANISATION_ADMIN_MANAGED',
  'ORGANISATION_TRAINEE_MANAGED',
  'SELF_DELETION_NOT_SUPPORTED',
]);

export type AccountDeletionBlockedReasonDto = z.infer<typeof accountDeletionBlockedReasonSchema>;

export const accountCapabilitiesResponseSchema = z.object({
  canEditProfile: z.boolean(),
  canRequestEmailChange: z.boolean(),
  canChangePassword: z.boolean(),
  canEditSecurityPreferences: z.boolean(),
  canDeleteAccount: z.boolean(),
  securityPreferenceEditable: z.object({
    preferredRegularSessionLengthHours: z.boolean(),
    preferredRememberMeSessionLengthHours: z.boolean(),
    preferredIdleTimeoutMinutes: z.boolean(),
  }),
  blockedReasons: z.object({
    emailChange: z.string().nullable(),
    securityPreferences: z.string().nullable(),
    preferredRegularSessionLengthHours: z.string().nullable(),
    preferredRememberMeSessionLengthHours: z.string().nullable(),
    preferredIdleTimeoutMinutes: z.string().nullable(),
    deleteAccount: accountDeletionBlockedReasonSchema.nullable(),
  }),
});

export type AccountCapabilitiesResponseDto = z.infer<typeof accountCapabilitiesResponseSchema>;

export const accountProfileResponseSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  userType: z.string(),
  authStatus: z.string(),
  emailVerified: z.boolean(),
  emailVerifiedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AccountProfileResponseDto = z.infer<typeof accountProfileResponseSchema>;

export const accountSecurityPreferencesResponseSchema = z.object({
  id: z.string().nullable(),
  preferredRegularSessionLengthHours: z.number().nullable(),
  preferredRememberMeSessionLengthHours: z.number().nullable(),
  preferredIdleTimeoutMinutes: z.number().nullable(),
  updatedAt: z.string().nullable(),
});

export type AccountSecurityPreferencesResponseDto = z.infer<
  typeof accountSecurityPreferencesResponseSchema
>;

export const accountPolicyResponseSchema = z.object({
  organisationId: z.string().nullable(),
  rememberMeRequested: z.boolean(),
  rememberMeAllowed: z.boolean(),
  rememberMeApplied: z.boolean(),
  regularSessionSeconds: z.number(),
  rememberedSessionSeconds: z.number(),
  effectiveSessionSeconds: z.number(),
  idleTimeoutMinutes: z.number().nullable(),
  requireReauthenticationForSensitiveActions: z.boolean(),
  allowEmailChange: z.boolean(),
  sources: z.record(z.string(), z.string()),
});

export type AccountPolicyResponseDto = z.infer<typeof accountPolicyResponseSchema>;

export const accountResponseSchema = z.object({
  profile: accountProfileResponseSchema,
  securityPreferences: accountSecurityPreferencesResponseSchema,
  effectivePolicy: accountPolicyResponseSchema,
  capabilities: accountCapabilitiesResponseSchema,
});

export type AccountResponseDto = z.infer<typeof accountResponseSchema>;

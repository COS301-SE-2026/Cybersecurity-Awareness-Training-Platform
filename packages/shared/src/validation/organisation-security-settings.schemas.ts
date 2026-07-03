import { z } from 'zod';
import type { OrganisationSecuritySettingsDto } from '../entities.js';

export const ORGANISATION_SECURITY_SETTINGS_LIMITS = {
  rememberMe: {
    maxRememberedSessionHours: {
      min: 1,
      max: 720,
      default: 168,
      options: [24, 72, 168, 336, 720],
    },
  },
  regularSession: {
    regularSessionLengthHours: {
      min: 1,
      max: 24,
      default: 8,
      options: [4, 8, 12, 24],
    },
  },
  idleTimeout: {
    idleTimeoutMinutes: {
      min: 5,
      max: 480,
      default: 30,
      options: [15, 30, 60, 120, 240, 480],
    },
  },
} as const;

export type OrganisationSecuritySettingsLimitsDto = typeof ORGANISATION_SECURITY_SETTINGS_LIMITS;

export type OrganisationSecuritySettingsReadOnlyReasonDto =
  | 'MISSING_PERMISSION'
  | 'ORGANISATION_SUSPENDED'
  | 'ORGANISATION_DISABLED'
  | null;

export type OrganisationSecuritySettingsChangesApplyDto = {
  rememberMePolicy: 'NEXT_REFRESH_OR_LOGIN';
  regularSessionLength: 'NEXT_REFRESH_OR_LOGIN';
  idleTimeout: 'NEXT_REFRESH';
  requireReauthenticationForSensitiveActions: 'IMMEDIATE_FOR_NEW_ACTIONS';
  allowTraineeEmailChange: 'IMMEDIATE_FOR_NEW_REQUESTS';
};

export type OrganisationSecuritySettingsCapabilitiesDto = {
  canView: boolean;
  canEdit: boolean;
  readOnlyReason: OrganisationSecuritySettingsReadOnlyReasonDto;
  changesApply: OrganisationSecuritySettingsChangesApplyDto;
};

export type OrganisationSecuritySettingsEffectivePolicyDto = {
  organisationId: string | null;
  rememberMeRequested: boolean;
  rememberMeAllowed: boolean;
  rememberMeApplied: boolean;
  regularSessionSeconds: number;
  rememberedSessionSeconds: number;
  effectiveSessionSeconds: number;
  idleTimeoutMinutes: number | null;
  requireReauthenticationForSensitiveActions: boolean;
  allowEmailChange: boolean;
};

export type OrganisationSecuritySettingsResponseDto = {
  organisationId: string;
  settings: OrganisationSecuritySettingsDto;
  effectivePolicy: OrganisationSecuritySettingsEffectivePolicyDto;
  platformLimits: OrganisationSecuritySettingsLimitsDto;
  capabilities: OrganisationSecuritySettingsCapabilitiesDto;
};

function nullableIntegerField(input: {
  fieldLabel: string;
  min: number;
  max: number;
}): z.ZodNullable<z.ZodNumber> {
  return z
    .number({
      invalid_type_error: `${input.fieldLabel} must be a number or null`,
    })
    .int(`${input.fieldLabel} must be a whole number`)
    .min(input.min, `${input.fieldLabel} must be at least ${input.min}`)
    .max(input.max, `${input.fieldLabel} must be at most ${input.max}`)
    .nullable();
}

const maxRememberedSessionHoursSchema = nullableIntegerField({
  fieldLabel: 'Maximum remembered session hours',
  min: ORGANISATION_SECURITY_SETTINGS_LIMITS.rememberMe.maxRememberedSessionHours.min,
  max: ORGANISATION_SECURITY_SETTINGS_LIMITS.rememberMe.maxRememberedSessionHours.max,
});

const regularSessionLengthHoursSchema = nullableIntegerField({
  fieldLabel: 'Regular session length hours',
  min: ORGANISATION_SECURITY_SETTINGS_LIMITS.regularSession.regularSessionLengthHours.min,
  max: ORGANISATION_SECURITY_SETTINGS_LIMITS.regularSession.regularSessionLengthHours.max,
});

const idleTimeoutMinutesSchema = nullableIntegerField({
  fieldLabel: 'Idle timeout minutes',
  min: ORGANISATION_SECURITY_SETTINGS_LIMITS.idleTimeout.idleTimeoutMinutes.min,
  max: ORGANISATION_SECURITY_SETTINGS_LIMITS.idleTimeout.idleTimeoutMinutes.max,
});

export const updateOrganisationSecuritySettingsRequestSchema = z
  .object({
    enforceRememberMePolicy: z.boolean({
      required_error: 'Remember-me policy enforcement is required',
      invalid_type_error: 'Remember-me policy enforcement must be true or false',
    }),
    allowRememberMe: z.boolean({
      required_error: 'Remember-me allowance is required',
      invalid_type_error: 'Remember-me allowance must be true or false',
    }),
    maxRememberedSessionHours: maxRememberedSessionHoursSchema,
    enforceRegularSessionLength: z.boolean({
      required_error: 'Regular session length enforcement is required',
      invalid_type_error: 'Regular session length enforcement must be true or false',
    }),
    regularSessionLengthHours: regularSessionLengthHoursSchema,
    enforceIdleTimeout: z.boolean({
      required_error: 'Idle timeout enforcement is required',
      invalid_type_error: 'Idle timeout enforcement must be true or false',
    }),
    idleTimeoutMinutes: idleTimeoutMinutesSchema,
    requireReauthenticationForSensitiveActions: z.boolean({
      required_error: 'Sensitive action reauthentication setting is required',
      invalid_type_error: 'Sensitive action reauthentication setting must be true or false',
    }),
    allowTraineeEmailChange: z.boolean({
      required_error: 'Trainee email-change setting is required',
      invalid_type_error: 'Trainee email-change setting must be true or false',
    }),
  })
  .strict()
  .superRefine((settings, context) => {
    if (
      settings.enforceRememberMePolicy &&
      settings.allowRememberMe &&
      settings.maxRememberedSessionHours === null
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maxRememberedSessionHours'],
        message: 'Maximum remembered session hours is required when remember-me is allowed',
      });
    }

    if (
      (!settings.enforceRememberMePolicy || !settings.allowRememberMe) &&
      settings.maxRememberedSessionHours !== null
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maxRememberedSessionHours'],
        message:
          'Maximum remembered session hours must be null when remember-me is not enforced or not allowed',
      });
    }

    if (settings.enforceRegularSessionLength && settings.regularSessionLengthHours === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['regularSessionLengthHours'],
        message: 'Regular session length hours is required when regular session length is enforced',
      });
    }

    if (!settings.enforceRegularSessionLength && settings.regularSessionLengthHours !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['regularSessionLengthHours'],
        message: 'Regular session length hours must be null when it is not enforced',
      });
    }

    if (settings.enforceIdleTimeout && settings.idleTimeoutMinutes === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['idleTimeoutMinutes'],
        message: 'Idle timeout minutes is required when idle timeout is enforced',
      });
    }

    if (!settings.enforceIdleTimeout && settings.idleTimeoutMinutes !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['idleTimeoutMinutes'],
        message: 'Idle timeout minutes must be null when idle timeout is not enforced',
      });
    }
  });

export type UpdateOrganisationSecuritySettingsRequestDto = z.infer<
  typeof updateOrganisationSecuritySettingsRequestSchema
>;

import { z } from 'zod';

/**
 * Strict validation schema for the invitation URL token parameter (`:token`).
 * Enforces minimum (32) and maximum (512) length constraints, as well as
 * URL-safe base64 string or UUID format (`^[A-Za-z0-9_-]+$`).
 */
export const invitationTokenParamsSchema = z
  .object({
    token: z
      .string({
        required_error: 'Invitation token is required.',
        invalid_type_error: 'Invitation token must be a string.',
      })
      .trim()
      .min(32, 'Invitation token must be at least 32 characters long.')
      .max(512, 'Invitation token must be at most 512 characters long.')
      .regex(
        /^[A-Za-z0-9_-]+$/,
        'Invitation token must be a valid UUID or URL-safe base64 string.',
      ),
  })
  .strict();

export type InvitationTokenParamsDto = z.infer<typeof invitationTokenParamsSchema>;

/**
 * Strict request body schema for accepting an invitation (`POST /invitations/token/:token/accept`).
 * Includes optional confirmation flags such as `confirmRoleChange`.
 * Uses `.strict()` to prevent payload pollution.
 */
export const invitationAcceptRequestSchema = z
  .object({
    confirmRoleChange: z.boolean().optional(),
  })
  .strict();

export type InvitationAcceptRequestDto = z.infer<typeof invitationAcceptRequestSchema>;

/**
 * Strict request body schema for rejecting an invitation (`POST /invitations/token/:token/reject`).
 * Accepts an optional `rejectionReason` string up to 255 characters for audit logging.
 * Uses `.strict()` to prevent payload pollution.
 */
export const invitationRejectRequestSchema = z
  .object({
    rejectionReason: z
      .string()
      .trim()
      .max(255, 'Rejection reason must be at most 255 characters.')
      .optional(),
  })
  .strict();

export type InvitationRejectRequestDto = z.infer<typeof invitationRejectRequestSchema>;

/**
 * Strict enum for supported invitation types.
 */
export const invitationTypeSchema = z.enum([
  'ORGANISATION_ADMIN',
  'ORGANISATION_TRAINEE',
  'PLATFORM_ADMIN',
  'IP_ADMIN',
  'GENERAL_TRAINEE',
  'INITIAL_ORGANISATION_ADMIN_SETUP',
  'ORGANISATION_ADMIN_PROMOTION',
]);

export type InvitationTypeDto = z.infer<typeof invitationTypeSchema>;

/**
 * Strict enum for exact system roles granted by an invitation.
 */
export const invitationRoleGrantedSchema = z.enum([
  'ORGANISATION_ADMIN',
  'ORGANISATION_TRAINEE',
  'PLATFORM_ADMIN',
  'IP_ADMIN',
  'GENERAL_TRAINEE',
  'SUPER_ADMIN',
  'NORMAL_ADMIN',
]);

export type InvitationRoleGrantedDto = z.infer<typeof invitationRoleGrantedSchema>;

/**
 * Strict enum reflecting database and token status for invitations.
 * Precedence/statuses encompass both database entity state (`InvitationStatus`)
 * and action token verification state (`ActionTokenState`).
 */
export const invitationContextStatusSchema = z.enum([
  'PENDING',
  'SENT',
  'ACCEPTED',
  'COMPLETED',
  'EXPIRED',
  'REVOKED',
  'REJECTED',
  'FAILED_TO_SEND',
  'USED',
  'VALID',
  'INVALID',
]);

export type InvitationContextStatusDto = z.infer<typeof invitationContextStatusSchema>;

export const invitationRequiredActionSchema = z.enum([
  'CONTINUE_SETUP',
  'LOGIN_REQUIRED',
  'SWITCH_ACCOUNT',
  'CONFIRM_ROLE_CHANGE',
  'ROLE_CONFLICT',
  'INVITATION_UNAVAILABLE',
  'TOKEN_UNAVAILABLE',
]);

export type InvitationRequiredActionDto = z.infer<typeof invitationRequiredActionSchema>;

export const invitationContextResponseSchema = z
  .object({
    requiredAction: invitationRequiredActionSchema,
    rejectAllowed: z.boolean(),
    status: invitationContextStatusSchema,
    expiresAt: z
      .string()
      .datetime({ message: 'expiresAt must be a valid ISO 8601 Date string' })
      .optional(),
    invitationType: invitationTypeSchema.optional(),
    organisationId: z.string().uuid('Organisation ID must be a valid UUID').optional(),
    organisationName: z.string().trim().min(1, 'Organisation name is required').optional(),
    roleGranted: invitationRoleGrantedSchema.optional(),
    permissions: z.array(z.string()).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.requiredAction === 'CONFIRM_ROLE_CHANGE') {
      const isOrgScoped =
        data.invitationType === 'ORGANISATION_ADMIN' ||
        data.invitationType === 'ORGANISATION_TRAINEE' ||
        data.invitationType === 'INITIAL_ORGANISATION_ADMIN_SETUP' ||
        data.invitationType === 'ORGANISATION_ADMIN_PROMOTION';

      if (isOrgScoped) {
        if (!data.organisationId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['organisationId'],
            message:
              'organisationId must be present for CONFIRM_ROLE_CHANGE if invitationType is organisation-scoped.',
          });
        }
        if (!data.organisationName) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['organisationName'],
            message:
              'organisationName must be present for CONFIRM_ROLE_CHANGE if invitationType is organisation-scoped.',
          });
        }
      }
    }
  });

export type InvitationContextResponseDto = z.infer<typeof invitationContextResponseSchema>;

/**
 * Detailed response schema for `POST /invitations/token/:token/accept`.
 */
export const invitationAcceptResponseSchema = z
  .object({
    success: z.literal(true),
    message: z.string().trim().min(1).optional(),
    redirectTo: z.string().trim().min(1).optional(),
    roleGranted: invitationRoleGrantedSchema.optional(),
    organisationId: z.string().uuid().optional(),
  })
  .strict();

export type InvitationAcceptResponseDto = z.infer<typeof invitationAcceptResponseSchema>;

/**
 * Detailed response schema for `POST /invitations/token/:token/reject`.
 */
export const invitationRejectResponseSchema = z
  .object({
    success: z.literal(true),
    message: z.string().trim().min(1).optional(),
  })
  .strict();

export type InvitationRejectResponseDto = z.infer<typeof invitationRejectResponseSchema>;

/**
 * Strict URL parameter schema for actions targeting an existing invitation by its database ID (`:invitationId`).
 * Applicable to `POST /invitations/:invitationId/resend` and `POST /invitations/:invitationId/revoke`.
 */
export const invitationIdParamsSchema = z
  .object({
    invitationId: z
      .string({
        required_error: 'Invitation ID is required.',
        invalid_type_error: 'Invitation ID must be a string.',
      })
      .uuid('Invitation ID must be a valid UUID.'),
  })
  .strict();

export type InvitationIdParamsDto = z.infer<typeof invitationIdParamsSchema>;

/**
 * Standardized success response schema for invitation actions (resend, revoke).
 * Enforces strict structure without leaking any raw tokens or internal sensitive state.
 */
export const invitationActionResponseSchema = z
  .object({
    success: z.literal(true),
    message: z.string().trim().min(1),
    invitationId: z.string().uuid(),
    status: z.enum(['PENDING', 'SENT', 'REVOKED', 'EXPIRED', 'FAILED_TO_SEND']),
  })
  .strict();

export type InvitationActionResponseDto = z.infer<typeof invitationActionResponseSchema>;

/**
 * Standardized success response schema specifically for `POST /invitations/:invitationId/resend`.
 */
export const invitationResendResponseSchema = z
  .object({
    success: z.literal(true),
    message: z.string().trim().min(1),
    invitationId: z.string().uuid(),
    status: z.enum(['PENDING', 'SENT', 'FAILED_TO_SEND']),
    resentAt: z.string().datetime(),
  })
  .strict();

export type InvitationResendResponseDto = z.infer<typeof invitationResendResponseSchema>;

/**
 * Standardized success response schema specifically for `POST /invitations/:invitationId/revoke`.
 */
export const invitationRevokeResponseSchema = z
  .object({
    success: z.literal(true),
    message: z.string().trim().min(1),
    invitationId: z.string().uuid(),
    status: z.literal('REVOKED'),
    revokedAt: z.string().datetime(),
  })
  .strict();

export type InvitationRevokeResponseDto = z.infer<typeof invitationRevokeResponseSchema>;

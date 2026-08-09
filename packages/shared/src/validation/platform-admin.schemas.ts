import { z } from 'zod';
import { idParamSchema } from './common.schemas.js';
import { emailSchema, firstNameSchema, lastNameSchema } from './auth.schemas.js';

const platformAdminRoleResponseSchema = z.union([
  z.enum(['SUPER_ADMIN', 'NORMAL_ADMIN']),
  z.string(),
]);

const platformAdminStatusResponseSchema = z.union([z.enum(['ACTIVE', 'DISABLED']), z.string()]);

const platformAdminAuthStatusResponseSchema = z.union([
  z.enum(['PENDING_EMAIL_VERIFICATION', 'PENDING_INVITE_SETUP', 'ACTIVE', 'DISABLED']),
  z.string(),
]);

const platformAdminInvitationStatusResponseSchema = z.union([
  z.enum([
    'PENDING',
    'SENT',
    'FAILED_TO_SEND',
    'ACCEPTED',
    'COMPLETED',
    'EXPIRED',
    'REVOKED',
    'REJECTED',
    'PENDING_UPGRADE',
  ]),
  z.string(),
]);

export const platformAdminAllowedActionSchema = z
  .object({
    canTransferSuperAdmin: z.boolean(),
    canDemote: z.boolean(),
    canResendInvite: z.boolean(),
  })
  .strict();

export type PlatformAdminAllowedActionDto = z.infer<typeof platformAdminAllowedActionSchema>;

export const platformAdminListItemSchema = z
  .object({
    id: idParamSchema,
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email(),
    platformAdminRole: platformAdminRoleResponseSchema,
    adminStatus: platformAdminStatusResponseSchema,
    authStatus: platformAdminAuthStatusResponseSchema,
    invitationStatus: platformAdminInvitationStatusResponseSchema.nullable(),
    inviteId: idParamSchema.nullable(),
    allowedActions: platformAdminAllowedActionSchema,
  })
  .strict();

export type PlatformAdminListItemDto = z.infer<typeof platformAdminListItemSchema>;

export const platformAdminListResponseSchema = z
  .object({
    admins: z.array(platformAdminListItemSchema),
    allowedToInvite: z.boolean(),
    allowedToTransfer: z.boolean(),
    allowedToDemote: z.boolean(),
    allowedToResendInvites: z.boolean(),
  })
  .strict();

export type PlatformAdminListResponseDto = z.infer<typeof platformAdminListResponseSchema>;

export const invitePlatformAdminResponseSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('new-invite'),
      userId: idParamSchema,
      email: z.string().email(),
    })
    .strict(),
  z
    .object({
      type: z.literal('upgrade-confirmation'),
      userId: idParamSchema,
      email: z.string().email(),
    })
    .strict(),
]);

export type InvitePlatformAdminResponseDto = z.infer<typeof invitePlatformAdminResponseSchema>;

export const resendPlatformAdminInviteResponseSchema = z
  .object({
    success: z.literal(true),
    emailQueued: z.boolean(),
  })
  .strict();

export type ResendPlatformAdminInviteResponseDto = z.infer<
  typeof resendPlatformAdminInviteResponseSchema
>;

export const demotePlatformAdminResponseSchema = z
  .object({
    userId: idParamSchema,
    email: z.string().email(),
    adminStatus: z.literal('DISABLED'),
    authStatus: platformAdminAuthStatusResponseSchema,
  })
  .strict();

export type DemotePlatformAdminResponseDto = z.infer<typeof demotePlatformAdminResponseSchema>;

// Shcema for path params when modifying a platfrom admin user
export const platformAdminUserIdParamsSchema = z.object({
  userId: idParamSchema,
});

export type PlatformAdminUserIdParamsDto = z.infer<typeof platformAdminUserIdParamsSchema>;

// Schema for path params when resending platform admin invite
export const platformAdminInviteIdParamsSchema = z.object({
  id: idParamSchema,
});

export type PlatformAdminInviteIdParamsDto = z.infer<typeof platformAdminInviteIdParamsSchema>;

// Request payload for inviting a new platfrom admin
export const invitePlatformAdminRequestSchema = z
  .object({
    email: emailSchema,
    firstName: firstNameSchema.optional(),
    lastName: lastNameSchema.optional(),
    confirmUpgrade: z.boolean().optional(),
  })
  .strict();

export type InvitePlatformAdminRequestDto = z.infer<typeof invitePlatformAdminRequestSchema>;

// Transfering super admin role to another user
export const transferSuperAdminRequestSchema = z
  .object({
    targetUserId: idParamSchema,
    password: z.string().min(1, 'Password is required'),
    confirmation: z.literal('TRANSFER', {
      errorMap: () => ({ message: 'Confirmation must be TRANSFER' }),
    }),
  })
  .strict();

export type TransferSuperAdminRequestDto = z.infer<typeof transferSuperAdminRequestSchema>;

// Demoting a platfrom admin to normal trainee status or user type
export const demotePlatformAdminRequestSchema = z
  .object({
    password: z.string().min(1, 'Password is required'),
    confirmation: z.literal('DEMOTE', {
      errorMap: () => ({ message: 'Confirmation must be DEMOTE' }),
    }),
  })
  .strict();

export type DemotePlatformAdminRequestDto = z.infer<typeof demotePlatformAdminRequestSchema>;

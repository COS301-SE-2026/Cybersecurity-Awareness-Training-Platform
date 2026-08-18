import { z } from 'zod';
import { idParamSchema } from './common.schemas.js';
import { emailSchema, firstNameSchema, lastNameSchema } from './auth.schemas.js';

export const platformAdminRoleSchema = z.enum(['SUPER_ADMIN', 'NORMAL_ADMIN']);
export type PlatformAdminRole = z.infer<typeof platformAdminRoleSchema>;

export const platformAdminStatusSchema = z.enum(['ACTIVE', 'DISABLED']);
export type PlatformAdminStatus = z.infer<typeof platformAdminStatusSchema>;

export const platformAdminInvitationStatusSchema = z.enum([
  'PENDING',
  'SENT',
  'FAILED_TO_SEND',
  'ACCEPTED',
  'COMPLETED',
  'EXPIRED',
  'REVOKED',
  'REJECTED',
  'PENDING_UPGRADE',
]);
export type PlatformAdminInvitationStatus = z.infer<typeof platformAdminInvitationStatusSchema>;

export const platformAdminAllowedActionsSchema = z
  .object({
    canTransferSuperAdmin: z.boolean(),
    canDemote: z.boolean(),
    canResendInvite: z.boolean(),
  })
  .strict();
export type PlatformAdminAllowedActionsDto = z.infer<typeof platformAdminAllowedActionsSchema>;

export const platformAdminRowSchema = z
  .object({
    id: idParamSchema,
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email(),
    platformAdminRole: platformAdminRoleSchema,
    adminStatus: platformAdminStatusSchema,
    authStatus: z.string(),
    invitationStatus: platformAdminInvitationStatusSchema.nullable(),
    inviteId: idParamSchema.nullable(),
    allowedActions: platformAdminAllowedActionsSchema,
  })
  .strict();
export type PlatformAdminRowDto = z.infer<typeof platformAdminRowSchema>;

export const listPlatformAdminsResponseSchema = z
  .object({
    admins: z.array(platformAdminRowSchema),
    allowedToInvite: z.boolean(),
    allowedToTransfer: z.boolean(),
    allowedToDemote: z.boolean(),
    allowedToResendInvites: z.boolean(),
  })
  .strict();
export type ListPlatformAdminsResponseDto = z.infer<typeof listPlatformAdminsResponseSchema>;

export const platformAdminUserIdParamsSchema = z.object({
  userId: idParamSchema,
});
export type PlatformAdminUserIdParamsDto = z.infer<typeof platformAdminUserIdParamsSchema>;

export const platformAdminInviteIdParamsSchema = z.object({
  id: idParamSchema,
});
export type PlatformAdminInviteIdParamsDto = z.infer<typeof platformAdminInviteIdParamsSchema>;

export const invitePlatformAdminRequestSchema = z
  .object({
    email: emailSchema,
    firstName: firstNameSchema.optional(),
    lastName: lastNameSchema.optional(),
    confirmUpgrade: z.boolean().optional(),
  })
  .strict();
export type InvitePlatformAdminRequestDto = z.infer<typeof invitePlatformAdminRequestSchema>;

export const invitePlatformAdminResponseSchema = z
  .object({
    type: z.enum(['new-invite', 'upgrade-confirmation']),
    userId: idParamSchema,
    email: z.string().email(),
  })
  .strict();
export type InvitePlatformAdminResponseDto = z.infer<typeof invitePlatformAdminResponseSchema>;

export const resendPlatformAdminInviteResponseSchema = z
  .object({
    success: z.boolean(),
    emailQueued: z.boolean(),
  })
  .strict();
export type ResendPlatformAdminInviteResponseDto = z.infer<
  typeof resendPlatformAdminInviteResponseSchema
>;

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

export const demotePlatformAdminRequestSchema = z
  .object({
    password: z.string().min(1, 'Password is required'),
    confirmation: z.literal('DEMOTE', {
      errorMap: () => ({ message: 'Confirmation must be DEMOTE' }),
    }),
  })
  .strict();
export type DemotePlatformAdminRequestDto = z.infer<typeof demotePlatformAdminRequestSchema>;

export const demotePlatformAdminResponseSchema = z
  .object({
    userId: idParamSchema,
    email: z.string().email(),
    adminStatus: z.literal('DISABLED'),
    authStatus: z.string(),
  })
  .strict();
export type DemotePlatformAdminResponseDto = z.infer<typeof demotePlatformAdminResponseSchema>;

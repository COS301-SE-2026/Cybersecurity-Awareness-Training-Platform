import { z } from 'zod';
import { idParamSchema } from './common.schemas.js';
import { emailSchema, firstNameSchema, lastNameSchema } from './auth.schemas.js';

export const platformAdminRoleSchema = z.enum(['SUPER_ADMIN', 'NORMAL_ADMIN']);
export type PlatformAdminRole = z.infer<typeof platformAdminRoleSchema>;
const platformAdminRoleResponseSchema = z.union([platformAdminRoleSchema, z.string()]);
export const platformAdminStatusSchema = z.enum(['ACTIVE', 'DISABLED']);
export type PlatformAdminStatus = z.infer<typeof platformAdminStatusSchema>;
const platformAdminStatusResponseSchema = z.union([platformAdminStatusSchema, z.string()]);

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
const platformAdminInvitationStatusResponseSchema = z.union([
  platformAdminInvitationStatusSchema,
  z.string(),
]);

export const authStatusSchema = z.enum([
  'PENDING_EMAIL_VERIFICATION',
  'PENDING_INVITE_SETUP',
  'ACTIVE',
  'DISABLED',
]);
export type AuthStatus = z.infer<typeof authStatusSchema>;
const platformAdminAuthStatusResponseSchema = z.union([authStatusSchema, z.string()]);

export const platformAdminAllowedActionSchema = z
  .object({
    canTransferSuperAdmin: z.boolean(),
    canDemote: z.boolean(),
    canResendInvite: z.boolean(),
  })
  .strict();
export type PlatformAdminAllowedActionDto = z.infer<typeof platformAdminAllowedActionSchema>;

export const platformAdminAllowedActionsSchema = platformAdminAllowedActionSchema;
export type PlatformAdminAllowedActionsDto = PlatformAdminAllowedActionDto;

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
export const platformAdminRowSchema = platformAdminListItemSchema;
export type PlatformAdminRowDto = PlatformAdminListItemDto;

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
export const listPlatformAdminsResponseSchema = platformAdminListResponseSchema;
export type ListPlatformAdminsResponseDto = PlatformAdminListResponseDto;

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
    authStatus: platformAdminAuthStatusResponseSchema,
  })
  .strict();
export type DemotePlatformAdminResponseDto = z.infer<typeof demotePlatformAdminResponseSchema>;

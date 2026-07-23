import { z } from 'zod';
import { idParamSchema } from './common.schemas.js';
import { emailSchema, firstNameSchema, lastNameSchema } from './auth.schemas.js';

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

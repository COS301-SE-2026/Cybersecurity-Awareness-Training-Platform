import { z } from 'zod';

// Shcema for path params when modifying a platform admin user
export const platformAdminUserIdParamsSchema = z.object({
  userId: z.string().uuid('User ID must be a valid UUID'),
});

export type PlatformAdminUserIdParamsDto = z.infer<typeof platformAdminUserIdParamsSchema>;

// Schema for path params when resending platform admin invite
export const platformAdminInviteIdParamsSchema = z.object({
  id: z.string().uuid('Invitation ID must be a valid UUID'),
});

export type PlatformAdminInviteIdParamsDto = z.infer<typeof platformAdminInviteIdParamsSchema>;

// Request payload for inviting a new platfrom admin
export const invitePlatformAdminRequestSchema = z
  .object({
    email: z
      .string({
        required_error: 'Email is required',
        invalid_type_error: 'Email must be a string',
      })
      .trim()
      .min(1, 'Email is required')
      .max(254, 'Email must be at most 254 characters')
      .email('Please enter a valid email address')
      .toLowerCase(),
    firstName: z.string().trim().max(100, 'First name must be at most 100 characters').optional(),
    lastName: z.string().trim().max(100, 'Last name must be at most 100 characters').optional(),
  })
  .strict();

export type InvitePlatformAdminRequestDto = z.infer<typeof invitePlatformAdminRequestSchema>;

// Transfering super admin role to another user
export const transferSuperAdminRequestSchema = z
  .object({
    targetUserId: z.string().uuid('Target user ID must be a valid UUID'),
    password: z.string().min(1, 'Password is required'),
    confirmation: z.literal('TRANSFER', {
      errorMap: () => ({ message: 'Confirmation must be TRANSFER' }),
    }),
  })
  .strict();

export type TransferSuperAdminRequestDto = z.infer<typeof transferSuperAdminRequestSchema>;

// Demoting a platform admin to normal trainee status or user type
export const demotePlatformAdminRequestSchema = z
  .object({
    password: z.string().min(1, 'Password is required'),
    confirmation: z.literal('DEMOTE', {
      errorMap: () => ({ message: 'Confirmation must be DEMOTE' }),
    }),
  })
  .strict();

export type DemotePlatformAdminRequestDto = z.infer<typeof demotePlatformAdminRequestSchema>;

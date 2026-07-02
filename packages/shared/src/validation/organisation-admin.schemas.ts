import { z } from 'zod';

const permissionKeysSchema = z
  .array(z.string().trim().min(1, 'Permission key is required'))
  .min(1, 'At least one permission key is required')
  .transform((keys) => Array.from(new Set(keys)));

export const organisationIdParamsSchema = z.object({
  organisationId: z.string().uuid('Organisation ID must be a valid UUID'),
});

export const organisationAdminIdParamsSchema = organisationIdParamsSchema.extend({
  adminId: z.string().uuid('Organisation admin ID must be a valid UUID'),
});

export const organisationAdminPromotionRequestSchema = z.object({
  traineeEmail: z.string().trim().email('Trainee email must be valid').toLowerCase(),
  permissionKeys: permissionKeysSchema,
});

export const organisationAdminPermissionUpdateRequestSchema = z.object({
  permissionKeys: permissionKeysSchema,
});

export const organisationAdminRemoveRequestSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  confirmation: z.literal('REMOVE'),
});

export type OrganisationAdminPromotionRequestDto = z.infer<
  typeof organisationAdminPromotionRequestSchema
>;

export type OrganisationAdminPermissionUpdateRequestDto = z.infer<
  typeof organisationAdminPermissionUpdateRequestSchema
>;

export type OrganisationAdminRemoveRequestDto = z.infer<
  typeof organisationAdminRemoveRequestSchema
>;

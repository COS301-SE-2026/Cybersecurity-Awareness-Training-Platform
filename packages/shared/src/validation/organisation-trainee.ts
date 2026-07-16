import { z } from 'zod';

export const organisationTraineesParamsSchema = z
  .object({
    organisationId: z
      .string({
        required_error: 'Organisation ID is required.',
        invalid_type_error: 'Organisation ID must be a string.',
      })
      .uuid('Organisation ID must be a valid UUID.'),
  })
  .strict();

export type OrganisationTraineesParamsDto = z.infer<typeof organisationTraineesParamsSchema>;

export const organisationTraineeParamsSchema = z
  .object({
    organisationId: z
      .string({
        required_error: 'Organisation ID is required.',
        invalid_type_error: 'Organisation ID must be a string.',
      })
      .uuid('Organisation ID must be a valid UUID.'),
    traineeId: z
      .string({
        required_error: 'Trainee ID is required.',
        invalid_type_error: 'Trainee ID must be a string.',
      })
      .uuid('Trainee ID must be a valid UUID.'),
  })
  .strict();

export type OrganisationTraineeParamsDto = z.infer<typeof organisationTraineeParamsSchema>;

export const createTraineeInvitationRequestSchema = z
  .object({
    email: z
      .string({
        required_error: 'Email address is required.',
        invalid_type_error: 'Email address must be a string.',
      })
      .trim()
      .min(1, 'Email address is required.')
      .max(254, 'Email address must be at most 254 characters.')
      .email('Invalid email format.')
      .toLowerCase(),
    firstName: z.string().trim().max(100, 'First name must be at most 100 characters.').optional(),
    lastName: z.string().trim().max(100, 'Last name must be at most 100 characters.').optional(),
  })
  .strict();

export type CreateTraineeInvitationRequestDto = z.infer<
  typeof createTraineeInvitationRequestSchema
>;

export const disableTraineeRequestSchema = z
  .object({
    password: z
      .string({
        required_error: 'Admin password is required to confirm identity for trainee disablement.',
        invalid_type_error: 'Admin password must be a string.',
      })
      .min(1, 'Admin password is required to confirm identity for trainee disablement.'),
    confirmation: z.literal(true, {
      errorMap: () => ({
        message: 'Confirmation must be explicitly set to true to disable this trainee account.',
      }),
    }),
    disabledReason: z
      .string()
      .trim()
      .max(500, 'Disabled reason must be at most 500 characters.')
      .nullish(),
  })
  .strict();

export type DisableTraineeRequestDto = z.infer<typeof disableTraineeRequestSchema>;

export const traineeStatusSchema = z.enum([
  'ACTIVE',
  'DISABLED',
  'INVITE_PENDING',
  'INVITE_FAILED',
]);

// Do not export TraineeStatusDto here to avoid conflict with entities.ts
// Or use a different name if needed, but for now we just omit it since it's conflicting.

const eligibilitySchema = z.object({
  canResend: z.boolean(),
  canRevoke: z.boolean(),
  canDisable: z.boolean(),
  canPromote: z.boolean(),
  resendCooldownSeconds: z.number(),
});

export const activeTraineeRowSchema = z
  .object({
    id: z.string().uuid().optional(),
    rowType: z.literal('ACTIVE_TRAINEE').optional(),
    type: z.literal('ACTIVE_TRAINEE').optional(),
    traineeProfileId: z.string().uuid().optional(),
    userId: z.string().uuid().optional(),
    invitationId: z.string().uuid().optional(),
    invitationStatus: z.string().nullable().optional(),
    email: z.string().email(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    status: z.union([traineeStatusSchema, z.string()]),
    createdAt: z.string().datetime().optional(),
    joinedAt: z.string().datetime().nullable().optional(),
    invitedAt: z.string().datetime().nullable().optional(),
    disabledAt: z.string().datetime().nullable().optional(),
    disabledReason: z.string().nullable().optional(),
    expiresAt: z.string().datetime().nullable().optional(),
    invitationExpiresAt: z.string().datetime().nullable().optional(),
    emailDeliveryStatus: z.string().nullable().optional(),
    deliveryState: z.string().nullable().optional(),
    requiredAction: z.string().nullable().optional(),
    requiredActions: z.array(z.string()).optional(),
    eligibility: eligibilitySchema.optional(),
  })
  .strict();

export const invitationTraineeRowSchema = z
  .object({
    id: z.string().uuid().optional(),
    rowType: z.literal('INVITATION'),
    type: z.literal('INVITATION').optional(),
    traineeProfileId: z.string().uuid().optional(),
    userId: z.string().uuid().optional(),
    invitationId: z.string().uuid().optional(),
    invitationStatus: z.string().nullable().optional(),
    email: z.string().email(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    status: z.union([traineeStatusSchema, z.string()]),
    createdAt: z.string().datetime().optional(),
    joinedAt: z.string().datetime().nullable().optional(),
    invitedAt: z.string().datetime().nullable().optional(),
    disabledAt: z.string().datetime().nullable().optional(),
    disabledReason: z.string().nullable().optional(),
    expiresAt: z.string().datetime().nullable().optional(),
    invitationExpiresAt: z.string().datetime().nullable().optional(),
    emailDeliveryStatus: z.string().nullable().optional(),
    deliveryState: z.string().nullable().optional(),
    requiredAction: z.string().nullable().optional(),
    requiredActions: z.array(z.string()).optional(),
    eligibility: eligibilitySchema.optional(),
  })
  .strict();

export const traineeListItemSchema = z.union([activeTraineeRowSchema, invitationTraineeRowSchema]);

export type TraineeListItemDto =
  | z.infer<typeof activeTraineeRowSchema>
  | z.infer<typeof invitationTraineeRowSchema>;

export const traineeListResponseSchema = z
  .object({
    trainees: z.array(traineeListItemSchema),
    pendingInvitations: z.array(traineeListItemSchema),
  })
  .strict();

export type TraineeListResponseDto = z.infer<typeof traineeListResponseSchema>;

export const disableTraineeResponseSchema = z
  .object({
    success: z.literal(true),
    message: z.string().trim().min(1),
    traineeId: z.string().uuid().optional(),
    status: z.literal('DISABLED').optional(),
  })
  .strict();

export type DisableTraineeResponseDto = z.infer<typeof disableTraineeResponseSchema>;

export const createTraineeInvitationResponseSchema = z
  .object({
    success: z.literal(true),
    message: z.string().trim().min(1),
    invitation: z
      .object({
        id: z.string().uuid(),
        email: z.string().email(),
        firstName: z.string().nullable().optional(),
        lastName: z.string().nullable().optional(),
        status: z.string(),
        createdAt: z.string().datetime().optional(),
        expiresAt: z.string().datetime().optional(),
        eligibility: z
          .object({
            canResend: z.boolean().optional(),
            canRevoke: z.boolean().optional(),
            canDisable: z.boolean().optional(),
            canPromote: z.boolean().optional(),
          })
          .optional(),
      })
      .optional(),
  })
  .strict();

export type CreateTraineeInvitationResponseDto = z.infer<
  typeof createTraineeInvitationResponseSchema
>;

export const traineeActionUnavailableErrorSchema = z
  .object({
    error: z.literal('TRAINEE_ACTION_UNAVAILABLE'),
    message: z.string().trim().min(1),
  })
  .strict();

export type TraineeActionUnavailableErrorDto = z.infer<typeof traineeActionUnavailableErrorSchema>;

export const organisationInvitationParamsSchema = z
  .object({
    organisationId: z
      .string({
        required_error: 'Organisation ID is required.',
        invalid_type_error: 'Organisation ID must be a string.',
      })
      .uuid('Organisation ID must be a valid UUID.'),
    invitationId: z
      .string({
        required_error: 'Invitation ID is required.',
        invalid_type_error: 'Invitation ID must be a string.',
      })
      .uuid('Invitation ID must be a valid UUID.'),
  })
  .strict();

export type OrganisationInvitationParamsDto = z.infer<typeof organisationInvitationParamsSchema>;

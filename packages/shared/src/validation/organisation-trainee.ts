import { z } from 'zod';
import {
  INVITATION_ACTION_UNAVAILABLE_REASON_CODES,
  INVITATION_MANAGEMENT_STATUSES,
} from '../invitation-state-policy.js';

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

export const reenableTraineeRequestSchema = z
  .object({
    password: z
      .string({
        required_error: 'Admin password is required to confirm identity for trainee re-enablement.',
        invalid_type_error: 'Admin password must be a string.',
      })
      .min(1, 'Admin password is required to confirm identity for trainee re-enablement.'),
    confirmation: z.literal(true, {
      errorMap: () => ({
        message: 'Confirmation must be explicitly set to true to re-enable this trainee account.',
      }),
    }),
  })
  .strict();

export type ReenableTraineeRequestDto = z.infer<typeof reenableTraineeRequestSchema>;

export const traineeStatusSchema = z.enum([
  'ACTIVE',
  'DISABLED',
  'INVITE_PENDING',
  'INVITE_FAILED',
  'INVITE_EXPIRED',
  'INVITE_REJECTED',
  'INVITE_REVOKED',
  'INVITE_ACCEPTED',
  'INVITE_COMPLETED',
  'ACCEPTED',
  'REVOKED',
  'EXPIRED',
  'REJECTED',
  'COMPLETED',
]);

export const invitationLifecycleStateSchema = z.enum([
  'PENDING',
  'SENT',
  'FAILED_TO_SEND',
  'ACCEPTED',
  'COMPLETED',
  'EXPIRED',
  'REVOKED',
  'REJECTED',
]);

export const invitationManagementStatusSchema = z.enum(INVITATION_MANAGEMENT_STATUSES);

export const invitationDeliveryStateSchema = z.enum(['PENDING', 'SENT', 'FAILED', 'UNKNOWN']);

export const invitationEligibilityReasonCodeSchema = z.enum(
  INVITATION_ACTION_UNAVAILABLE_REASON_CODES,
);

export const eligibilitySchema = z.object({
  canResend: z.boolean(),
  canRevoke: z.boolean(),
  canDisable: z.boolean(),
  canReenable: z.boolean(),
  canPromote: z.boolean(),
  resendCooldownSeconds: z.number(),
  resendDisabledReason: z.string().nullable().optional(),
  resendDisabledReasonCode: invitationEligibilityReasonCodeSchema.nullable().optional(),
  revokeDisabledReason: z.string().nullable().optional(),
  revokeDisabledReasonCode: invitationEligibilityReasonCodeSchema.nullable().optional(),
  disableDisabledReason: z.string().nullable().optional(),
  disableDisabledReasonCode: invitationEligibilityReasonCodeSchema.nullable().optional(),
  reenableUnavailableReason: z.string().nullable().optional(),
  promoteDisabledReason: z.string().nullable().optional(),
  promoteDisabledReasonCode: invitationEligibilityReasonCodeSchema.nullable().optional(),
});

export const activeTraineeRowSchema = z
  .object({
    id: z.string().uuid(),
    rowType: z.literal('ACTIVE_TRAINEE'),
    type: z.literal('ACTIVE_TRAINEE'),
    traineeProfileId: z.string().uuid(),
    userId: z.string().uuid(),
    invitationId: z.null(),
    invitationStatus: z.null(),
    invitationLifecycleState: z.null(),
    email: z.string().email(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    status: z.union([traineeStatusSchema, z.string()]),
    createdAt: z.string().datetime(),
    joinedAt: z.string().datetime().nullable(),
    invitedAt: z.null(),
    disabledAt: z.string().datetime().nullable(),
    disabledReason: z.string().nullable(),
    expiresAt: z.null(),
    invitationExpiresAt: z.null(),
    emailDeliveryStatus: invitationDeliveryStateSchema,
    deliveryState: invitationDeliveryStateSchema,
    requiredAction: z.literal('NONE'),
    requiredActions: z.array(z.literal('NONE')),
    eligibility: eligibilitySchema,
  })
  .strict();

export const invitationTraineeRowSchema = z
  .object({
    id: z.string().uuid(),
    rowType: z.literal('INVITATION'),
    type: z.literal('INVITATION'),
    traineeProfileId: z.null(),
    userId: z.null(),
    invitationId: z.string().uuid(),
    invitationStatus: invitationLifecycleStateSchema,
    email: z.string().email(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    status: z.union([traineeStatusSchema, z.string()]),
    createdAt: z.string().datetime(),
    joinedAt: z.null(),
    invitedAt: z.string().datetime(),
    disabledAt: z.null(),
    disabledReason: z.null(),
    expiresAt: z.string().datetime(),
    invitationExpiresAt: z.string().datetime(),
    emailDeliveryStatus: invitationDeliveryStateSchema,
    deliveryState: invitationDeliveryStateSchema,
    invitationLifecycleState: invitationLifecycleStateSchema,
    requiredAction: z.literal('CONTINUE_SETUP'),
    requiredActions: z.array(z.literal('CONTINUE_SETUP')),
    eligibility: eligibilitySchema,
  })
  .strict();

export const traineeListItemSchema = z.discriminatedUnion('rowType', [
  activeTraineeRowSchema,
  invitationTraineeRowSchema,
]);

export type TraineeListItemDto =
  | z.infer<typeof activeTraineeRowSchema>
  | z.infer<typeof invitationTraineeRowSchema>;

export const traineeListResponseSchema = z
  .object({
    trainees: z.array(traineeListItemSchema),
    invitations: z.array(traineeListItemSchema),
    pendingInvitations: z.array(traineeListItemSchema).optional(),
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

export const reenableTraineeResponseSchema = z
  .object({
    success: z.literal(true),
    message: z.string().trim().min(1),
    traineeId: z.string().uuid().optional(),
    status: z.literal('ACTIVE').optional(),
  })
  .strict();

export type ReenableTraineeResponseDto = z.infer<typeof reenableTraineeResponseSchema>;

export const createTraineeInvitationResponseSchema = z
  .object({
    success: z.literal(true),
    message: z.string().trim().min(1),
    invitation: invitationTraineeRowSchema,
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

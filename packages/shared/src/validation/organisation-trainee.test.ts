import { describe, expect, it } from 'vitest';
import {
  createTraineeInvitationRequestSchema,
  createTraineeInvitationResponseSchema,
  disableTraineeRequestSchema,
  disableTraineeResponseSchema,
  organisationTraineeParamsSchema,
  organisationTraineesParamsSchema,
  traineeListItemSchema,
  traineeListResponseSchema,
} from './organisation-trainee.js';

describe('organisationTraineesParamsSchema', () => {
  it('accepts valid UUIDs', () => {
    const valid = { organisationId: '11111111-1111-4111-8111-111111111111' };
    expect(organisationTraineesParamsSchema.parse(valid)).toEqual(valid);
  });

  it('rejects invalid UUIDs and extra properties due to strict mode', () => {
    expect(
      organisationTraineesParamsSchema.safeParse({ organisationId: 'not-a-uuid' }).success,
    ).toBe(false);
    expect(
      organisationTraineesParamsSchema.safeParse({
        organisationId: '11111111-1111-4111-8111-111111111111',
        extra: true,
      }).success,
    ).toBe(false);
  });
});

describe('organisationTraineeParamsSchema', () => {
  it('accepts valid organisationId and traineeId UUIDs', () => {
    const valid = {
      organisationId: '11111111-1111-4111-8111-111111111111',
      traineeId: '22222222-2222-4222-8222-222222222222',
    };
    expect(organisationTraineeParamsSchema.parse(valid)).toEqual(valid);
  });

  it('rejects missing or invalid UUIDs and extra fields', () => {
    expect(
      organisationTraineeParamsSchema.safeParse({
        organisationId: '11111111-1111-4111-8111-111111111111',
      }).success,
    ).toBe(false);
    expect(
      organisationTraineeParamsSchema.safeParse({
        organisationId: '11111111-1111-4111-8111-111111111111',
        traineeId: 'bad-id',
      }).success,
    ).toBe(false);
  });
});

describe('createTraineeInvitationRequestSchema', () => {
  it('accepts valid email, lowercases and trims it, with optional first and last names', () => {
    const input = {
      email: '  Trainee.User@EXAMPLE.com  ',
      firstName: ' John ',
      lastName: ' Doe ',
    };
    const parsed = createTraineeInvitationRequestSchema.parse(input);
    expect(parsed.email).toBe('trainee.user@example.com');
    expect(parsed.firstName).toBe('John');
    expect(parsed.lastName).toBe('Doe');
  });

  it('rejects emails over 254 characters and names over 100 characters', () => {
    const longEmail = `${'a'.repeat(245)}@domain.com`;
    expect(createTraineeInvitationRequestSchema.safeParse({ email: longEmail }).success).toBe(
      false,
    );
    expect(
      createTraineeInvitationRequestSchema.safeParse({
        email: 'test@example.com',
        firstName: 'a'.repeat(101),
      }).success,
    ).toBe(false);
  });

  it('rejects extra fields due to strict validation', () => {
    expect(
      createTraineeInvitationRequestSchema.safeParse({
        email: 'trainee@example.com',
        role: 'ADMIN',
      }).success,
    ).toBe(false);
  });
});

describe('disableTraineeRequestSchema', () => {
  it('accepts password and true confirmation with optional disabledReason', () => {
    const input = {
      password: 'securePassword123!',
      confirmation: true as const,
      disabledReason: 'Employee departed',
    };
    expect(disableTraineeRequestSchema.parse(input)).toEqual(input);
  });

  it('rejects extra fields or missing confirmation', () => {
    expect(
      disableTraineeRequestSchema.safeParse({
        password: 'securePassword123!',
      }).success,
    ).toBe(false);

    expect(
      disableTraineeRequestSchema.safeParse({
        password: 'securePassword123!',
        confirmation: true,
        extra: true,
      }).success,
    ).toBe(false);
  });
});

describe('traineeListItemSchema', () => {
  it('accepts valid active trainee list items', () => {
    const validItem = {
      id: '11111111-1111-4111-8111-111111111111',
      rowType: 'ACTIVE_TRAINEE' as const,
      type: 'ACTIVE_TRAINEE' as const,
      traineeProfileId: '22222222-2222-4222-8222-222222222222',
      userId: '33333333-3333-4333-8333-333333333333',
      invitationId: null,
      invitationStatus: null,
      invitationLifecycleState: null,
      email: 'user@example.com',
      firstName: 'User',
      lastName: 'Example',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      joinedAt: new Date().toISOString(),
      invitedAt: null,
      disabledAt: null,
      disabledReason: null,
      expiresAt: null,
      invitationExpiresAt: null,
      emailDeliveryStatus: 'PENDING',
      deliveryState: 'PENDING',
      requiredAction: 'NONE',
      requiredActions: ['NONE'],
      eligibility: {
        canResend: false,
        canRevoke: false,
        canDisable: true,
        canReenable: false,
        canPromote: true,
        resendCooldownSeconds: 0,
        resendDisabledReason: 'Resend is only available for invitations.',
        resendDisabledReasonCode: 'NOT_APPLICABLE',
        revokeDisabledReason: 'Revoke is only available for invitations.',
        revokeDisabledReasonCode: 'NOT_APPLICABLE',
        disableDisabledReason: null,
        disableDisabledReasonCode: null,
        reenableUnavailableReason: 'Only disabled trainees can be re-enabled.',
        promoteDisabledReason: null,
        promoteDisabledReasonCode: null,
      },
    };
    expect(traineeListItemSchema.safeParse(validItem).success).toBe(true);
  });

  it('accepts valid invitation list items', () => {
    const validItem = {
      id: '44444444-4444-4444-8444-444444444444',
      rowType: 'INVITATION' as const,
      type: 'INVITATION' as const,
      traineeProfileId: null,
      userId: null,
      invitationId: '44444444-4444-4444-8444-444444444444',
      invitationStatus: 'PENDING',
      invitationLifecycleState: 'PENDING',
      email: 'pending@example.com',
      firstName: 'Pending',
      lastName: 'User',
      status: 'INVITE_PENDING',
      createdAt: new Date().toISOString(),
      joinedAt: null,
      invitedAt: new Date().toISOString(),
      disabledAt: null,
      disabledReason: null,
      expiresAt: new Date().toISOString(),
      invitationExpiresAt: new Date().toISOString(),
      emailDeliveryStatus: 'PENDING',
      deliveryState: 'PENDING',
      requiredAction: 'CONTINUE_SETUP',
      requiredActions: ['CONTINUE_SETUP'],
      eligibility: {
        canResend: true,
        canRevoke: true,
        canDisable: false,
        canReenable: false,
        canPromote: false,
        resendCooldownSeconds: 0,
        resendDisabledReason: null,
        resendDisabledReasonCode: null,
        revokeDisabledReason: null,
        revokeDisabledReasonCode: null,
        disableDisabledReason: 'Cannot disable a pending invitation.',
        disableDisabledReasonCode: 'NOT_APPLICABLE',
        reenableUnavailableReason: 'Re-enable is only available for disabled memberships.',
        promoteDisabledReason: 'Only active trainees can be promoted.',
        promoteDisabledReasonCode: 'NOT_APPLICABLE',
      },
    };
    expect(traineeListItemSchema.safeParse(validItem).success).toBe(true);
  });
});

describe('Response Schemas', () => {
  it('traineeListResponseSchema validates structured trainees and pendingInvitations arrays', () => {
    const valid = {
      trainees: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          rowType: 'ACTIVE_TRAINEE' as const,
          type: 'ACTIVE_TRAINEE' as const,
          traineeProfileId: '22222222-2222-4222-8222-222222222222',
          userId: '33333333-3333-4333-8333-333333333333',
          invitationId: null,
          invitationStatus: null,
          invitationLifecycleState: null,
          email: 'active@example.com',
          firstName: 'Active',
          lastName: 'User',
          status: 'ACTIVE' as const,
          createdAt: new Date().toISOString(),
          joinedAt: new Date().toISOString(),
          invitedAt: null,
          disabledAt: null,
          disabledReason: null,
          expiresAt: null,
          invitationExpiresAt: null,
          emailDeliveryStatus: 'PENDING',
          deliveryState: 'PENDING',
          requiredAction: 'NONE',
          requiredActions: ['NONE'],
          eligibility: {
            canResend: false,
            canRevoke: false,
            canDisable: true,
            canReenable: false,
            canPromote: true,
            resendCooldownSeconds: 0,
            resendDisabledReason: 'Resend is only available for invitations.',
            resendDisabledReasonCode: 'NOT_APPLICABLE',
            revokeDisabledReason: 'Revoke is only available for invitations.',
            revokeDisabledReasonCode: 'NOT_APPLICABLE',
            disableDisabledReason: null,
            disableDisabledReasonCode: null,
            reenableUnavailableReason: 'Only disabled trainees can be re-enabled.',
            promoteDisabledReason: null,
            promoteDisabledReasonCode: null,
          },
        },
      ],
      invitations: [
        {
          id: '44444444-4444-4444-8444-444444444444',
          rowType: 'INVITATION' as const,
          type: 'INVITATION' as const,
          traineeProfileId: null,
          userId: null,
          invitationId: '44444444-4444-4444-8444-444444444444',
          invitationStatus: 'PENDING',
          invitationLifecycleState: 'PENDING',
          email: 'pending@example.com',
          firstName: 'Pending',
          lastName: 'User',
          status: 'INVITE_PENDING' as const,
          createdAt: new Date().toISOString(),
          joinedAt: null,
          invitedAt: new Date().toISOString(),
          disabledAt: null,
          disabledReason: null,
          expiresAt: new Date().toISOString(),
          invitationExpiresAt: new Date().toISOString(),
          emailDeliveryStatus: 'PENDING',
          deliveryState: 'PENDING',
          requiredAction: 'CONTINUE_SETUP',
          requiredActions: ['CONTINUE_SETUP'],
          eligibility: {
            canResend: true,
            canRevoke: true,
            canDisable: false,
            canReenable: false,
            canPromote: false,
            resendCooldownSeconds: 0,
            resendDisabledReason: null,
            resendDisabledReasonCode: null,
            revokeDisabledReason: null,
            revokeDisabledReasonCode: null,
            disableDisabledReason: 'Cannot disable a pending invitation.',
            disableDisabledReasonCode: 'NOT_APPLICABLE',
            reenableUnavailableReason: 'Re-enable is only available for disabled memberships.',
            promoteDisabledReason: 'Only active trainees can be promoted.',
            promoteDisabledReasonCode: 'NOT_APPLICABLE',
          },
        },
      ],
      pendingInvitations: [
        {
          id: '44444444-4444-4444-8444-444444444444',
          rowType: 'INVITATION' as const,
          type: 'INVITATION' as const,
          traineeProfileId: null,
          userId: null,
          invitationId: '44444444-4444-4444-8444-444444444444',
          invitationStatus: 'PENDING',
          invitationLifecycleState: 'PENDING',
          email: 'pending@example.com',
          firstName: 'Pending',
          lastName: 'User',
          status: 'INVITE_PENDING' as const,
          createdAt: new Date().toISOString(),
          joinedAt: null,
          invitedAt: new Date().toISOString(),
          disabledAt: null,
          disabledReason: null,
          expiresAt: new Date().toISOString(),
          invitationExpiresAt: new Date().toISOString(),
          emailDeliveryStatus: 'PENDING',
          deliveryState: 'PENDING',
          requiredAction: 'CONTINUE_SETUP',
          requiredActions: ['CONTINUE_SETUP'],
          eligibility: {
            canResend: true,
            canRevoke: true,
            canDisable: false,
            canReenable: false,
            canPromote: false,
            resendCooldownSeconds: 0,
            resendDisabledReason: null,
            resendDisabledReasonCode: null,
            revokeDisabledReason: null,
            revokeDisabledReasonCode: null,
            disableDisabledReason: 'Cannot disable a pending invitation.',
            disableDisabledReasonCode: 'NOT_APPLICABLE',
            reenableUnavailableReason: 'Re-enable is only available for disabled memberships.',
            promoteDisabledReason: 'Only active trainees can be promoted.',
            promoteDisabledReasonCode: 'NOT_APPLICABLE',
          },
        },
      ],
    };
    expect(traineeListResponseSchema.safeParse(valid).success).toBe(true);
  });

  it('disableTraineeResponseSchema enforces strict structure', () => {
    const valid = {
      success: true as const,
      message: 'Trainee account has been disabled.',
      traineeId: '11111111-1111-4111-8111-111111111111',
      status: 'DISABLED' as const,
    };
    expect(disableTraineeResponseSchema.safeParse(valid).success).toBe(true);
    expect(disableTraineeResponseSchema.safeParse({ ...valid, extra: true }).success).toBe(false);
  });

  it('createTraineeInvitationResponseSchema enforces strict structure', () => {
    const valid = {
      success: true as const,
      message: 'Invitation sent.',
      invitation: {
        id: '55555555-5555-4555-8555-555555555555',
        rowType: 'INVITATION' as const,
        type: 'INVITATION' as const,
        traineeProfileId: null,
        userId: null,
        invitationId: '55555555-5555-4555-8555-555555555555',
        invitationStatus: 'PENDING',
        invitationLifecycleState: 'PENDING',
        email: 'new@example.com',
        firstName: null,
        lastName: null,
        status: 'INVITE_PENDING' as const,
        createdAt: new Date().toISOString(),
        joinedAt: null,
        invitedAt: new Date().toISOString(),
        disabledAt: null,
        disabledReason: null,
        expiresAt: new Date().toISOString(),
        invitationExpiresAt: new Date().toISOString(),
        emailDeliveryStatus: 'SENT',
        deliveryState: 'SENT',
        requiredAction: 'CONTINUE_SETUP' as const,
        requiredActions: ['CONTINUE_SETUP'],
        eligibility: {
          canResend: false,
          canRevoke: true,
          canDisable: false,
          canReenable: false,
          canPromote: false,
          resendCooldownSeconds: 60,
          resendDisabledReason: 'Resend cooldown is currently active.',
          resendDisabledReasonCode: 'COOLDOWN_ACTIVE',
          revokeDisabledReason: null,
          revokeDisabledReasonCode: null,
          disableDisabledReason: 'Cannot disable a pending invitation.',
          disableDisabledReasonCode: 'NOT_APPLICABLE',
          reenableUnavailableReason: 'Re-enable is only available for disabled memberships.',
          promoteDisabledReason: 'Only active trainees can be promoted.',
          promoteDisabledReasonCode: 'NOT_APPLICABLE',
        },
      },
    };
    expect(createTraineeInvitationResponseSchema.safeParse(valid).success).toBe(true);
  });
});

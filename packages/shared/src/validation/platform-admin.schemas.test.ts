import { describe, expect, it } from 'vitest';
import {
  demotePlatformAdminResponseSchema,
  invitePlatformAdminResponseSchema,
  platformAdminListResponseSchema,
  resendPlatformAdminInviteResponseSchema,
} from './platform-admin.schemas.js';

const adminUserId = '11111111-1111-4111-8111-111111111111';
const inviteId = '22222222-2222-4222-8222-222222222222';

const populatedListResponse = {
  admins: [
    {
      id: adminUserId,
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      platformAdminRole: 'NORMAL_ADMIN',
      adminStatus: 'ACTIVE',
      authStatus: 'PENDING_INVITE_SETUP',
      invitationStatus: 'SENT',
      inviteId,
      allowedActions: {
        canTransferSuperAdmin: false,
        canDemote: false,
        canResendInvite: true,
      },
    },
  ],
  allowedToInvite: true,
  allowedToTransfer: true,
  allowedToDemote: true,
  allowedToResendInvites: true,
};

describe('platformAdminListResponseSchema', () => {
  it('validates a populated platform administrator list response', () => {
    expect(platformAdminListResponseSchema.parse(populatedListResponse)).toEqual(
      populatedListResponse,
    );
  });

  it('validates an empty list with all required global capability flags', () => {
    const response = {
      admins: [],
      allowedToInvite: false,
      allowedToTransfer: false,
      allowedToDemote: false,
      allowedToResendInvites: false,
    };

    expect(platformAdminListResponseSchema.parse(response)).toEqual(response);
  });

  it('requires all global capability flags', () => {
    const response = {
      admins: [],
      allowedToInvite: false,
      allowedToTransfer: false,
      allowedToDemote: false,
    };

    expect(platformAdminListResponseSchema.safeParse(response).success).toBe(false);
  });

  it('accepts null invitation status and invite ID', () => {
    const response = {
      ...populatedListResponse,
      admins: [
        {
          ...populatedListResponse.admins[0],
          authStatus: 'ACTIVE',
          invitationStatus: null,
          inviteId: null,
          allowedActions: {
            canTransferSuperAdmin: false,
            canDemote: false,
            canResendInvite: false,
          },
        },
      ],
    };

    expect(platformAdminListResponseSchema.parse(response)).toEqual(response);
  });

  it('accepts empty optional invitation names', () => {
    const response = {
      ...populatedListResponse,
      admins: [
        {
          ...populatedListResponse.admins[0],
          firstName: '',
          lastName: '',
        },
      ],
    };
    expect(platformAdminListResponseSchema.parse(response)).toEqual(response);
  });

  it('accepts future status values for Unkown status rendering', () => {
    const response = {
      ...populatedListResponse,
      admins: [
        {
          ...populatedListResponse.admins[0],
          platformAdminRole: 'FUTURE_ADMIN_ROLE',
          adminStatus: 'FUTURE_ADMIN_STATUS',
          authStatus: 'FUTURE_ADMIN_STATUS',
          invitationStatus: 'FUTURE_INVITATION_STATUS',
        },
      ],
    };
    expect(platformAdminListResponseSchema.parse(response)).toEqual(response);
  });

  it('rejects an invalid administrator ID', () => {
    const response = {
      ...populatedListResponse,
      admins: [
        {
          ...populatedListResponse.admins[0],
          id: 'not-a-uuid',
        },
      ],
    };

    expect(platformAdminListResponseSchema.safeParse(response).success).toBe(false);
  });

  it('rejects an invalid invitation ID', () => {
    const response = {
      ...populatedListResponse,
      admins: [
        {
          ...populatedListResponse.admins[0],
          inviteId: 'not-a-uuid',
        },
      ],
    };

    expect(platformAdminListResponseSchema.safeParse(response).success).toBe(false);
  });

  it('rejects a non-boolean row capability', () => {
    const response = {
      ...populatedListResponse,
      admins: [
        {
          ...populatedListResponse.admins[0],
          allowedActions: {
            ...populatedListResponse.admins[0].allowedActions,
            canResendInvite: 'yes',
          },
        },
      ],
    };
    expect(platformAdminListResponseSchema.safeParse(response).success).toBe(false);
  });
});

describe('invitePlatformAdminResponseSchema', () => {
  it('validates a new-invite response', () => {
    const response = {
      type: 'new-invite' as const,
      userId: adminUserId,
      email: 'new-admin@example.com',
    };
    expect(invitePlatformAdminResponseSchema.parse(response)).toEqual(response);
  });

  it('validates an upgrade-confirmation response', () => {
    const response = {
      type: 'upgrade-confirmation' as const,
      userId: adminUserId,
      email: 'existing-user@example.com',
    };
    expect(invitePlatformAdminResponseSchema.parse(response)).toEqual(response);
  });

  it('rejects an invalid response discriminator', () => {
    expect(
      invitePlatformAdminResponseSchema.safeParse({
        type: 'unknown-result',
        userId: adminUserId,
        email: 'unknown@example.com',
      }).success,
    ).toBe(false);
  });
});

describe('resendPlatformAdminInviteResponseSchema', () => {
  it.each([true, false])('validates emailQueued=%s', (emailQueued) => {
    const response = {
      success: true as const,
      emailQueued,
    };

    expect(resendPlatformAdminInviteResponseSchema.parse(response)).toEqual(response);
  });

  it('rejects success=false', () => {
    expect(
      resendPlatformAdminInviteResponseSchema.safeParse({
        success: false,
        emailQueued: true,
      }).success,
    ).toBe(false);
  });
});

describe('demotePlatformAdminResponseSchema', () => {
  it('validates the exact demotion response', () => {
    const response = {
      userId: adminUserId,
      email: 'demotes@example.com',
      adminStatus: 'DISABLED' as const,
      authStatus: 'ACTIVE',
    };

    expect(demotePlatformAdminResponseSchema.parse(response)).toEqual(response);
  });

  it('rejects a non-disabled admin status', () => {
    expect(
      demotePlatformAdminResponseSchema.safeParse({
        userId: adminUserId,
        email: 'demoted@example.com',
        adminStatus: 'ACTIVE',
        authStatus: 'ACTIVE',
      }).success,
    ).toBe(false);
  });

  it('rejects unexpected response properties', () => {
    expect(
      demotePlatformAdminResponseSchema.safeParse({
        userId: adminUserId,
        email: 'demoted@example.com',
        adminStatus: 'DISABLED',
        authStatus: 'ACTIVE',
        extra: true,
      }).success,
    ).toBe(false);
  });
});

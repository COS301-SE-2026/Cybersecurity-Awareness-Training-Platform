import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  acceptInvitationWithToken,
  getInvitationTokenContext,
  rejectInvitationWithToken,
  InvitationFlowError,
} from '../../../src/services/invitation.service.js';
import {
  buildMockInvitationToken,
  buildMockUser,
  createInvitationRepoMock,
} from '../helpers/invitation.fixtures.js';

const { invitationRepoMock, auditLogServiceMock, tokenHashServiceMock } = vi.hoisted(() => {
  class InvitationRepositoryConflictError extends Error {
    constructor(
      public readonly errorKey: string,
      message: string,
    ) {
      super(message);
      this.name = 'InvitationRepositoryConflictError';
    }
  }
  return {
    invitationRepoMock: {
      findInvitationTokenByHash: vi.fn(),
      findUserByEmailWithProfiles: vi.fn(),
      claimInvitationAccept: vi.fn(),
      claimInvitationReject: vi.fn(),
      claimInvitationToken: vi.fn(),
      insertInvitationPermissionGrantsToAdmin: vi.fn(),
      updateUserRoleAndProfilesFromInvitation: vi.fn(),
      InvitationRepositoryConflictError,
    },
    auditLogServiceMock: {
      recordAuditLog: vi.fn(),
    },
    tokenHashServiceMock: {
      hashOpaqueToken: vi.fn().mockImplementation((raw: string) => `hashed_${raw}`),
    },
  };
});

vi.mock('../../../src/repositories/invitation.repository.js', () => invitationRepoMock);
vi.mock('../../../src/services/audit-log.service.js', () => auditLogServiceMock);
vi.mock('../../../src/services/token-hash.service.js', () => tokenHashServiceMock);

const mockTx = {
  transaction: true,
  actionToken: {
    findUnique: vi.fn().mockImplementation(async () => {
      const token = await invitationRepoMock.findInvitationTokenByHash();
      return token ? { ...token, revokedAt: null, usedAt: null } : null;
    }),
  },
  invitation: {
    findUnique: vi.fn().mockImplementation(async () => {
      const token = await invitationRepoMock.findInvitationTokenByHash();
      return token?.invitation ? { ...token.invitation, status: 'PENDING' } : null;
    }),
  },
  user: {
    findUnique: vi.fn().mockImplementation(async () => {
      const user = await invitationRepoMock.findUserByEmailWithProfiles();
      return user ? { ...user, authStatus: 'ACTIVE' } : null;
    }),
  },
  authSession: {
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
  },
};
vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(mockTx)),
  },
}));

describe('InvitationService (Detailed Boundary & Concurrency Tests)', () => {
  const mockValidToken = buildMockInvitationToken();
  const mockExistingTraineeUser = buildMockUser();

  beforeEach(() => {
    vi.clearAllMocks();
    createInvitationRepoMock();
  });

  describe('getInvitationTokenContext', () => {
    it('returns full context for valid active token and existing account', async () => {
      invitationRepoMock.findInvitationTokenByHash.mockResolvedValue(mockValidToken);
      invitationRepoMock.findUserByEmailWithProfiles.mockResolvedValue(mockExistingTraineeUser);

      const res = await getInvitationTokenContext('raw-token');
      expect(res).toEqual({
        requiredAction: 'CONTINUE_SETUP',
        status: 'PENDING',
        expiresAt: mockValidToken.expiresAt.toISOString(),
        rejectAllowed: true,
      });
    });

    it('returns LOGIN_REQUIRED when unauthenticated for non-setup purposes like promotion', async () => {
      const promoToken = buildMockInvitationToken({ purpose: 'ORGANISATION_ADMIN_PROMOTION' });
      invitationRepoMock.findInvitationTokenByHash.mockResolvedValue(promoToken);
      invitationRepoMock.findUserByEmailWithProfiles.mockResolvedValue(mockExistingTraineeUser);

      const res = await getInvitationTokenContext('raw-token');
      expect(res).toEqual({
        requiredAction: 'LOGIN_REQUIRED',
        status: 'PENDING',
        expiresAt: promoToken.expiresAt.toISOString(),
        rejectAllowed: true,
      });
    });

    it('returns status EXPIRED when token has expired', async () => {
      invitationRepoMock.findInvitationTokenByHash.mockResolvedValue(
        buildMockInvitationToken({ expiresAt: new Date(Date.now() - 1000) }),
      );
      invitationRepoMock.findUserByEmailWithProfiles.mockResolvedValue(mockExistingTraineeUser);

      const res = await getInvitationTokenContext('raw-token');
      expect(res.status).toBe('EXPIRED');
    });

    it('returns privacy-safe SWITCH_ACCOUNT context when logged in email does not match target email', async () => {
      invitationRepoMock.findInvitationTokenByHash.mockResolvedValue(mockValidToken);

      const res = await getInvitationTokenContext('raw-token', 'other@example.com');
      expect(res).toEqual({
        requiredAction: 'SWITCH_ACCOUNT',
        status: 'PENDING',
        expiresAt: mockValidToken.expiresAt.toISOString(),
        rejectAllowed: true,
      });
    });

    it('throws 409 ORGANISATION_SUSPENDED when organisation is suspended', async () => {
      invitationRepoMock.findInvitationTokenByHash.mockResolvedValue(
        buildMockInvitationToken({
          invitation: {
            ...mockValidToken.invitation,
            organisation: { id: 'org-1', name: 'Acme Corp', status: 'SUSPENDED' },
          },
        }),
      );

      await expect(getInvitationTokenContext('raw-token')).rejects.toThrowError(
        InvitationFlowError,
      );
    });
  });

  describe('Boundary & Edge Cases (acceptInvitationWithToken)', () => {
    const mockPromoToken = buildMockInvitationToken({
      purpose: 'ORGANISATION_ADMIN_PROMOTION',
    });
    const mockExistingAdminUser = buildMockUser({ userType: 'ORGANISATION_ADMIN' });

    it('Boundary test: succeeds when token expires in exactly 1 millisecond', async () => {
      const now = new Date('2026-07-14T12:00:00.000Z');
      const tokenExpiresIn1Ms = buildMockInvitationToken({
        purpose: 'ORGANISATION_ADMIN_PROMOTION',
        expiresAt: new Date('2026-07-14T12:00:00.001Z'),
      });
      invitationRepoMock.findInvitationTokenByHash.mockResolvedValue(tokenExpiresIn1Ms);
      invitationRepoMock.findUserByEmailWithProfiles.mockResolvedValue(mockExistingAdminUser);
      invitationRepoMock.updateUserRoleAndProfilesFromInvitation.mockResolvedValue({
        userType: 'ORGANISATION_ADMIN',
        adminProfileId: 'admin-1',
      });

      const res = await acceptInvitationWithToken(
        'raw-token',
        {},
        'trainee@example.com',
        undefined,
        undefined,
        now,
      );
      expect(res.success).toBe(true);
      expect(invitationRepoMock.claimInvitationAccept).toHaveBeenCalledWith('inv-1', mockTx);
    });

    it('Boundary test: fails with 409 Conflict when token expired exactly 1 millisecond ago', async () => {
      const now = new Date('2026-07-14T12:00:00.000Z');
      const tokenExpired1MsAgo = buildMockInvitationToken({
        purpose: 'ORGANISATION_ADMIN_PROMOTION',
        expiresAt: new Date('2026-07-14T11:59:59.999Z'),
      });
      invitationRepoMock.findInvitationTokenByHash.mockResolvedValue(tokenExpired1MsAgo);
      invitationRepoMock.findUserByEmailWithProfiles.mockResolvedValue(mockExistingAdminUser);

      await expect(
        acceptInvitationWithToken(
          'raw-token',
          {},
          'trainee@example.com',
          undefined,
          undefined,
          now,
        ),
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 409,
          errorKey: 'INVITATION_EXPIRED',
        }),
      );
    });

    it('Concurrency test: throws 409 Conflict when double submission occurs on claimInvitationAccept', async () => {
      invitationRepoMock.findInvitationTokenByHash.mockResolvedValue(mockPromoToken);
      invitationRepoMock.findUserByEmailWithProfiles.mockResolvedValue(mockExistingAdminUser);

      // Simulate double submission throwing conflict on second attempt or inside transaction
      invitationRepoMock.claimInvitationAccept.mockRejectedValueOnce(
        new invitationRepoMock.InvitationRepositoryConflictError(
          'INVITATION_ALREADY_ACCEPTED_OR_RESOLVED',
          'Invitation has already been accepted or resolved concurrently.',
        ),
      );

      await expect(
        acceptInvitationWithToken('raw-token', {}, 'trainee@example.com'),
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 409,
          errorKey: 'INVITATION_ALREADY_ACCEPTED_OR_RESOLVED',
          message: 'Invitation has already been accepted or resolved concurrently.',
        }),
      );
    });

    it('Role conflict test: asserts that logged-in PLATFORM_ADMIN cannot accept ORGANISATION_TRAINEE invite', async () => {
      invitationRepoMock.findInvitationTokenByHash.mockResolvedValue(mockValidToken);
      const platformAdminUser = buildMockUser({ userType: 'IP_ADMIN' });
      invitationRepoMock.findUserByEmailWithProfiles.mockResolvedValue(platformAdminUser);

      await expect(
        acceptInvitationWithToken('raw-token', {}, 'trainee@example.com'),
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 409,
          errorKey: 'ROLE_CONFLICT',
          message: 'Platform administrators cannot accept organisation trainee invitations.',
        }),
      );
    });

    it('Audit test: verifies exact AUDITLOGENTRY payload received by Prisma transaction mock on acceptance', async () => {
      invitationRepoMock.findInvitationTokenByHash.mockResolvedValue(mockPromoToken);
      invitationRepoMock.findUserByEmailWithProfiles.mockResolvedValue(mockExistingAdminUser);
      invitationRepoMock.updateUserRoleAndProfilesFromInvitation.mockResolvedValue({
        userType: 'ORGANISATION_ADMIN',
        adminProfileId: 'admin-1',
      });

      await acceptInvitationWithToken(
        'raw-token',
        { confirmRoleChange: false },
        'trainee@example.com',
        '192.168.1.100',
        'Mozilla/5.0 Vitest',
      );

      expect(auditLogServiceMock.recordAuditLog).toHaveBeenCalledWith(
        {
          actorUserId: mockExistingAdminUser.id,
          actorType: 'ORGANISATION_ADMIN',
          organisationId: 'org-1',
          targetType: 'INVITATION',
          targetId: 'inv-1',
          actionType: 'ACCEPTED',
          outcome: 'SUCCESS',
          oldValues: {
            userType: 'ORGANISATION_ADMIN',
          },
          newValues: {
            userType: 'ORGANISATION_ADMIN',
            role: 'ORGANISATION_ADMIN',
          },
          metadata: {
            actionTokenId: 'token-1',
            isPromotion: false,
            confirmRoleChange: false,
          },
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 Vitest',
        },
        mockTx,
      );
    });

    it('promotes trainee to admin when confirmRoleChange is true and logs promotion events', async () => {
      const mockPromoToken = buildMockInvitationToken({
        purpose: 'ORGANISATION_ADMIN_PROMOTION',
        invitation: {
          ...mockValidToken.invitation,
          permissionGrants: [{ organisationPermissionId: 'perm-1' }],
        },
      });
      invitationRepoMock.findInvitationTokenByHash.mockResolvedValue(mockPromoToken);
      invitationRepoMock.findUserByEmailWithProfiles.mockResolvedValue(mockExistingTraineeUser);
      invitationRepoMock.updateUserRoleAndProfilesFromInvitation.mockResolvedValue({
        userType: 'ORGANISATION_ADMIN',
        adminProfileId: 'admin-1',
      });

      const res = await acceptInvitationWithToken(
        'raw-token',
        { confirmRoleChange: true },
        'trainee@example.com',
      );
      expect(res.success).toBe(true);

      expect(invitationRepoMock.insertInvitationPermissionGrantsToAdmin).toHaveBeenCalledWith(
        'org-1',
        'admin-1',
        [{ organisationPermissionId: 'perm-1' }],
        mockTx,
      );
      expect(auditLogServiceMock.recordAuditLog).toHaveBeenCalledTimes(2);
    });
  });

  describe('rejectInvitationWithToken', () => {
    it('rejects invitation inside transaction and records REJECTED audit log', async () => {
      invitationRepoMock.findInvitationTokenByHash.mockResolvedValue(mockValidToken);
      invitationRepoMock.findUserByEmailWithProfiles.mockResolvedValue(mockExistingTraineeUser);

      const res = await rejectInvitationWithToken('raw-token', {
        rejectionReason: 'Not interested',
      });
      expect(res.success).toBe(true);

      expect(invitationRepoMock.claimInvitationReject).toHaveBeenCalledWith('inv-1', mockTx);
      expect(invitationRepoMock.claimInvitationToken).toHaveBeenCalledWith('token-1', mockTx);
      expect(auditLogServiceMock.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'REJECTED',
          metadata: expect.objectContaining({ rejectionReason: 'Not interested' }),
        }),
        mockTx,
      );
    });

    it('throws AUTH_USER_MISMATCH when logged in with a different account during reject', async () => {
      invitationRepoMock.findInvitationTokenByHash.mockResolvedValue(mockValidToken);
      invitationRepoMock.findUserByEmailWithProfiles.mockResolvedValue(mockExistingTraineeUser);

      await expect(
        rejectInvitationWithToken(
          'raw-token',
          {},
          { userId: 'diff-user', email: 'other@example.com' },
        ),
      ).rejects.toThrow(InvitationFlowError);
    });

    it('records correct audit actor type for SYSTEM, GENERAL_TRAINEE, and IP_ADMIN on reject', async () => {
      invitationRepoMock.findInvitationTokenByHash.mockResolvedValue(mockValidToken);

      // SYSTEM (unauthenticated)
      invitationRepoMock.findUserByEmailWithProfiles.mockResolvedValue(null);
      await rejectInvitationWithToken('raw-token', {});
      expect(auditLogServiceMock.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ actorType: 'SYSTEM', actorUserId: null }),
        mockTx,
      );

      // GENERAL_TRAINEE
      invitationRepoMock.findUserByEmailWithProfiles.mockResolvedValue(null);
      await rejectInvitationWithToken(
        'raw-token',
        {},
        { userId: 'u-gen', email: 'trainee@example.com' },
      );
      expect(auditLogServiceMock.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ actorType: 'GENERAL_TRAINEE', actorUserId: 'u-gen' }),
        mockTx,
      );

      // IP_ADMIN
      invitationRepoMock.findUserByEmailWithProfiles.mockResolvedValue(
        buildMockUser({ id: 'ip-1', userType: 'IP_ADMIN' }),
      );
      await rejectInvitationWithToken(
        'raw-token',
        {},
        { userId: 'ip-1', email: 'trainee@example.com' },
      );
      expect(auditLogServiceMock.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ actorType: 'IP_ADMIN', actorUserId: 'ip-1' }),
        mockTx,
      );
    });

    it('throws INVITATION_EXPIRED inside transaction if token is used or revoked or invitation not PENDING', async () => {
      invitationRepoMock.findInvitationTokenByHash.mockResolvedValueOnce(mockValidToken);
      invitationRepoMock.findUserByEmailWithProfiles.mockResolvedValueOnce(mockExistingTraineeUser);

      // Override mockTx actionToken to return revoked token
      mockTx.actionToken.findUnique.mockResolvedValueOnce({
        ...mockValidToken,
        revokedAt: new Date(),
      });

      await expect(rejectInvitationWithToken('raw-token', {})).rejects.toThrow(InvitationFlowError);
    });
  });

  describe('Purpose mapping and token context branches', () => {
    it('handles INITIAL_ORGANISATION_ADMIN_SETUP purpose and returns CONTINUE_SETUP', async () => {
      const token = buildMockInvitationToken({
        purpose: 'INITIAL_ORGANISATION_ADMIN_SETUP',
        invitation: { ...buildMockInvitationToken().invitation, organisationId: null },
      });
      invitationRepoMock.findInvitationTokenByHash.mockResolvedValue(token);
      invitationRepoMock.findUserByEmailWithProfiles.mockResolvedValue(null);

      const res = await getInvitationTokenContext('raw-token');
      expect(res.requiredAction).toBe('CONTINUE_SETUP');
    });

    it('handles PLATFORM_ADMIN_INVITE purpose and returns CONTINUE_SETUP', async () => {
      const token = buildMockInvitationToken({ purpose: 'PLATFORM_ADMIN_INVITE' });
      invitationRepoMock.findInvitationTokenByHash.mockResolvedValue(token);
      invitationRepoMock.findUserByEmailWithProfiles.mockResolvedValue(null);

      const res = await getInvitationTokenContext('raw-token');
      expect(res.requiredAction).toBe('CONTINUE_SETUP');
      expect(res.rejectAllowed).toBe(false);
    });

    it('handles ORGANISATION_ADMIN_PROMOTION and PLATFORM_ADMIN_UPGRADE_CONFIRMATION purposes', async () => {
      const tokenOrgAdmin = buildMockInvitationToken({
        purpose: 'ORGANISATION_ADMIN_PROMOTION',
        invitation: {
          ...buildMockInvitationToken().invitation,
          permissionGrants: [{ organisationPermissionId: 'p-1' }],
        },
      });
      invitationRepoMock.findInvitationTokenByHash.mockResolvedValueOnce(tokenOrgAdmin);
      invitationRepoMock.findUserByEmailWithProfiles.mockResolvedValueOnce(mockExistingTraineeUser);

      const res1 = await getInvitationTokenContext('raw-token', {
        userId: 'user-1',
        email: 'trainee@example.com',
      });
      expect(res1.requiredAction).toBe('CONFIRM_ROLE_CHANGE');
      if (res1.requiredAction === 'CONFIRM_ROLE_CHANGE') {
        expect(res1.permissions).toEqual(['p-1']);
      }

      const tokenPlatAdmin = buildMockInvitationToken({
        purpose: 'PLATFORM_ADMIN_UPGRADE_CONFIRMATION',
      });
      invitationRepoMock.findInvitationTokenByHash.mockResolvedValueOnce(tokenPlatAdmin);
      invitationRepoMock.findUserByEmailWithProfiles.mockResolvedValueOnce(mockExistingTraineeUser);

      const res2 = await getInvitationTokenContext('raw-token', {
        userId: 'user-1',
        email: 'trainee@example.com',
      });
      expect(res2.requiredAction).toBe('CONFIRM_ROLE_CHANGE');
    });

    it('throws when purpose is unknown or not an invitation purpose', async () => {
      invitationRepoMock.findInvitationTokenByHash.mockResolvedValueOnce(
        buildMockInvitationToken({ purpose: 'UNKNOWN_PURPOSE' }),
      );
      await expect(getInvitationTokenContext('raw-token')).rejects.toThrow(InvitationFlowError);

      invitationRepoMock.findInvitationTokenByHash.mockResolvedValueOnce(
        buildMockInvitationToken({ purpose: 'PASSWORD_RESET' }),
      );
      await expect(getInvitationTokenContext('raw-token')).rejects.toThrow(InvitationFlowError);
    });

    it('throws when invitation property on token is null', async () => {
      invitationRepoMock.findInvitationTokenByHash.mockResolvedValueOnce(
        buildMockInvitationToken({ invitation: null }),
      );
      await expect(getInvitationTokenContext('raw-token')).rejects.toThrow(InvitationFlowError);
    });

    it('returns SWITCH_ACCOUNT when authContext email matches but userId mismatches', async () => {
      invitationRepoMock.findInvitationTokenByHash.mockResolvedValueOnce(mockValidToken);
      invitationRepoMock.findUserByEmailWithProfiles.mockResolvedValueOnce(mockExistingTraineeUser);

      const res = await getInvitationTokenContext('raw-token', {
        userId: 'mismatch-id',
        email: 'trainee@example.com',
      });
      expect(res.requiredAction).toBe('SWITCH_ACCOUNT');
    });
  });

  describe('acceptInvitationWithToken error branches and audit actors', () => {
    it('throws AUTH_REQUIRED when normAuth is not provided', async () => {
      invitationRepoMock.findInvitationTokenByHash.mockResolvedValueOnce(mockValidToken);
      await expect(
        acceptInvitationWithToken('raw-token', { confirmRoleChange: true }),
      ).rejects.toThrow(InvitationFlowError);
    });

    it('throws AUTH_USER_MISMATCH when logged in user does not match target', async () => {
      invitationRepoMock.findInvitationTokenByHash.mockResolvedValueOnce(mockValidToken);
      invitationRepoMock.findUserByEmailWithProfiles.mockResolvedValueOnce(mockExistingTraineeUser);

      await expect(
        acceptInvitationWithToken(
          'raw-token',
          { confirmRoleChange: true },
          { userId: 'user-1', email: 'wrong@example.com' },
        ),
      ).rejects.toThrow(InvitationFlowError);
    });

    it('throws SETUP_REQUIRED when target user is not found during mutation', async () => {
      invitationRepoMock.findInvitationTokenByHash.mockResolvedValueOnce(mockValidToken);
      invitationRepoMock.findUserByEmailWithProfiles.mockResolvedValueOnce(null);

      await expect(
        acceptInvitationWithToken(
          'raw-token',
          { confirmRoleChange: true },
          { userId: 'user-1', email: 'trainee@example.com' },
        ),
      ).rejects.toThrow(InvitationFlowError);
    });

    it('handles PLATFORM_ADMIN acceptance returning REAUTHENTICATE session outcome', async () => {
      const platAdminToken = buildMockInvitationToken({
        purpose: 'PLATFORM_ADMIN_UPGRADE_CONFIRMATION',
      });
      invitationRepoMock.findInvitationTokenByHash.mockResolvedValue(platAdminToken);
      invitationRepoMock.findUserByEmailWithProfiles.mockResolvedValue(
        buildMockUser({ userType: 'ORGANISATION_ADMIN' }),
      );

      invitationRepoMock.updateUserRoleAndProfilesFromInvitation.mockResolvedValueOnce({
        roleUpdate: { userType: 'PLATFORM_ADMIN' },
      });

      const res = await acceptInvitationWithToken(
        'raw-token',
        { confirmRoleChange: true },
        { userId: 'user-1', email: 'trainee@example.com' },
      );
      expect(res.sessionOutcome).toBe('REAUTHENTICATE');
    });

    it('throws SETUP_REQUIRED when purpose is ORGANISATION_TRAINEE_INVITE', async () => {
      invitationRepoMock.findInvitationTokenByHash.mockResolvedValue(mockValidToken);
      invitationRepoMock.findUserByEmailWithProfiles.mockResolvedValue(mockExistingTraineeUser);

      await expect(
        acceptInvitationWithToken(
          'raw-token',
          {},
          { userId: 'user-1', email: 'trainee@example.com' },
        ),
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 409,
          errorKey: 'SETUP_REQUIRED',
        }),
      );
    });

    it('re-throws InvitationRepositoryConflictError as InvitationFlowError 409', async () => {
      const promoToken = buildMockInvitationToken({ purpose: 'ORGANISATION_ADMIN_PROMOTION' });
      const adminUser = buildMockUser({ userType: 'ORGANISATION_ADMIN' });
      invitationRepoMock.findInvitationTokenByHash.mockResolvedValue(promoToken);
      invitationRepoMock.findUserByEmailWithProfiles.mockResolvedValue(adminUser);

      invitationRepoMock.updateUserRoleAndProfilesFromInvitation.mockRejectedValueOnce(
        new invitationRepoMock.InvitationRepositoryConflictError('CONFLICT', 'Repo conflict'),
      );

      await expect(
        acceptInvitationWithToken(
          'raw-token',
          { confirmRoleChange: true },
          { userId: 'user-1', email: 'trainee@example.com' },
        ),
      ).rejects.toThrow(InvitationFlowError);
    });

    it('re-throws non-conflict errors directly', async () => {
      const promoToken = buildMockInvitationToken({ purpose: 'ORGANISATION_ADMIN_PROMOTION' });
      const adminUser = buildMockUser({ userType: 'ORGANISATION_ADMIN' });
      invitationRepoMock.findInvitationTokenByHash.mockResolvedValue(promoToken);
      invitationRepoMock.findUserByEmailWithProfiles.mockResolvedValue(adminUser);
      mockTx.user.findUnique.mockResolvedValue({
        ...adminUser,
        authStatus: 'ACTIVE',
      });

      const genericError = new Error('Database connection lost');
      invitationRepoMock.updateUserRoleAndProfilesFromInvitation.mockRejectedValueOnce(
        genericError,
      );

      await expect(
        acceptInvitationWithToken(
          'raw-token',
          { confirmRoleChange: true },
          { userId: 'user-1', email: 'trainee@example.com' },
        ),
      ).rejects.toThrow(genericError);
    });
  });
});

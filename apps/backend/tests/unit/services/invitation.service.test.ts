import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  acceptInvitationWithToken,
  getInvitationTokenContext,
  rejectInvitationWithToken,
  InvitationFlowError,
} from '../../../src/services/invitation.service.js';
import { buildMockInvitationToken, buildMockUser } from '../helpers/invitation.fixtures.js';

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

const mockTx = { transaction: true };
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
  });

  describe('getInvitationTokenContext', () => {
    it('returns full context for valid active token and existing account', async () => {
      invitationRepoMock.findInvitationTokenByHash.mockResolvedValue(mockValidToken);
      invitationRepoMock.findUserByEmailWithProfiles.mockResolvedValue(mockExistingTraineeUser);

      const res = await getInvitationTokenContext('raw-token');
      expect(res).toEqual({
        requiredAction: 'LOGIN_REQUIRED',
        status: 'PENDING',
        expiresAt: mockValidToken.expiresAt.toISOString(),
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

    it('throws 403 AUTH_USER_MISMATCH when logged in email does not match target email', async () => {
      invitationRepoMock.findInvitationTokenByHash.mockResolvedValue(mockValidToken);

      await expect(
        getInvitationTokenContext('raw-token', 'other@example.com'),
      ).rejects.toThrowError(InvitationFlowError);
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
    it('Boundary test: succeeds when token expires in exactly 1 millisecond', async () => {
      const now = new Date('2026-07-14T12:00:00.000Z');
      const tokenExpiresIn1Ms = buildMockInvitationToken({
        expiresAt: new Date('2026-07-14T12:00:00.001Z'),
      });
      invitationRepoMock.findInvitationTokenByHash.mockResolvedValue(tokenExpiresIn1Ms);
      invitationRepoMock.findUserByEmailWithProfiles.mockResolvedValue(mockExistingTraineeUser);
      invitationRepoMock.updateUserRoleAndProfilesFromInvitation.mockResolvedValue({
        userType: 'ORGANISATION_TRAINEE',
        traineeProfileId: 'tp-1',
      });

      const res = await acceptInvitationWithToken(
        'raw-token',
        {},
        undefined,
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
        expiresAt: new Date('2026-07-14T11:59:59.999Z'),
      });
      invitationRepoMock.findInvitationTokenByHash.mockResolvedValue(tokenExpired1MsAgo);
      invitationRepoMock.findUserByEmailWithProfiles.mockResolvedValue(mockExistingTraineeUser);

      await expect(
        acceptInvitationWithToken('raw-token', {}, undefined, undefined, undefined, now),
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 409,
          errorKey: 'INVITATION_EXPIRED',
        }),
      );
    });

    it('Concurrency test: throws 409 Conflict when double submission occurs on claimInvitationAccept', async () => {
      invitationRepoMock.findInvitationTokenByHash.mockResolvedValue(mockValidToken);
      invitationRepoMock.findUserByEmailWithProfiles.mockResolvedValue(mockExistingTraineeUser);

      // Simulate double submission throwing conflict on second attempt or inside transaction
      invitationRepoMock.claimInvitationAccept.mockRejectedValueOnce(
        new invitationRepoMock.InvitationRepositoryConflictError(
          'INVITATION_ALREADY_ACCEPTED_OR_RESOLVED',
          'Invitation has already been accepted or resolved concurrently.',
        ),
      );

      await expect(acceptInvitationWithToken('raw-token', {})).rejects.toThrow(
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

      await expect(acceptInvitationWithToken('raw-token', {})).rejects.toThrow(
        expect.objectContaining({
          statusCode: 409,
          errorKey: 'ROLE_CONFLICT',
          message: 'Platform administrators cannot accept organisation trainee invitations.',
        }),
      );
    });

    it('Audit test: verifies exact AUDITLOGENTRY payload received by Prisma transaction mock on acceptance', async () => {
      invitationRepoMock.findInvitationTokenByHash.mockResolvedValue(mockValidToken);
      invitationRepoMock.findUserByEmailWithProfiles.mockResolvedValue(mockExistingTraineeUser);
      invitationRepoMock.updateUserRoleAndProfilesFromInvitation.mockResolvedValue({
        userType: 'ORGANISATION_TRAINEE',
        traineeProfileId: 'tp-1',
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
          actorUserId: mockExistingTraineeUser.id,
          actorType: 'ORGANISATION_TRAINEE',
          organisationId: 'org-1',
          targetType: 'INVITATION',
          targetId: 'inv-1',
          actionType: 'ACCEPTED',
          outcome: 'SUCCESS',
          oldValues: {
            userType: 'ORGANISATION_TRAINEE',
          },
          newValues: {
            userType: 'ORGANISATION_TRAINEE',
            role: 'ORGANISATION_TRAINEE',
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

      const res = await acceptInvitationWithToken('raw-token', { confirmRoleChange: true });
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
  });
});

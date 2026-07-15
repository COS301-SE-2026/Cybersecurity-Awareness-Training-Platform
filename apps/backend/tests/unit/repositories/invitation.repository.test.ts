import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  findInvitationTokenByHash,
  findInvitationById,
  findUserByEmailWithProfiles,
  claimInvitationAccept,
  claimInvitationReject,
  claimInvitationToken,
  insertInvitationPermissionGrantsToAdmin,
  updateUserRoleAndProfilesFromInvitation,
  InvitationRepositoryConflictError,
} from '../../../src/repositories/invitation.repository.js';
import { prisma } from '../../../src/lib/prisma.js';

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    actionToken: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    invitation: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    organisationAdminPermission: {
      createMany: vi.fn(),
    },
    organisationAdminProfile: {
      upsert: vi.fn(),
    },
    traineeProfile: {
      upsert: vi.fn(),
    },
    organisationTraineeProfile: {
      upsert: vi.fn(),
    },
    ipAdminProfile: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock('../../../src/repositories/security-settings.repository.js', () => ({
  ensureDefaultOrganisationSecuritySettings: vi.fn().mockResolvedValue(undefined),
}));

describe('invitation.repository unit tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('finders', () => {
    it('findInvitationTokenByHash calls findUnique with include tree', async () => {
      vi.mocked(prisma.actionToken.findUnique).mockResolvedValue({ id: 'token-1' } as any);
      const res = await findInvitationTokenByHash('hash123');
      expect(prisma.actionToken.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tokenHash: 'hash123' } }),
      );
      expect(res).toEqual({ id: 'token-1' });
    });

    it('findInvitationById calls findUnique with include tree', async () => {
      vi.mocked(prisma.invitation.findUnique).mockResolvedValue({ id: 'inv-1' } as any);
      const res = await findInvitationById('inv-1');
      expect(prisma.invitation.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'inv-1' } }),
      );
      expect(res).toEqual({ id: 'inv-1' });
    });

    it('findUserByEmailWithProfiles calls findUnique with profiles include', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-1' } as any);
      const res = await findUserByEmailWithProfiles('test@example.com');
      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'test@example.com' } }),
      );
      expect(res).toEqual({ id: 'user-1' });
    });
  });

  describe('claim methods', () => {
    it('claimInvitationAccept updates pending invitation to ACCEPTED', async () => {
      const txMock = {
        invitation: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      } as any;
      await expect(claimInvitationAccept('inv-1', txMock)).resolves.toBeUndefined();
      expect(txMock.invitation.updateMany).toHaveBeenCalledWith({
        where: { id: 'inv-1', status: { in: ['PENDING', 'SENT', 'FAILED_TO_SEND'] } },
        data: { status: 'ACCEPTED', acceptedAt: expect.any(Date) },
      });
    });

    it('claimInvitationAccept throws conflict error if count is not 1', async () => {
      const txMock = {
        invitation: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      } as any;
      await expect(claimInvitationAccept('inv-1', txMock)).rejects.toThrow(
        InvitationRepositoryConflictError,
      );
    });

    it('claimInvitationReject updates pending invitation to REJECTED', async () => {
      const txMock = {
        invitation: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      } as any;
      await expect(claimInvitationReject('inv-1', txMock)).resolves.toBeUndefined();
      expect(txMock.invitation.updateMany).toHaveBeenCalledWith({
        where: { id: 'inv-1', status: { in: ['PENDING', 'SENT', 'FAILED_TO_SEND'] } },
        data: { status: 'REJECTED' },
      });
    });

    it('claimInvitationReject throws conflict error if count is not 1', async () => {
      const txMock = {
        invitation: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      } as any;
      await expect(claimInvitationReject('inv-1', txMock)).rejects.toThrow(
        InvitationRepositoryConflictError,
      );
    });

    it('claimInvitationToken marks token as used', async () => {
      const txMock = {
        actionToken: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      } as any;
      await expect(claimInvitationToken('tok-1', txMock)).resolves.toBeUndefined();
      expect(txMock.actionToken.updateMany).toHaveBeenCalledWith({
        where: { id: 'tok-1', usedAt: null, revokedAt: null },
        data: { usedAt: expect.any(Date) },
      });
    });

    it('claimInvitationToken throws conflict error if count is not 1', async () => {
      const txMock = {
        actionToken: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      } as any;
      await expect(claimInvitationToken('tok-1', txMock)).rejects.toThrow(
        InvitationRepositoryConflictError,
      );
    });
  });

  describe('insertInvitationPermissionGrantsToAdmin', () => {
    it('does nothing when grants array is empty', async () => {
      const txMock = { organisationAdminPermission: { createMany: vi.fn() } } as any;
      await insertInvitationPermissionGrantsToAdmin('org-1', 'adm-1', [], txMock);
      expect(txMock.organisationAdminPermission.createMany).not.toHaveBeenCalled();
    });

    it('creates grants when array has items', async () => {
      const txMock = { organisationAdminPermission: { createMany: vi.fn() } } as any;
      await insertInvitationPermissionGrantsToAdmin(
        'org-1',
        'adm-1',
        [{ organisationPermissionId: 'perm-1' }],
        txMock,
      );
      expect(txMock.organisationAdminPermission.createMany).toHaveBeenCalledWith({
        data: [
          {
            organisationId: 'org-1',
            organisationAdminId: 'adm-1',
            organisationPermissionId: 'perm-1',
          },
        ],
        skipDuplicates: true,
      });
    });
  });

  describe('updateUserRoleAndProfilesFromInvitation', () => {
    it('assigns ORGANISATION_ADMIN role and upserts admin profile', async () => {
      const txMock = {
        user: { update: vi.fn().mockResolvedValue({}) },
        organisationAdminProfile: { upsert: vi.fn().mockResolvedValue({ id: 'profile-adm-1' }) },
        invitation: { update: vi.fn().mockResolvedValue({}) },
      } as any;

      const res = await updateUserRoleAndProfilesFromInvitation(
        {
          userId: 'usr-1',
          newRole: 'ORGANISATION_ADMIN',
          organisationId: 'org-1',
          invitationId: 'inv-1',
        },
        txMock,
      );

      expect(res).toEqual({ userType: 'ORGANISATION_ADMIN', adminProfileId: 'profile-adm-1' });
      expect(txMock.user.update).toHaveBeenCalled();
      expect(txMock.organisationAdminProfile.upsert).toHaveBeenCalled();
      expect(txMock.invitation.update).toHaveBeenCalled();
    });

    it('throws error when assigning ORGANISATION_ADMIN without organisationId', async () => {
      const txMock = {} as any;
      await expect(
        updateUserRoleAndProfilesFromInvitation(
          { userId: 'usr-1', newRole: 'ORGANISATION_ADMIN', organisationId: null },
          txMock,
        ),
      ).rejects.toThrow('organisationId is required when assigning ORGANISATION_ADMIN role.');
    });

    it('assigns ORGANISATION_TRAINEE role and upserts trainee profiles', async () => {
      const txMock = {
        user: { update: vi.fn().mockResolvedValue({}) },
        traineeProfile: { upsert: vi.fn().mockResolvedValue({ id: 'tr-profile-1' }) },
        organisationTraineeProfile: {
          upsert: vi.fn().mockResolvedValue({ traineeProfileId: 'tr-profile-1' }),
        },
        invitation: { update: vi.fn().mockResolvedValue({}) },
      } as any;

      const res = await updateUserRoleAndProfilesFromInvitation(
        {
          userId: 'usr-1',
          newRole: 'ORGANISATION_TRAINEE',
          organisationId: 'org-1',
          invitationId: 'inv-1',
        },
        txMock,
      );

      expect(res).toEqual({
        userType: 'ORGANISATION_TRAINEE',
        traineeProfileId: 'tr-profile-1',
        orgTraineeProfileId: 'tr-profile-1',
      });
    });

    it('throws error when assigning ORGANISATION_TRAINEE without organisationId', async () => {
      const txMock = {} as any;
      await expect(
        updateUserRoleAndProfilesFromInvitation(
          { userId: 'usr-1', newRole: 'ORGANISATION_TRAINEE', organisationId: null },
          txMock,
        ),
      ).rejects.toThrow('organisationId is required when assigning ORGANISATION_TRAINEE role.');
    });

    it('assigns IP_ADMIN or PLATFORM_ADMIN role and upserts IP admin profile', async () => {
      const txMock = {
        user: { update: vi.fn().mockResolvedValue({}) },
        ipAdminProfile: { upsert: vi.fn().mockResolvedValue({ id: 'ip-prof-1' }) },
      } as any;

      const res = await updateUserRoleAndProfilesFromInvitation(
        { userId: 'usr-1', newRole: 'IP_ADMIN' },
        txMock,
      );

      expect(res).toEqual({ userType: 'IP_ADMIN' });
      expect(txMock.ipAdminProfile.upsert).toHaveBeenCalled();
    });

    it('throws error for unsupported role assignment', async () => {
      const txMock = {} as any;
      await expect(
        updateUserRoleAndProfilesFromInvitation(
          { userId: 'usr-1', newRole: 'INVALID_ROLE' as any },
          txMock,
        ),
      ).rejects.toThrow('Unsupported role assignment: INVALID_ROLE');
    });
  });
});

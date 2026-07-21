import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  listPlatformAdmins,
  invitePlatformAdmin,
  resendPlatformAdminInvite,
  transferSuperAdmin,
  demotePlatformAdmin,
  PlatformAdminServiceError,
} from '../../src/services/platform-admin.service.js';

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  ipAdminProfile: {
    findUnique: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  actionToken: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  organisationRegistrationRequest: {
    findFirst: vi.fn(),
  },
  invitation: {
    findFirst: vi.fn(),
  },
  traineeProfile: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  generalTraineeProfile: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  authSession: {
    updateMany: vi.fn(),
  },
  refreshToken: {
    updateMany: vi.fn(),
  },
  $transaction: vi.fn((callback) => callback(prismaMock)),
  $queryRaw: vi.fn().mockResolvedValue([]),
  $executeRaw: vi.fn().mockResolvedValue(0),
}));

const emailMock = vi.hoisted(() => ({
  sendEmail: vi.fn(),
}));

const auditLogMock = vi.hoisted(() => ({
  recordAuditLog: vi.fn(),
}));

const passwordMock = vi.hoisted(() => ({
  verifyPassword: vi.fn(),
}));

const authMock = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

vi.mock('../../src/services/email.service.js', () => emailMock);
vi.mock('../../src/services/audit-log.service.js', () => auditLogMock);
vi.mock('../../src/services/password.service.js', () => passwordMock);
vi.mock('../../src/services/auth.service.js', () => authMock);

const superActorId = 'actor-super-admin-uuid';
const normalActorId = 'actor-normal-admin-uuid';
const targetAdminId = 'target-admin-uuid';
const traineeId = 'trainee-user-uuid';
const actionTokenId = 'action-token-uuid';

describe('platform admin service tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock actor as super admin
    prismaMock.user.findUnique.mockImplementation(async ({ where }) => {
      if (where.id === superActorId) {
        return {
          id: superActorId,
          userType: 'IP_ADMIN',
          passwordHash: 'hashed-pwd',
          ipAdminProfile: { platformAdminRole: 'SUPER_ADMIN', adminStatus: 'ACTIVE' },
        };
      }
      if (where.id === normalActorId) {
        return {
          id: normalActorId,
          userType: 'IP_ADMIN',
          passwordHash: 'hashed-pwd',
          ipAdminProfile: { platformAdminRole: 'NORMAL_ADMIN', adminStatus: 'ACTIVE' },
        };
      }
      return null;
    });
  });

  // Test listng of platform admins and checks
  describe('listPlatformAdmins', () => {
    it('lists platform admins and pending upgrade invitations', async () => {
      prismaMock.user.findMany.mockResolvedValue([
        {
          id: superActorId,
          firstName: 'Super',
          lastName: 'Admin',
          email: 'super@ip.com',
          userType: 'IP_ADMIN',
          authStatus: 'ACTIVE',
          ipAdminProfile: { platformAdminRole: 'SUPER_ADMIN', adminStatus: 'ACTIVE' },
          actionTokens: [],
        },
        {
          id: 'invited-admin-uuid',
          firstName: 'Invited',
          lastName: 'User',
          email: 'invited@ip.com',
          userType: 'IP_ADMIN',
          authStatus: 'PENDING_INVITE_SETUP',
          ipAdminProfile: { platformAdminRole: 'NORMAL_ADMIN', adminStatus: 'ACTIVE' },
          actionTokens: [{ id: 'active-token-id', expiresAt: new Date(Date.now() + 1000) }],
        },
      ]);

      prismaMock.actionToken.findMany.mockResolvedValue([
        {
          id: 'upgrade-token-id',
          purpose: 'PLATFORM_ADMIN_UPGRADE_CONFIRMATION',
          user: {
            id: traineeId,
            firstName: 'Trainee',
            lastName: 'Upgradable',
            email: 'trainee@org.com',
            userType: 'GENERAL_TRAINEE',
            authStatus: 'ACTIVE',
          },
        },
      ]);

      const result = await listPlatformAdmins(superActorId);

      expect(result.admins).toHaveLength(3);
      expect(result.allowedToInvite).toBe(true);
      const superRow = result.admins.find((a) => a.id === superActorId);
      expect(superRow?.allowedActions.canDemote).toBe(false);
      const invitedRow = result.admins.find((a) => a.id === 'invited-admin-uuid');
      expect(invitedRow?.allowedActions.canResendInvite).toBe(true);
      const upgradeRow = result.admins.find((a) => a.id === traineeId);
      expect(upgradeRow?.invitationStatus).toBe('PENDING_UPGRADE');
    });

    it('hides write actions if actor is normal platform admin', async () => {
      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.actionToken.findMany.mockResolvedValue([]);

      const result = await listPlatformAdmins(normalActorId);
      expect(result.allowedToInvite).toBe(false);
    });
  });

  // Send platfrom admin invitation unit tests
  describe('invitePlatformAdmin', () => {
    it('throws Forbidden if actor is not super admin', async () => {
      await expect(
        invitePlatformAdmin(normalActorId, { email: 'new@ip.com' }),
      ).rejects.toThrowError(
        new PlatformAdminServiceError(403, 'FORBIDDEN', 'Super admin access is required'),
      );
    });

    it('throws Conflict if target is pending representative of organization request', async () => {
      prismaMock.organisationRegistrationRequest.findFirst.mockResolvedValue({ id: 'req-1' });

      await expect(
        invitePlatformAdmin(superActorId, { email: 'rep@org.com' }),
      ).rejects.toThrowError(
        new PlatformAdminServiceError(
          409,
          'PENDING_ORGANISATION_REPRESENTATIVE_CONFLICT',
          'The email belongs to a pending organisation representative',
        ),
      );
    });

    it('throws Conflict if target email is already active platform admin', async () => {
      prismaMock.organisationRegistrationRequest.findFirst.mockResolvedValue(null);
      prismaMock.user.findUnique.mockImplementation(async ({ where }) => {
        if (where.id === superActorId) {
          return {
            id: superActorId,
            userType: 'IP_ADMIN',
            passwordHash: 'hashed-pwd',
            ipAdminProfile: { platformAdminRole: 'SUPER_ADMIN', adminStatus: 'ACTIVE' },
          };
        }
        if (where.email === 'existing@ip.com') {
          return {
            id: targetAdminId,
            userType: 'IP_ADMIN',
            authStatus: 'ACTIVE',
            ipAdminProfile: { platformAdminRole: 'NORMAL_ADMIN', adminStatus: 'ACTIVE' },
          };
        }
        return null;
      });

      await expect(
        invitePlatformAdmin(superActorId, { email: 'existing@ip.com' }),
      ).rejects.toThrowError(
        new PlatformAdminServiceError(
          409,
          'EXISTING_PLATFORM_ADMIN',
          'User is already a platform administrator',
        ),
      );
    });

    it('sends upgrade confirmation email if target email belongs to general trainee', async () => {
      prismaMock.organisationRegistrationRequest.findFirst.mockResolvedValue(null);
      prismaMock.user.findUnique.mockImplementation(async ({ where }) => {
        if (where.id === superActorId) {
          return {
            id: superActorId,
            userType: 'IP_ADMIN',
            passwordHash: 'hashed-pwd',
            ipAdminProfile: { platformAdminRole: 'SUPER_ADMIN', adminStatus: 'ACTIVE' },
          };
        }
        if (where.email === 'trainee@ip.com') {
          return {
            id: traineeId,
            userType: 'GENERAL_TRAINEE',
            authStatus: 'ACTIVE',
            firstName: 'Bob',
            email: 'trainee@ip.com',
          };
        }
        return null;
      });
      prismaMock.actionToken.findFirst.mockResolvedValue(null);
      prismaMock.actionToken.create.mockResolvedValue({ id: actionTokenId });

      const result = await invitePlatformAdmin(superActorId, {
        email: 'trainee@ip.com',
        confirmUpgrade: true,
      });

      expect(result.type).toBe('upgrade-confirmation');
      expect(emailMock.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          emailType: 'PLATFORM_ADMIN_UPGRADE_CONFIRMATION',
          recipientEmail: 'trainee@ip.com',
        }),
      );
      expect(auditLogMock.recordAuditLog).toHaveBeenCalled();
    });

    it('creates pending user and sends setup invite email if target does not exist', async () => {
      prismaMock.organisationRegistrationRequest.findFirst.mockResolvedValue(null);
      prismaMock.user.findUnique.mockImplementation(async ({ where }) => {
        if (where.id === superActorId) {
          return {
            id: superActorId,
            userType: 'IP_ADMIN',
            passwordHash: 'hashed-pwd',
            ipAdminProfile: { platformAdminRole: 'SUPER_ADMIN', adminStatus: 'ACTIVE' },
          };
        }
        return null;
      });
      prismaMock.user.create.mockResolvedValue({
        id: 'new-user-uuid',
        email: 'new@ip.com',
        firstName: 'Alice',
      });
      prismaMock.actionToken.create.mockResolvedValue({ id: actionTokenId });

      const result = await invitePlatformAdmin(superActorId, {
        email: 'new@ip.com',
        firstName: 'Alice',
      });

      expect(result.type).toBe('new-invite');
      expect(emailMock.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          emailType: 'PLATFORM_ADMIN_INVITE',
          recipientEmail: 'new@ip.com',
        }),
      );
    });
  });

  // Resend platform admin invite token tests
  describe('resendPlatformAdminInvite', () => {
    it('revokes old action token and issues new invite email', async () => {
      prismaMock.actionToken.findUnique.mockResolvedValue({
        id: actionTokenId,
        purpose: 'PLATFORM_ADMIN_INVITE',
        userId: 'pending-user-uuid',
        usedAt: null,
        user: { email: 'pending@ip.com', firstName: 'Pending' },
      });
      prismaMock.actionToken.create.mockResolvedValue({ id: 'new-token-uuid' });

      const result = await resendPlatformAdminInvite(superActorId, actionTokenId);

      expect(result.success).toBe(true);
      expect(prismaMock.actionToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: actionTokenId },
          data: expect.objectContaining({ revokedReason: 'RESENT' }),
        }),
      );
      expect(emailMock.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          emailType: 'PLATFORM_ADMIN_INVITE',
          recipientEmail: 'pending@ip.com',
        }),
      );
    });
  });

  // Super admin transfr unit tests
  describe('transferSuperAdmin', () => {
    it('throws if password verification fails', async () => {
      passwordMock.verifyPassword.mockResolvedValue(false);

      await expect(
        transferSuperAdmin(superActorId, {
          targetUserId: targetAdminId,
          password: 'wrong-password',
          confirmation: 'TRANSFER',
        }),
      ).rejects.toThrowError(
        new PlatformAdminServiceError(
          403,
          'PLATFORM_ADMIN_PASSWORD_INVALID',
          'Password confirmation failed',
        ),
      );
    });

    it('swaps super admin role transactionaly and sends role change notification emails', async () => {
      passwordMock.verifyPassword.mockResolvedValue(true);
      prismaMock.user.findUnique.mockImplementation(async ({ where }) => {
        if (where.id === superActorId) {
          return {
            id: superActorId,
            email: 'super@ip.com',
            userType: 'IP_ADMIN',
            ipAdminProfile: { platformAdminRole: 'SUPER_ADMIN', adminStatus: 'ACTIVE' },
          };
        }
        if (where.id === targetAdminId) {
          return {
            id: targetAdminId,
            email: 'target@ip.com',
            userType: 'IP_ADMIN',
            ipAdminProfile: { platformAdminRole: 'NORMAL_ADMIN', adminStatus: 'ACTIVE' },
          };
        }
        return null;
      });
      prismaMock.ipAdminProfile.findUnique.mockImplementation(async ({ where }) => {
        if (where.userId === superActorId) {
          return { platformAdminRole: 'SUPER_ADMIN', adminStatus: 'ACTIVE' };
        }
        if (where.userId === targetAdminId) {
          return { platformAdminRole: 'NORMAL_ADMIN', adminStatus: 'ACTIVE' };
        }
        return null;
      });
      prismaMock.ipAdminProfile.count.mockResolvedValue(1);
      authMock.getCurrentUser.mockResolvedValue({ user: { id: superActorId } });

      await transferSuperAdmin(superActorId, {
        targetUserId: targetAdminId,
        password: 'correct-password',
        confirmation: 'TRANSFER',
      });

      expect(prismaMock.ipAdminProfile.update).toHaveBeenCalledTimes(2);
      expect(emailMock.sendEmail).toHaveBeenCalledTimes(2);
      expect(auditLogMock.recordAuditLog).toHaveBeenCalledTimes(2);
    });
  });

  // Demoting a normal platform admin tests
  describe('demotePlatformAdmin', () => {
    it('throws Conflict if demoting self', async () => {
      await expect(
        demotePlatformAdmin(superActorId, superActorId, {
          password: 'pwd',
          confirmation: 'DEMOTE',
        }),
      ).rejects.toThrowError(
        new PlatformAdminServiceError(409, 'SELF_DEMOTION_CONFLICT', 'You cannot demote yourself'),
      );
    });

    it('disables normal platform admin profile and revokes sessions and refresh tokens', async () => {
      passwordMock.verifyPassword.mockResolvedValue(true);
      prismaMock.user.findUnique.mockImplementation(async ({ where }) => {
        if (where.id === superActorId) {
          return {
            id: superActorId,
            userType: 'IP_ADMIN',
            ipAdminProfile: { platformAdminRole: 'SUPER_ADMIN', adminStatus: 'ACTIVE' },
          };
        }
        if (where.id === targetAdminId) {
          return {
            id: targetAdminId,
            email: 'target@ip.com',
            userType: 'IP_ADMIN',
            ipAdminProfile: { platformAdminRole: 'NORMAL_ADMIN', adminStatus: 'ACTIVE' },
          };
        }
        return null;
      });

      const result = await demotePlatformAdmin(superActorId, targetAdminId, {
        password: 'correct-password',
        confirmation: 'DEMOTE',
      });

      expect(result.adminStatus).toBe('DISABLED');
      expect(prismaMock.ipAdminProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: targetAdminId },
          data: expect.objectContaining({ adminStatus: 'DISABLED' }),
        }),
      );
      expect(prismaMock.authSession.updateMany).toHaveBeenCalled();
      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalled();
      expect(emailMock.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          emailType: 'ROLE_CHANGED_NOTIFICATION',
          recipientEmail: 'target@ip.com',
        }),
      );
    });

    it('throws Conflict if target is already a pending platform admin invite', async () => {
      prismaMock.organisationRegistrationRequest.findFirst.mockResolvedValue(null);
      prismaMock.user.findUnique.mockImplementation(async ({ where }) => {
        if (where.id === superActorId) {
          return {
            id: superActorId,
            userType: 'IP_ADMIN',
            passwordHash: 'hashed-pwd',
            ipAdminProfile: { platformAdminRole: 'SUPER_ADMIN', adminStatus: 'ACTIVE' },
          };
        }
        if (where.email === 'pending@ip.com') {
          return {
            id: 'pending-admin-uuid',
            userType: 'IP_ADMIN',
            authStatus: 'PENDING_INVITE_SETUP',
          };
        }
        return null;
      });

      await expect(
        invitePlatformAdmin(superActorId, { email: 'pending@ip.com' }),
      ).rejects.toThrowError(
        new PlatformAdminServiceError(
          409,
          'PENDING_PLATFORM_ADMIN_INVITE',
          'There is already a pending platform admin invite for this email',
        ),
      );
    });

    it('throws Conflict if target is an organisation admin', async () => {
      prismaMock.organisationRegistrationRequest.findFirst.mockResolvedValue(null);
      prismaMock.user.findUnique.mockImplementation(async ({ where }) => {
        if (where.id === superActorId) {
          return {
            id: superActorId,
            userType: 'IP_ADMIN',
            passwordHash: 'hashed-pwd',
            ipAdminProfile: { platformAdminRole: 'SUPER_ADMIN', adminStatus: 'ACTIVE' },
          };
        }
        if (where.email === 'orgadmin@ip.com') {
          return {
            id: 'org-admin-uuid',
            userType: 'ORGANISATION_ADMIN',
            authStatus: 'ACTIVE',
          };
        }
        return null;
      });

      await expect(
        invitePlatformAdmin(superActorId, { email: 'orgadmin@ip.com' }),
      ).rejects.toThrowError(
        new PlatformAdminServiceError(
          409,
          'ORGANISATION_ADMIN_CONFLICT',
          'An organisation administrator cannot be invited as a platform administrator',
        ),
      );
    });

    it('throws Conflict if trainee has active upgrade confirmation', async () => {
      prismaMock.organisationRegistrationRequest.findFirst.mockResolvedValue(null);
      prismaMock.user.findUnique.mockImplementation(async ({ where }) => {
        if (where.id === superActorId) {
          return {
            id: superActorId,
            userType: 'IP_ADMIN',
            passwordHash: 'hashed-pwd',
            ipAdminProfile: { platformAdminRole: 'SUPER_ADMIN', adminStatus: 'ACTIVE' },
          };
        }
        if (where.email === 'trainee@ip.com') {
          return {
            id: traineeId,
            userType: 'GENERAL_TRAINEE',
            authStatus: 'ACTIVE',
            firstName: 'Bob',
            email: 'trainee@ip.com',
          };
        }
        return null;
      });
      prismaMock.actionToken.findFirst.mockResolvedValue({ id: 'existing-upgrade-token' });

      await expect(
        invitePlatformAdmin(superActorId, { email: 'trainee@ip.com', confirmUpgrade: true }),
      ).rejects.toThrowError(
        new PlatformAdminServiceError(
          409,
          'PENDING_PLATFORM_ADMIN_INVITE',
          'There is already a pending platform admin upgrade invite for this user',
        ),
      );
    });

    it('throws if old invite token has wrong purpose', async () => {
      prismaMock.actionToken.findUnique.mockResolvedValue({
        id: actionTokenId,
        purpose: 'EMAIL_VERIFICATION',
        usedAt: null,
      });

      await expect(resendPlatformAdminInvite(superActorId, actionTokenId)).rejects.toThrowError(
        new PlatformAdminServiceError(404, 'INVITATION_NOT_FOUND', 'Invitation token not found'),
      );
    });

    it('throws if old invite token is already used', async () => {
      prismaMock.actionToken.findUnique.mockResolvedValue({
        id: actionTokenId,
        purpose: 'PLATFORM_ADMIN_INVITE',
        usedAt: new Date(),
      });

      await expect(resendPlatformAdminInvite(superActorId, actionTokenId)).rejects.toThrowError(
        new PlatformAdminServiceError(
          409,
          'INVITATION_ALREADY_USED',
          'Invitation has already been used',
        ),
      );
    });

    it('throws if target email is missing on invite token resend', async () => {
      prismaMock.actionToken.findUnique.mockResolvedValue({
        id: actionTokenId,
        purpose: 'PLATFORM_ADMIN_INVITE',
        usedAt: null,
        user: null,
        targetEmail: null,
      });

      await expect(resendPlatformAdminInvite(superActorId, actionTokenId)).rejects.toThrowError(
        new PlatformAdminServiceError(400, 'BAD_REQUEST', 'No email associated with invitation'),
      );
    });

    it('throws if target is not active platform admin on transfer', async () => {
      passwordMock.verifyPassword.mockResolvedValue(true);
      prismaMock.user.findUnique.mockImplementation(async ({ where }) => {
        if (where.id === superActorId) {
          return {
            id: superActorId,
            userType: 'IP_ADMIN',
            ipAdminProfile: { platformAdminRole: 'SUPER_ADMIN', adminStatus: 'ACTIVE' },
          };
        }
        if (where.id === targetAdminId) {
          return {
            id: targetAdminId,
            userType: 'IP_ADMIN',
            ipAdminProfile: { platformAdminRole: 'NORMAL_ADMIN', adminStatus: 'DISABLED' },
          };
        }
        return null;
      });

      await expect(
        transferSuperAdmin(superActorId, {
          targetUserId: targetAdminId,
          password: 'correct-password',
          confirmation: 'TRANSFER',
        }),
      ).rejects.toThrowError(
        new PlatformAdminServiceError(
          409,
          'STALE_SUPER_ADMIN_TRANSFER',
          'Stale request: Target is no longer an active normal platform admin',
        ),
      );
    });

    it('throws if target admin is already disabled on demote', async () => {
      passwordMock.verifyPassword.mockResolvedValue(true);
      prismaMock.user.findUnique.mockImplementation(async ({ where }) => {
        if (where.id === superActorId) {
          return {
            id: superActorId,
            userType: 'IP_ADMIN',
            ipAdminProfile: { platformAdminRole: 'SUPER_ADMIN', adminStatus: 'ACTIVE' },
          };
        }
        if (where.id === targetAdminId) {
          return {
            id: targetAdminId,
            userType: 'IP_ADMIN',
            ipAdminProfile: { platformAdminRole: 'NORMAL_ADMIN', adminStatus: 'DISABLED' },
          };
        }
        return null;
      });

      await expect(
        demotePlatformAdmin(superActorId, targetAdminId, {
          password: 'correct-password',
          confirmation: 'DEMOTE',
        }),
      ).rejects.toThrowError(
        new PlatformAdminServiceError(
          409,
          'PLATFORM_ADMIN_ALREADY_DEMOTED',
          'Platform admin is already demoted',
        ),
      );
    });

    it('throws if target is super admin on demote', async () => {
      passwordMock.verifyPassword.mockResolvedValue(true);
      prismaMock.user.findUnique.mockImplementation(async ({ where }) => {
        if (where.id === superActorId) {
          return {
            id: superActorId,
            userType: 'IP_ADMIN',
            ipAdminProfile: { platformAdminRole: 'SUPER_ADMIN', adminStatus: 'ACTIVE' },
          };
        }
        if (where.id === targetAdminId) {
          return {
            id: targetAdminId,
            userType: 'IP_ADMIN',
            ipAdminProfile: { platformAdminRole: 'SUPER_ADMIN', adminStatus: 'ACTIVE' },
          };
        }
        return null;
      });

      await expect(
        demotePlatformAdmin(superActorId, targetAdminId, {
          password: 'correct-password',
          confirmation: 'DEMOTE',
        }),
      ).rejects.toThrowError(
        new PlatformAdminServiceError(
          409,
          'SUPER_ADMIN_DEMOTION_BLOCKED',
          'Super admin roles cannot be directly demoted without a transfer first',
        ),
      );
    });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrganisationPermissionKey } from '../../../src/generated/prisma/enums.js';
import { OrganisationAdminServiceError } from '../../../src/services/organisation-admin.service.js';
import {
  createOrganisationTraineeInvitation,
  disableOrganisationTrainee,
  listOrganisationTrainees,
  resendTraineeInvitation,
  revokeTraineeInvitation,
} from '../../../src/services/organisation-trainee.service.js';
import {
  buildMockActorAdmin,
  buildMockInvitation,
  buildMockTraineeProfile,
  mockActionTokenId,
  mockActorUserId,
  mockInvitationId,
  mockOrgId,
  mockTraineeId,
} from '../helpers/organisation-trainee.fixtures.js';

const traineeRepoMock = vi.hoisted(() => ({
  findOrganisationTrainees: vi.fn(),
  findOrganisationTraineeInvitations: vi.fn(),
  findOrganisationTraineeByEmail: vi.fn(),
  findPendingTraineeInvitationByEmail: vi.fn(),
  findOrganisationTraineeById: vi.fn(),
  disableOrganisationTraineeProfile: vi.fn(),
}));

const invitationRepoMock = vi.hoisted(() => ({
  findInvitationById: vi.fn(),
  findUserByEmailWithProfiles: vi.fn(),
}));

const authSessionRepoMock = vi.hoisted(() => ({
  revokeUserAuthSessions: vi.fn(),
}));

const orgAdminRepoMock = vi.hoisted(() => ({
  findActorOrganisationAdmin: vi.fn(),
}));

const tokenHashMock = vi.hoisted(() => ({
  generateOpaqueToken: vi.fn().mockReturnValue('raw-opaque-token-12345'),
  hashOpaqueToken: vi.fn().mockReturnValue('hashed-opaque-token-12345'),
}));

const auditLogMock = vi.hoisted(() => ({
  recordAuditLog: vi.fn(),
}));

const emailMock = vi.hoisted(() => ({
  sendEmail: vi.fn(),
}));

const passwordMock = vi.hoisted(() => ({
  verifyPassword: vi.fn(),
}));

vi.mock('../../../src/repositories/organisation-trainee.repository.js', () => traineeRepoMock);
vi.mock('../../../src/repositories/invitation.repository.js', () => invitationRepoMock);
vi.mock('../../../src/repositories/auth-session.repository.js', () => authSessionRepoMock);
vi.mock('../../../src/repositories/organisation-admin.repository.js', () => orgAdminRepoMock);
vi.mock('../../../src/services/token-hash.service.js', () => tokenHashMock);
vi.mock('../../../src/services/audit-log.service.js', () => auditLogMock);
vi.mock('../../../src/services/email.service.js', () => emailMock);
vi.mock('../../../src/services/password.service.js', () => passwordMock);

const txMock = {
  invitation: {
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  actionToken: {
    create: vi.fn(),
    updateMany: vi.fn(),
  },
};

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn(async (cb: (tx: typeof txMock) => unknown) => cb(txMock)),
  },
}));

describe('OrganisationTraineeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orgAdminRepoMock.findActorOrganisationAdmin.mockResolvedValue(
      buildMockActorAdmin([
        OrganisationPermissionKey.VIEW_ORGANISATION_TRAINEES,
        OrganisationPermissionKey.INVITE_ORGANISATION_TRAINEES,
        OrganisationPermissionKey.REMOVE_ORGANISATION_TRAINEES,
      ]),
    );
  });

  describe('listOrganisationTrainees', () => {
    it('returns formatted trainees and pending invitations on success', async () => {
      orgAdminRepoMock.findActorOrganisationAdmin.mockResolvedValue(
        buildMockActorAdmin([OrganisationPermissionKey.VIEW_ORGANISATION_TRAINEES]),
      );

      const activeTrainee = buildMockTraineeProfile({
        id: 'trainee-1',
        membershipStatus: 'ACTIVE',
      });
      const disabledTrainee = buildMockTraineeProfile({
        id: 'trainee-2',
        membershipStatus: 'DISABLED',
        disabledAt: new Date('2026-07-15T10:00:00.000Z'),
        disabledReason: 'Security risk',
      });
      traineeRepoMock.findOrganisationTrainees.mockResolvedValue([activeTrainee, disabledTrainee]);

      const pendingInvite = buildMockInvitation({ id: 'inv-1', status: 'PENDING' });
      const acceptedInvite = buildMockInvitation({ id: 'inv-2', status: 'ACCEPTED' });
      traineeRepoMock.findOrganisationTraineeInvitations.mockResolvedValue([
        pendingInvite,
        acceptedInvite,
      ]);

      const result = await listOrganisationTrainees(mockActorUserId, mockOrgId);

      expect(result).toHaveLength(3);
      expect(result[0]?.status).toBe('ACTIVE');
      expect(result[1]?.status).toBe('DISABLED');

      expect(result[2]?.status).toBe('INVITE_PENDING');
    });

    it('throws PermissionError (403) when actor lacks VIEW_ORGANISATION_TRAINEES permission', async () => {
      orgAdminRepoMock.findActorOrganisationAdmin.mockResolvedValue(
        buildMockActorAdmin(['SOME_OTHER_PERMISSION']),
      );

      await expect(listOrganisationTrainees(mockActorUserId, mockOrgId)).rejects.toThrowError(
        OrganisationAdminServiceError,
      );
      await expect(listOrganisationTrainees(mockActorUserId, mockOrgId)).rejects.toMatchObject({
        statusCode: 403,
        error: 'ORG_ADMIN_PERMISSION_REQUIRED',
      });
    });

    it('enforces cross-tenant security by rejecting access when actor admin belongs to another organisation', async () => {
      orgAdminRepoMock.findActorOrganisationAdmin.mockResolvedValue(null);

      await expect(
        listOrganisationTrainees(mockActorUserId, 'different-org-id'),
      ).rejects.toMatchObject({
        statusCode: 403,
        error: 'ORG_ADMIN_REQUIRED',
      });
    });
  });

  describe('createOrganisationTraineeInvitation', () => {
    const input = {
      email: 'trainee@example.com',
      firstName: 'Alex',
      lastName: 'Trainee',
    };

    it('creates invitation and action token inside transaction, logs audit, and sends email on success', async () => {
      traineeRepoMock.findOrganisationTraineeByEmail.mockResolvedValue(null);
      traineeRepoMock.findPendingTraineeInvitationByEmail.mockResolvedValue(null);
      invitationRepoMock.findUserByEmailWithProfiles.mockResolvedValue(null);

      txMock.invitation.create.mockResolvedValue(buildMockInvitation({ id: mockInvitationId }));
      txMock.actionToken.create.mockResolvedValue({ id: mockActionTokenId });
      txMock.invitation.findUnique.mockResolvedValue(
        buildMockInvitation({ id: mockInvitationId, status: 'PENDING' }),
      );

      const result = await createOrganisationTraineeInvitation(mockActorUserId, mockOrgId, input);

      expect(result.success).toBe(true);
      expect(txMock.invitation.create).toHaveBeenCalled();
      expect(txMock.actionToken.create).toHaveBeenCalled();
      expect(auditLogMock.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'INVITED',
          targetId: mockInvitationId,
        }),
        txMock,
      );
      expect(emailMock.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          emailType: 'ORGANISATION_TRAINEE_INVITE',
          recipientEmail: 'trainee@example.com',
        }),
        txMock,
      );
    });

    it('throws 403 when actor only has VIEW_ORGANISATION_TRAINEES permission before any database lookups occur', async () => {
      orgAdminRepoMock.findActorOrganisationAdmin.mockResolvedValue(
        buildMockActorAdmin([OrganisationPermissionKey.VIEW_ORGANISATION_TRAINEES]),
      );

      await expect(
        createOrganisationTraineeInvitation(mockActorUserId, mockOrgId, input),
      ).rejects.toMatchObject({
        statusCode: 403,
        error: 'ORG_ADMIN_PERMISSION_REQUIRED',
      });

      expect(traineeRepoMock.findOrganisationTraineeByEmail).not.toHaveBeenCalled();
      expect(traineeRepoMock.findPendingTraineeInvitationByEmail).not.toHaveBeenCalled();
      expect(invitationRepoMock.findUserByEmailWithProfiles).not.toHaveBeenCalled();
    });

    it('throws ConflictError (409) if user is already an active trainee in the organisation', async () => {
      traineeRepoMock.findOrganisationTraineeByEmail.mockResolvedValue(
        buildMockTraineeProfile({ membershipStatus: 'ACTIVE' }),
      );

      await expect(
        createOrganisationTraineeInvitation(mockActorUserId, mockOrgId, input),
      ).rejects.toMatchObject({
        statusCode: 409,
        error: 'CANNOT_INVITE_USER',
      });
    });

    it('throws generic 409 CANNOT_INVITE_USER if user is an existing platform admin, without leaking the platform admin status', async () => {
      traineeRepoMock.findOrganisationTraineeByEmail.mockResolvedValue(null);
      traineeRepoMock.findPendingTraineeInvitationByEmail.mockResolvedValue(null);
      invitationRepoMock.findUserByEmailWithProfiles.mockResolvedValue({
        id: 'some-user',
        email: 'trainee@example.com',
        platformAdminProfile: { id: 'admin-id' } as never,
        firstName: 'Alex',
        lastName: 'Trainee',
        userType: 'IP_ADMIN',
        accountStatus: 'ACTIVE',
        lastLoginAt: null,
      });

      const errorPromise = createOrganisationTraineeInvitation(mockActorUserId, mockOrgId, input);

      await expect(errorPromise).rejects.toMatchObject({
        statusCode: 409,
        error: 'CANNOT_INVITE_USER',
      });

      await errorPromise.catch((e) => {
        expect(e.message).not.toMatch(/platform admin/i);
      });
    });

    it('throws ConflictError (409) if a pending invitation already exists for the email', async () => {
      traineeRepoMock.findOrganisationTraineeByEmail.mockResolvedValue(null);
      traineeRepoMock.findPendingTraineeInvitationByEmail.mockResolvedValue(
        buildMockInvitation({ status: 'PENDING' }),
      );

      await expect(
        createOrganisationTraineeInvitation(mockActorUserId, mockOrgId, input),
      ).rejects.toMatchObject({
        statusCode: 409,
        error: 'CANNOT_INVITE_USER',
      });
    });

    it('throws 403 ORGANISATION_NOT_ACTIVE when organisation is not active', async () => {
      orgAdminRepoMock.findActorOrganisationAdmin.mockResolvedValue(
        buildMockActorAdmin([OrganisationPermissionKey.INVITE_ORGANISATION_TRAINEES], {
          organisation: { id: mockOrgId, name: 'Acme', status: 'SUSPENDED' },
        }),
      );

      await expect(
        createOrganisationTraineeInvitation(mockActorUserId, mockOrgId, input),
      ).rejects.toMatchObject({
        statusCode: 403,
        error: 'ORGANISATION_NOT_ACTIVE',
      });
    });
  });

  describe('resendTraineeInvitation', () => {
    it('revokes existing unused tokens, renews expiration, logs audit, and sends email', async () => {
      const invitation = buildMockInvitation({ id: mockInvitationId, status: 'PENDING' });
      invitationRepoMock.findInvitationById.mockResolvedValue(invitation);
      invitationRepoMock.findUserByEmailWithProfiles.mockResolvedValue(null);
      txMock.actionToken.create.mockResolvedValue({ id: mockActionTokenId });
      txMock.invitation.findUnique.mockResolvedValue(
        buildMockInvitation({ id: mockInvitationId, status: 'PENDING' }),
      );

      const result = await resendTraineeInvitation(mockActorUserId, mockOrgId, mockInvitationId);

      expect(result.success).toBe(true);
      expect(result.invitationId).toBe(mockInvitationId);
      expect(txMock.actionToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { invitationId: mockInvitationId, revokedAt: null, usedAt: null },
        }),
      );
      expect(txMock.invitation.update).toHaveBeenCalled();
      expect(auditLogMock.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: 'RESENT' }),
        txMock,
      );
    });

    it('throws 403 when actor only has VIEW_ORGANISATION_TRAINEES permission', async () => {
      invitationRepoMock.findInvitationById.mockResolvedValue(buildMockInvitation());
      orgAdminRepoMock.findActorOrganisationAdmin.mockResolvedValue(
        buildMockActorAdmin([OrganisationPermissionKey.VIEW_ORGANISATION_TRAINEES]),
      );

      await expect(
        resendTraineeInvitation(mockActorUserId, mockOrgId, mockInvitationId),
      ).rejects.toMatchObject({
        statusCode: 403,
        error: 'ORG_ADMIN_PERMISSION_REQUIRED',
      });
    });

    it('throws 409 when attempting to resend an already accepted invitation', async () => {
      invitationRepoMock.findInvitationById.mockResolvedValue(
        buildMockInvitation({ status: 'ACCEPTED' }),
      );

      await expect(
        resendTraineeInvitation(mockActorUserId, mockOrgId, mockInvitationId),
      ).rejects.toMatchObject({
        statusCode: 409,
        error: 'INVITATION_ALREADY_ACCEPTED',
      });
    });

    it('throws 409 when attempting to resend an already revoked invitation', async () => {
      invitationRepoMock.findInvitationById.mockResolvedValue(
        buildMockInvitation({ status: 'REVOKED' }),
      );

      await expect(
        resendTraineeInvitation(mockActorUserId, mockOrgId, mockInvitationId),
      ).rejects.toMatchObject({
        statusCode: 409,
        error: 'INVITATION_REVOKED',
      });
    });

    it('enforces cross-tenant security on resend', async () => {
      invitationRepoMock.findInvitationById.mockResolvedValue(
        buildMockInvitation({ organisationId: 'org-other' }),
      );
      orgAdminRepoMock.findActorOrganisationAdmin.mockResolvedValue(null);

      await expect(
        resendTraineeInvitation(mockActorUserId, mockOrgId, mockInvitationId),
      ).rejects.toMatchObject({
        statusCode: 403,
        error: 'ORG_ADMIN_REQUIRED',
      });
    });
  });

  describe('revokeTraineeInvitation', () => {
    it('marks invitation and tokens as revoked and records audit log', async () => {
      invitationRepoMock.findInvitationById.mockResolvedValue(
        buildMockInvitation({ status: 'PENDING' }),
      );

      const result = await revokeTraineeInvitation(mockActorUserId, mockOrgId, mockInvitationId);

      expect(result.success).toBe(true);
      expect(result.status).toBe('REVOKED');
      expect(txMock.invitation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockInvitationId },
          data: { status: 'REVOKED' },
        }),
      );
      expect(txMock.actionToken.updateMany).toHaveBeenCalled();
      expect(auditLogMock.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: 'REVOKED' }),
        txMock,
      );
    });

    it('behaves idempotently when invitation is already revoked without hitting database mutations', async () => {
      invitationRepoMock.findInvitationById.mockResolvedValue(
        buildMockInvitation({ status: 'REVOKED' }),
      );

      const result = await revokeTraineeInvitation(mockActorUserId, mockOrgId, mockInvitationId);

      expect(result.success).toBe(true);
      expect(result.status).toBe('REVOKED');
      expect(txMock.invitation.update).not.toHaveBeenCalled();
    });

    it('throws 409 when attempting to revoke an already accepted invitation', async () => {
      invitationRepoMock.findInvitationById.mockResolvedValue(
        buildMockInvitation({ status: 'ACCEPTED' }),
      );

      await expect(
        revokeTraineeInvitation(mockActorUserId, mockOrgId, mockInvitationId),
      ).rejects.toMatchObject({
        statusCode: 409,
        error: 'INVITATION_ALREADY_ACCEPTED',
      });
    });
  });

  describe('disableOrganisationTrainee', () => {
    const input = {
      disabledReason: null,
      password: 'correct_password_123',
      confirmation: true as const,
    };

    it('atomically disables profile, revokes sessions, logs audit, and sends role notification', async () => {
      passwordMock.verifyPassword.mockResolvedValue(true);
      const trainee = buildMockTraineeProfile({ membershipStatus: 'ACTIVE' });
      traineeRepoMock.findOrganisationTraineeById.mockResolvedValue(trainee);

      const result = await disableOrganisationTrainee(
        mockActorUserId,
        mockOrgId,
        mockTraineeId,
        input,
      );

      expect(result.success).toBe(true);
      expect(traineeRepoMock.disableOrganisationTraineeProfile).toHaveBeenCalledWith(
        trainee.id,
        null,
        txMock,
      );
      expect(authSessionRepoMock.revokeUserAuthSessions).toHaveBeenCalledWith(
        {
          userId: trainee.traineeProfile.userId,
          revokedReason: 'ADMIN_DISABLED',
        },
        txMock,
      );
      expect(auditLogMock.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'DISABLED',
          outcome: 'SUCCESS',
        }),
        txMock,
      );
      expect(emailMock.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          emailType: 'ROLE_CHANGED_NOTIFICATION',
          recipientEmail: trainee.traineeProfile.user.email,
        }),
        txMock,
      );
    });

    it('throws 403 when actor only has VIEW_ORGANISATION_TRAINEES permission', async () => {
      orgAdminRepoMock.findActorOrganisationAdmin.mockResolvedValue(
        buildMockActorAdmin([OrganisationPermissionKey.VIEW_ORGANISATION_TRAINEES]),
      );

      await expect(
        disableOrganisationTrainee(mockActorUserId, mockOrgId, mockTraineeId, input),
      ).rejects.toMatchObject({
        statusCode: 403,
        error: 'ORG_ADMIN_PERMISSION_REQUIRED',
      });
    });

    it('records failed audit log and throws 403 when admin password confirmation fails', async () => {
      passwordMock.verifyPassword.mockResolvedValue(false);

      await expect(
        disableOrganisationTrainee(mockActorUserId, mockOrgId, mockTraineeId, {
          ...input,
          password: 'wrong',
        }),
      ).rejects.toMatchObject({
        statusCode: 403,
        error: 'ORG_TRAINEE_PASSWORD_INVALID',
      });
      expect(auditLogMock.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'DISABLED',
          outcome: 'FAILURE',
        }),
      );
    });

    it('throws 409 TRAINEE_ALREADY_DISABLED when trainee is already disabled', async () => {
      passwordMock.verifyPassword.mockResolvedValue(true);
      traineeRepoMock.findOrganisationTraineeById.mockResolvedValue(
        buildMockTraineeProfile({ membershipStatus: 'DISABLED' }),
      );

      await expect(
        disableOrganisationTrainee(mockActorUserId, mockOrgId, mockTraineeId, input),
      ).rejects.toMatchObject({
        statusCode: 409,
        error: 'TRAINEE_ALREADY_DISABLED',
      });
    });

    it('enforces cross-tenant security by verifying trainee belongs to actor organisation', async () => {
      passwordMock.verifyPassword.mockResolvedValue(true);
      traineeRepoMock.findOrganisationTraineeById.mockResolvedValue(null);

      await expect(
        disableOrganisationTrainee(mockActorUserId, mockOrgId, mockTraineeId, input),
      ).rejects.toMatchObject({
        statusCode: 404,
        error: 'TRAINEE_NOT_FOUND',
      });
    });
  });
});

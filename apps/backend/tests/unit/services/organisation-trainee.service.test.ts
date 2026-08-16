import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
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
  findAuthoritativeInvitationById: vi.fn(),
  findAuthoritativeResentInvitation: vi.fn(),
  createOrganisationTraineeInvitationTx: vi.fn(),
  resendOrganisationTraineeInvitationTx: vi.fn(),
  revokeOrganisationTraineeInvitationTx: vi.fn(),
  disableOrganisationTraineeTx: vi.fn(),
  OrganisationTraineeRepositoryError: class OrganisationTraineeRepositoryError extends Error {
    constructor(
      public readonly statusCode: number,
      public readonly errorKey: string,
      message: string,
    ) {
      super(message);
      this.name = 'OrganisationTraineeRepositoryError';
    }
  },
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
  generateOpaqueToken: vi.fn().mockReturnValue('raw-opaque-token-12345-67890-abcdef123456'),
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

describe('OrganisationTraineeService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-15T08:00:00.000Z'));
    vi.clearAllMocks();
    emailMock.sendEmail.mockResolvedValue({
      status: 'QUEUED',
      queueAccepted: true,
      queued: true,
      deliveryLogId: 'delivery-log-1',
      jobId: 'email-job-1',
    });
    orgAdminRepoMock.findActorOrganisationAdmin.mockResolvedValue(
      buildMockActorAdmin([
        OrganisationPermissionKey.VIEW_ORGANISATION_TRAINEES,
        OrganisationPermissionKey.INVITE_ORGANISATION_TRAINEES,
        OrganisationPermissionKey.REMOVE_ORGANISATION_TRAINEES,
      ]),
    );
  });
  afterEach(() => {
    vi.useRealTimers();
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

      expect(result.trainees).toHaveLength(2);
      expect(result.trainees[0]?.status).toBe('ACTIVE');
      expect(result.trainees[1]?.status).toBe('DISABLED');

      expect(result.pendingInvitations ?? []).toHaveLength(2);
      expect(result.invitations).toHaveLength(2);
      expect((result.pendingInvitations ?? [])[0]?.status).toBe('INVITE_PENDING');
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

    it('delegates creation to repository transaction and returns authoritative response on success', async () => {
      traineeRepoMock.findOrganisationTraineeByEmail.mockResolvedValue(null);
      traineeRepoMock.findPendingTraineeInvitationByEmail.mockResolvedValue(null);
      invitationRepoMock.findUserByEmailWithProfiles.mockResolvedValue(null);

      const mockInvitation = buildMockInvitation({ id: mockInvitationId });
      traineeRepoMock.createOrganisationTraineeInvitationTx.mockResolvedValue({
        invitation: mockInvitation,
        actionToken: { id: mockActionTokenId },
        emailResult: { status: 'QUEUED' },
      });
      traineeRepoMock.findAuthoritativeInvitationById.mockResolvedValue(
        buildMockInvitation({ id: mockInvitationId, status: 'PENDING' }),
      );

      const result = await createOrganisationTraineeInvitation(mockActorUserId, mockOrgId, input);

      expect(result.success).toBe(true);
      expect(traineeRepoMock.createOrganisationTraineeInvitationTx).toHaveBeenCalledWith(
        expect.objectContaining({
          organisationId: mockOrgId,
          recipientEmail: 'trainee@example.com',
          recipientFirstName: 'Alex',
          recipientLastName: 'Trainee',
          tokenHash: 'hashed-opaque-token-12345',
          auditLogData: expect.objectContaining({
            actorUserId: mockActorUserId,
            actionType: 'INVITED',
          }),
          emailDeliveryData: expect.objectContaining({
            emailType: 'ORGANISATION_TRAINEE_INVITE',
            recipientEmail: 'trainee@example.com',
          }),
        }),
      );
      expect(traineeRepoMock.findAuthoritativeInvitationById).toHaveBeenCalledWith(
        mockInvitationId,
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

    it('throws 409 when repository transaction reports duplicate conflict', async () => {
      traineeRepoMock.findOrganisationTraineeByEmail.mockResolvedValue(null);
      traineeRepoMock.findPendingTraineeInvitationByEmail.mockResolvedValue(null);
      invitationRepoMock.findUserByEmailWithProfiles.mockResolvedValue(null);

      traineeRepoMock.createOrganisationTraineeInvitationTx.mockRejectedValue(
        new traineeRepoMock.OrganisationTraineeRepositoryError(
          409,
          'CANNOT_INVITE_USER',
          'A pending invitation already exists for this email address.',
        ),
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
    it('delegates token rotation to repository transaction and performs authoritative check', async () => {
      const invitation = buildMockInvitation({ id: mockInvitationId, status: 'PENDING' });
      invitationRepoMock.findInvitationById.mockResolvedValue(invitation);
      invitationRepoMock.findUserByEmailWithProfiles.mockResolvedValue(null);
      traineeRepoMock.resendOrganisationTraineeInvitationTx.mockResolvedValue({
        actionToken: { id: mockActionTokenId },
        claimedAt: new Date(),
        emailResult: { status: 'QUEUED' },
      });
      traineeRepoMock.findAuthoritativeResentInvitation.mockResolvedValue({
        ...buildMockInvitation({ id: mockInvitationId, status: 'PENDING' }),
        actionTokens: [{ id: mockActionTokenId, revokedAt: null, usedAt: null }],
      });

      const result = await resendTraineeInvitation(mockActorUserId, mockOrgId, mockInvitationId);

      expect(result.success).toBe(true);
      expect(result.invitationId).toBe(mockInvitationId);
      expect(traineeRepoMock.resendOrganisationTraineeInvitationTx).toHaveBeenCalledWith(
        expect.objectContaining({
          organisationId: mockOrgId,
          invitationId: mockInvitationId,
          tokenHash: 'hashed-opaque-token-12345',
          auditLogData: expect.objectContaining({
            actorUserId: mockActorUserId,
            actionType: 'RESENT',
          }),
          emailDeliveryData: expect.objectContaining({
            emailType: 'ORGANISATION_TRAINEE_INVITE',
            recipientEmail: invitation.recipientEmail,
          }),
        }),
      );
      expect(traineeRepoMock.findAuthoritativeResentInvitation).toHaveBeenCalledWith(
        mockInvitationId,
        mockActionTokenId,
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

    it('throws 409 when repository transaction reports concurrent mutation conflict', async () => {
      const invitation = buildMockInvitation({ id: mockInvitationId, status: 'PENDING' });
      invitationRepoMock.findInvitationById.mockResolvedValue(invitation);
      invitationRepoMock.findUserByEmailWithProfiles.mockResolvedValue(null);
      traineeRepoMock.resendOrganisationTraineeInvitationTx.mockRejectedValue(
        new traineeRepoMock.OrganisationTraineeRepositoryError(
          409,
          'INVITATION_NOT_RESENDABLE',
          'Invitation was modified concurrently or is no longer in a resendable state.',
        ),
      );

      await expect(
        resendTraineeInvitation(mockActorUserId, mockOrgId, mockInvitationId),
      ).rejects.toMatchObject({
        statusCode: 409,
        error: 'INVITATION_NOT_RESENDABLE',
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
    it('delegates revocation to repository transaction and returns success', async () => {
      invitationRepoMock.findInvitationById.mockResolvedValue(buildMockInvitation());
      traineeRepoMock.revokeOrganisationTraineeInvitationTx.mockResolvedValue({
        alreadyRevoked: false,
        invitationId: mockInvitationId,
        revokedAt: '2026-07-15T08:00:00.000Z',
      });

      const result = await revokeTraineeInvitation(mockActorUserId, mockOrgId, mockInvitationId);

      expect(result.success).toBe(true);
      expect(result.status).toBe('REVOKED');
      expect(traineeRepoMock.revokeOrganisationTraineeInvitationTx).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: mockActorUserId,
          organisationId: mockOrgId,
          invitationId: mockInvitationId,
          auditLogData: expect.objectContaining({
            actorUserId: mockActorUserId,
            actionType: 'REVOKED',
          }),
        }),
      );
    });

    it('behaves idempotently when invitation is already revoked without hitting database mutations', async () => {
      invitationRepoMock.findInvitationById.mockResolvedValue(
        buildMockInvitation({ status: 'REVOKED' }),
      );

      const result = await revokeTraineeInvitation(mockActorUserId, mockOrgId, mockInvitationId);

      expect(result.success).toBe(true);
      expect(result.status).toBe('REVOKED');
      expect(traineeRepoMock.revokeOrganisationTraineeInvitationTx).not.toHaveBeenCalled();
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

    it('throws 409 when repository transaction reports concurrent conflict', async () => {
      invitationRepoMock.findInvitationById.mockResolvedValue(buildMockInvitation());
      traineeRepoMock.revokeOrganisationTraineeInvitationTx.mockRejectedValue(
        new traineeRepoMock.OrganisationTraineeRepositoryError(
          409,
          'INVITATION_ALREADY_ACCEPTED',
          'Cannot revoke an invitation that has already been accepted or mutated concurrently.',
        ),
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

    it('atomically disables profile, revokes sessions, logs audit, and sends role notification via repository transaction', async () => {
      passwordMock.verifyPassword.mockResolvedValue(true);
      const trainee = buildMockTraineeProfile({ membershipStatus: 'ACTIVE' });
      traineeRepoMock.disableOrganisationTraineeTx.mockResolvedValue({
        txTrainee: trainee,
        disabledReason: 'Disabled by organisation admin',
      });

      const result = await disableOrganisationTrainee(
        mockActorUserId,
        mockOrgId,
        mockTraineeId,
        input,
      );

      expect(result.success).toBe(true);
      expect(result.traineeId).toBe(trainee.id);
      expect(result.status).toBe('DISABLED');
      expect(traineeRepoMock.disableOrganisationTraineeTx).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: mockActorUserId,
          organisationId: mockOrgId,
          traineeId: mockTraineeId,
          disabledReason: 'Disabled by organisation admin',
          auditLogData: expect.objectContaining({
            actorUserId: mockActorUserId,
            actionType: 'DISABLED',
          }),
        }),
      );
      expect(emailMock.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          emailType: 'ROLE_CHANGED_NOTIFICATION',
          recipientEmail: trainee.traineeProfile.user.email,
        }),
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

    it('throws 409 TRAINEE_ALREADY_DISABLED when repository transaction reports already disabled', async () => {
      passwordMock.verifyPassword.mockResolvedValue(true);
      traineeRepoMock.disableOrganisationTraineeTx.mockRejectedValue(
        new traineeRepoMock.OrganisationTraineeRepositoryError(
          409,
          'TRAINEE_ALREADY_DISABLED',
          'Trainee profile is already disabled.',
        ),
      );

      await expect(
        disableOrganisationTrainee(mockActorUserId, mockOrgId, mockTraineeId, input),
      ).rejects.toMatchObject({
        statusCode: 409,
        error: 'TRAINEE_ALREADY_DISABLED',
      });
    });

    it('enforces cross-tenant security when trainee is not found in organisation', async () => {
      passwordMock.verifyPassword.mockResolvedValue(true);
      traineeRepoMock.disableOrganisationTraineeTx.mockRejectedValue(
        new traineeRepoMock.OrganisationTraineeRepositoryError(
          404,
          'TRAINEE_NOT_FOUND',
          'Organisation trainee profile not found.',
        ),
      );

      await expect(
        disableOrganisationTrainee(mockActorUserId, mockOrgId, mockTraineeId, input),
      ).rejects.toMatchObject({
        statusCode: 404,
        error: 'TRAINEE_NOT_FOUND',
      });
    });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  changeAdminPermissions,
  createAdminPromotion,
  getOrganisationAdmins,
  getOwnOrganisation,
  removeAdmin,
} from '../../src/services/organisation-admin.service.js';

const repositoryMock = vi.hoisted(() => ({
  countActiveOrganisationAdminsWithPermission: vi.fn(),
  createInvitationPermissionGrants: vi.fn(),
  createOrganisationAdminPromotionInvitation: vi.fn(),
  deleteOrganisationAdminPermissionGrants: vi.fn(),
  disableOrganisationAdmin: vi.fn(),
  findActiveOrganisationTraineeByEmail: vi.fn(),
  findActorOrganisationAdmin: vi.fn(),
  findOrganisationAdminById: vi.fn(),
  findOrganisationAdminByUserId: vi.fn(),
  findOrganisationPermissionsByKeys: vi.fn(),
  findPendingOrganisationAdminPromotionInvitation: vi.fn(),
  ensureActiveOrganisationTraineeProfileForUser: vi.fn(),
  listOrganisationAdminsWithPermissions: vi.fn(),
  listOrganisationPermissions: vi.fn(),
  replaceOrganisationAdminPermissionGrants: vi.fn(),
  runOrganisationAdminTransaction: vi.fn(),
  updatePromotionInvitationStatus: vi.fn(),
}));

const orgRepositoryMock = vi.hoisted(() => ({
  findOrganisationWithCount: vi.fn(),
}));

const actionTokenMock = vi.hoisted(() => ({
  issueActionToken: vi.fn(),
}));

const auditLogMock = vi.hoisted(() => ({
  recordAuditLog: vi.fn(),
}));

const emailHookMock = vi.hoisted(() => ({
  requestAuthEmailSend: vi.fn(),
}));

const sessionMock = vi.hoisted(() => ({
  revokeSessionsForUser: vi.fn(),
}));

const passwordMock = vi.hoisted(() => ({
  verifyPassword: vi.fn(),
}));

vi.mock('../../src/repositories/organisation-admin.repository.js', () => repositoryMock);
vi.mock('../../src/repositories/organisation.repository.js', () => orgRepositoryMock);
vi.mock('../../src/services/action-token.service.js', () => actionTokenMock);
vi.mock('../../src/services/audit-log.service.js', () => auditLogMock);
vi.mock('../../src/services/auth-email-hook.service.js', () => emailHookMock);
vi.mock('../../src/services/auth-session.service.js', () => sessionMock);
vi.mock('../../src/services/password.service.js', () => passwordMock);

const organisationId = 'org-1';
const actorUserId = 'actor-user-1';
const actorAdminId = 'actor-admin-1';
const targetAdminId = 'target-admin-1';
const tx = { transaction: true };
const storedCredentialHash = ['stored', 'credential', 'hash'].join('-');
const promotionActionToken = ['raw', 'promotion', 'action', 'value'].join('-');
const removeConfirmationSecret = ['local', 'test', 'remove', 'confirmation'].join('-');
const invalidRemoveConfirmationSecret = ['wrong', 'local', 'remove', 'confirmation'].join('-');

function permissionGrant(key: string) {
  return {
    organisationPermission: {
      key,
      displayName: key.replaceAll('_', ' '),
    },
  };
}

function actorAdmin(permissionKeys: readonly string[] = ['VIEW_ORGANISATION_ADMINS']) {
  return {
    id: actorAdminId,
    userId: actorUserId,
    organisation: {
      id: organisationId,
      name: 'Acme Security',
      status: 'ACTIVE',
    },
    user: {
      passwordHash: storedCredentialHash,
    },
    permissionGrants: permissionKeys.map(permissionGrant),
  };
}

function targetAdmin(permissionKeys: readonly string[] = ['VIEW_ORGANISATION_ADMINS']) {
  return {
    id: targetAdminId,
    userId: 'target-user-1',
    adminStatus: 'ACTIVE',
    user: {
      id: 'target-user-1',
      email: 'target-admin@example.test',
    },
    permissionGrants: permissionKeys.map(permissionGrant),
  };
}

function organisationPermission(id: string, key: string, isCritical = false) {
  return {
    id,
    organisationId,
    key,
    displayName: key.replaceAll('_', ' '),
    description: null,
    isCritical,
  };
}

function firstCallOrder(mock: { mock: { invocationCallOrder: number[] } }) {
  return mock.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY;
}

describe('organisation admin service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T08:00:00.000Z'));
    vi.clearAllMocks();

    repositoryMock.findActorOrganisationAdmin.mockResolvedValue(actorAdmin());
    repositoryMock.runOrganisationAdminTransaction.mockImplementation(async (action) => action(tx));
    repositoryMock.countActiveOrganisationAdminsWithPermission.mockResolvedValue(1);
    actionTokenMock.issueActionToken.mockResolvedValue({
      rawToken: promotionActionToken,
      token: {
        id: 'action-token-1',
        expiresAt: new Date('2026-07-08T08:00:00.000Z'),
      },
    });
    auditLogMock.recordAuditLog.mockResolvedValue({ id: 'audit-1' });
    emailHookMock.requestAuthEmailSend.mockResolvedValue({
      status: 'QUEUED',
      queueAccepted: true,
      queued: true,
      deliveryLogId: 'email-log-1',
      jobId: 'email-job-1',
    });
    passwordMock.verifyPassword.mockResolvedValue(true);
  });

  it('lists admins with sorted permissions and actor permission keys', async () => {
    repositoryMock.findActorOrganisationAdmin.mockResolvedValue(
      actorAdmin(['INVITE_ORGANISATION_ADMINS', 'VIEW_ORGANISATION_ADMINS']),
    );
    repositoryMock.listOrganisationAdminsWithPermissions.mockResolvedValue([
      {
        id: targetAdminId,
        userId: 'target-user-1',
        user: {
          firstName: 'Tara',
          lastName: 'Admin',
          email: 'tara@example.test',
        },
        adminStatus: 'ACTIVE',
        isInitialAdmin: false,
        joinedAt: new Date('2026-06-30T08:00:00.000Z'),
        disabledAt: null,
        permissionGrants: [
          permissionGrant('INVITE_ORGANISATION_ADMINS'),
          permissionGrant('VIEW_ORGANISATION_ADMINS'),
        ],
      },
    ]);
    repositoryMock.listOrganisationPermissions.mockResolvedValue([
      organisationPermission('permission-view', 'VIEW_ORGANISATION_ADMINS'),
    ]);

    const result = await getOrganisationAdmins(actorUserId, organisationId);

    expect(repositoryMock.listOrganisationAdminsWithPermissions).toHaveBeenCalledWith(
      organisationId,
    );
    expect(result).toEqual({
      admins: [
        {
          id: targetAdminId,
          userId: 'target-user-1',
          firstName: 'Tara',
          lastName: 'Admin',
          email: 'tara@example.test',
          adminStatus: 'ACTIVE',
          isInitialAdmin: false,
          joinedAt: '2026-06-30T08:00:00.000Z',
          disabledAt: null,
          permissions: [
            {
              key: 'INVITE_ORGANISATION_ADMINS',
              displayName: 'INVITE ORGANISATION ADMINS',
            },
            {
              key: 'VIEW_ORGANISATION_ADMINS',
              displayName: 'VIEW ORGANISATION ADMINS',
            },
          ],
        },
      ],
      availablePermissions: [
        {
          key: 'VIEW_ORGANISATION_ADMINS',
          displayName: 'VIEW ORGANISATION ADMINS',
          description: null,
          isCritical: false,
        },
      ],
      actorPermissions: ['INVITE_ORGANISATION_ADMINS', 'VIEW_ORGANISATION_ADMINS'],
    });
  });

  it('creates promotion invitations through the central email service only', async () => {
    repositoryMock.findActorOrganisationAdmin.mockResolvedValue(
      actorAdmin(['INVITE_ORGANISATION_ADMINS']),
    );
    repositoryMock.findOrganisationPermissionsByKeys.mockResolvedValue([
      organisationPermission('permission-view', 'VIEW_ORGANISATION_ADMINS'),
    ]);
    repositoryMock.findActiveOrganisationTraineeByEmail.mockResolvedValue({
      id: 'target-user-1',
      email: 'trainee@example.test',
      firstName: 'Tara',
      lastName: 'Trainee',
    });
    repositoryMock.findOrganisationAdminByUserId.mockResolvedValue(null);
    repositoryMock.findPendingOrganisationAdminPromotionInvitation.mockResolvedValue(null);
    repositoryMock.createOrganisationAdminPromotionInvitation.mockResolvedValue({
      id: 'invitation-1',
      expiresAt: new Date('2026-07-08T08:00:00.000Z'),
    });
    repositoryMock.createInvitationPermissionGrants.mockResolvedValue({ count: 1 });

    const result = await createAdminPromotion(actorUserId, organisationId, {
      traineeEmail: 'trainee@example.test',
      permissionKeys: ['VIEW_ORGANISATION_ADMINS'],
    });

    expect(repositoryMock.findActiveOrganisationTraineeByEmail).toHaveBeenCalledWith({
      organisationId,
      email: 'trainee@example.test',
    });
    expect(emailHookMock.requestAuthEmailSend).toHaveBeenCalledWith({
      emailType: 'ORGANISATION_ADMIN_PROMOTION_INVITE',
      recipientEmail: 'trainee@example.test',
      userId: 'target-user-1',
      organisationId,
      invitationId: 'invitation-1',
      actionTokenId: 'action-token-1',
      templateData: {
        firstName: 'Tara',
        organisationName: 'Acme Security',
        actionToken: promotionActionToken,
        actionTokenExpiresAt: new Date('2026-07-08T08:00:00.000Z'),
      },
    });
    expect(result).toEqual({
      invitationId: 'invitation-1',
      actionTokenId: 'action-token-1',
      status: 'PENDING',
      expiresAt: '2026-07-08T08:00:00.000Z',
      permissionKeys: ['VIEW_ORGANISATION_ADMINS'],
      emailQueued: true,
    });
  });

  it('marks promotion invitations failed when the central email service does not queue', async () => {
    repositoryMock.findActorOrganisationAdmin.mockResolvedValue(
      actorAdmin(['INVITE_ORGANISATION_ADMINS']),
    );
    repositoryMock.findOrganisationPermissionsByKeys.mockResolvedValue([
      organisationPermission('permission-view', 'VIEW_ORGANISATION_ADMINS'),
    ]);
    repositoryMock.findActiveOrganisationTraineeByEmail.mockResolvedValue({
      id: 'target-user-1',
      email: 'trainee@example.test',
      firstName: 'Tara',
      lastName: 'Trainee',
    });
    repositoryMock.findOrganisationAdminByUserId.mockResolvedValue(null);
    repositoryMock.findPendingOrganisationAdminPromotionInvitation.mockResolvedValue(null);
    repositoryMock.createOrganisationAdminPromotionInvitation.mockResolvedValue({
      id: 'invitation-1',
      expiresAt: new Date('2026-07-08T08:00:00.000Z'),
    });
    repositoryMock.createInvitationPermissionGrants.mockResolvedValue({ count: 1 });
    emailHookMock.requestAuthEmailSend.mockResolvedValue({
      status: 'NOT_QUEUED',
      queueAccepted: false,
      queued: false,
      reason: 'EMAIL_QUEUE_FAILED',
    });

    await expect(
      createAdminPromotion(actorUserId, organisationId, {
        traineeEmail: 'trainee@example.test',
        permissionKeys: ['VIEW_ORGANISATION_ADMINS'],
      }),
    ).resolves.toMatchObject({
      status: 'FAILED_TO_SEND',
      emailQueued: false,
    });
    expect(repositoryMock.updatePromotionInvitationStatus).toHaveBeenCalledWith({
      invitationId: 'invitation-1',
      status: 'FAILED_TO_SEND',
    });
    expect(auditLogMock.recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: 'FAILURE',
      }),
    );
  });

  it('reports promotion invitations as queued when the email is queued', async () => {
    repositoryMock.findActorOrganisationAdmin.mockResolvedValue(
      actorAdmin(['INVITE_ORGANISATION_ADMINS']),
    );
    repositoryMock.findOrganisationPermissionsByKeys.mockResolvedValue([
      organisationPermission('permission-view', 'VIEW_ORGANISATION_ADMINS'),
    ]);
    repositoryMock.findActiveOrganisationTraineeByEmail.mockResolvedValue({
      id: 'target-user-1',
      email: 'trainee@example.test',
      firstName: 'Tara',
      lastName: 'Trainee',
    });
    repositoryMock.findOrganisationAdminByUserId.mockResolvedValue(null);
    repositoryMock.findPendingOrganisationAdminPromotionInvitation.mockResolvedValue(null);
    repositoryMock.createOrganisationAdminPromotionInvitation.mockResolvedValue({
      id: 'invitation-1',
      expiresAt: new Date('2026-07-08T08:00:00.000Z'),
    });
    repositoryMock.createInvitationPermissionGrants.mockResolvedValue({ count: 1 });
    emailHookMock.requestAuthEmailSend.mockResolvedValue({
      status: 'QUEUED',
      queueAccepted: true,
      queued: true,
      deliveryLogId: 'email-log-1',
      jobId: 'email-job-1',
    });

    const result = await createAdminPromotion(actorUserId, organisationId, {
      traineeEmail: 'trainee@example.test',
      permissionKeys: ['VIEW_ORGANISATION_ADMINS'],
    });

    expect(result).toMatchObject({
      status: 'PENDING',
      emailQueued: true,
    });
    expect(repositoryMock.updatePromotionInvitationStatus).not.toHaveBeenCalled();
    expect(auditLogMock.recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: 'SUCCESS',
        metadata: expect.objectContaining({
          emailOutcomeStatus: 'QUEUED',
        }),
      }),
    );
    expect(auditLogMock.recordAuditLog).not.toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          emailPersistenceFailureReason: expect.stringContaining('database unavailable'),
        }),
      }),
    );
  });

  it('does not claim promotion invitations reached the provider when the email is queued', async () => {
    repositoryMock.findActorOrganisationAdmin.mockResolvedValue(
      actorAdmin(['INVITE_ORGANISATION_ADMINS']),
    );
    repositoryMock.findOrganisationPermissionsByKeys.mockResolvedValue([
      organisationPermission('permission-view', 'VIEW_ORGANISATION_ADMINS'),
    ]);
    repositoryMock.findActiveOrganisationTraineeByEmail.mockResolvedValue({
      id: 'target-user-1',
      email: 'trainee@example.test',
      firstName: 'Tara',
      lastName: 'Trainee',
    });
    repositoryMock.findOrganisationAdminByUserId.mockResolvedValue(null);
    repositoryMock.findPendingOrganisationAdminPromotionInvitation.mockResolvedValue(null);
    repositoryMock.createOrganisationAdminPromotionInvitation.mockResolvedValue({
      id: 'invitation-1',
      expiresAt: new Date('2026-07-08T08:00:00.000Z'),
    });
    repositoryMock.createInvitationPermissionGrants.mockResolvedValue({ count: 1 });
    emailHookMock.requestAuthEmailSend.mockResolvedValue({
      status: 'QUEUED',
      queueAccepted: true,
      queued: true,
      deliveryLogId: 'email-log-1',
      jobId: 'email-job-1',
    });

    const result = await createAdminPromotion(actorUserId, organisationId, {
      traineeEmail: 'trainee@example.test',
      permissionKeys: ['VIEW_ORGANISATION_ADMINS'],
    });

    expect(result).toMatchObject({
      status: 'PENDING',
      emailQueued: true,
    });
    expect(auditLogMock.recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: 'SUCCESS',
        metadata: expect.objectContaining({
          emailOutcomeStatus: 'QUEUED',
        }),
      }),
    );
  });

  it('reports pending promotion invitations when all accepted persistence writes fail', async () => {
    repositoryMock.findActorOrganisationAdmin.mockResolvedValue(
      actorAdmin(['INVITE_ORGANISATION_ADMINS']),
    );
    repositoryMock.findOrganisationPermissionsByKeys.mockResolvedValue([
      organisationPermission('permission-view', 'VIEW_ORGANISATION_ADMINS'),
    ]);
    repositoryMock.findActiveOrganisationTraineeByEmail.mockResolvedValue({
      id: 'target-user-1',
      email: 'trainee@example.test',
      firstName: 'Tara',
      lastName: 'Trainee',
    });
    repositoryMock.findOrganisationAdminByUserId.mockResolvedValue(null);
    repositoryMock.findPendingOrganisationAdminPromotionInvitation.mockResolvedValue(null);
    repositoryMock.createOrganisationAdminPromotionInvitation.mockResolvedValue({
      id: 'invitation-1',
      expiresAt: new Date('2026-07-08T08:00:00.000Z'),
    });
    repositoryMock.createInvitationPermissionGrants.mockResolvedValue({ count: 1 });
    emailHookMock.requestAuthEmailSend.mockResolvedValue({
      status: 'QUEUED',
      queueAccepted: true,
      queued: true,
      deliveryLogId: 'email-log-1',
      jobId: 'email-job-1',
    });

    const result = await createAdminPromotion(actorUserId, organisationId, {
      traineeEmail: 'trainee@example.test',
      permissionKeys: ['VIEW_ORGANISATION_ADMINS'],
    });

    expect(result).toMatchObject({
      status: 'PENDING',
      emailQueued: true,
    });
    expect(auditLogMock.recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: 'SUCCESS',
        metadata: expect.objectContaining({
          emailOutcomeStatus: 'QUEUED',
        }),
      }),
    );
  });

  it('does not promote users outside the same active organisation trainee scope', async () => {
    repositoryMock.findActorOrganisationAdmin.mockResolvedValue(
      actorAdmin(['INVITE_ORGANISATION_ADMINS']),
    );
    repositoryMock.findOrganisationPermissionsByKeys.mockResolvedValue([
      organisationPermission('permission-view', 'VIEW_ORGANISATION_ADMINS'),
    ]);
    repositoryMock.findActiveOrganisationTraineeByEmail.mockResolvedValue(null);

    await expect(
      createAdminPromotion(actorUserId, organisationId, {
        traineeEmail: 'outsider@example.test',
        permissionKeys: ['VIEW_ORGANISATION_ADMINS'],
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      error: 'ORG_ADMIN_TARGET_TRAINEE_REQUIRED',
    });
    expect(repositoryMock.createOrganisationAdminPromotionInvitation).not.toHaveBeenCalled();
    expect(emailHookMock.requestAuthEmailSend).not.toHaveBeenCalled();
  });

  it('requires the actor to hold the permission needed for each workflow', async () => {
    repositoryMock.findActorOrganisationAdmin.mockResolvedValue(actorAdmin([]));

    await expect(getOrganisationAdmins(actorUserId, organisationId)).rejects.toMatchObject({
      statusCode: 403,
      error: 'ORG_ADMIN_PERMISSION_REQUIRED',
    });
    await expect(
      createAdminPromotion(actorUserId, organisationId, {
        traineeEmail: 'trainee@example.test',
        permissionKeys: ['VIEW_ORGANISATION_ADMINS'],
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      error: 'ORG_ADMIN_PERMISSION_REQUIRED',
    });
    expect(repositoryMock.listOrganisationAdminsWithPermissions).not.toHaveBeenCalled();
    expect(repositoryMock.findActiveOrganisationTraineeByEmail).not.toHaveBeenCalled();
  });

  it('replaces admin permissions when critical safeguards remain satisfied', async () => {
    repositoryMock.findActorOrganisationAdmin.mockResolvedValue(
      actorAdmin(['CHANGE_ORGANISATION_ADMIN_PERMISSIONS']),
    );
    repositoryMock.findOrganisationPermissionsByKeys.mockResolvedValue([
      organisationPermission('permission-invite', 'INVITE_ORGANISATION_ADMINS', true),
      organisationPermission('permission-change', 'CHANGE_ORGANISATION_ADMIN_PERMISSIONS', true),
    ]);
    repositoryMock.findOrganisationAdminById.mockResolvedValue(
      targetAdmin(['VIEW_ORGANISATION_ADMINS']),
    );

    const result = await changeAdminPermissions(actorUserId, organisationId, targetAdminId, {
      permissionKeys: ['INVITE_ORGANISATION_ADMINS', 'CHANGE_ORGANISATION_ADMIN_PERMISSIONS'],
    });

    expect(repositoryMock.countActiveOrganisationAdminsWithPermission).toHaveBeenCalledWith({
      organisationId,
      permissionKey: 'INVITE_ORGANISATION_ADMINS',
      excludingAdminId: targetAdminId,
    });
    expect(repositoryMock.replaceOrganisationAdminPermissionGrants).toHaveBeenCalledWith(
      {
        organisationId,
        organisationAdminId: targetAdminId,
        organisationPermissionIds: ['permission-invite', 'permission-change'],
        grantedByOrganisationAdminId: actorAdminId,
      },
      tx,
    );
    expect(result).toEqual({
      adminId: targetAdminId,
      permissionKeys: ['INVITE_ORGANISATION_ADMINS', 'CHANGE_ORGANISATION_ADMIN_PERMISSIONS'],
    });
  });

  it('blocks permission changes that would remove the final critical admin permission', async () => {
    repositoryMock.findActorOrganisationAdmin.mockResolvedValue(
      actorAdmin(['CHANGE_ORGANISATION_ADMIN_PERMISSIONS']),
    );
    repositoryMock.findOrganisationPermissionsByKeys.mockResolvedValue([
      organisationPermission('permission-view', 'VIEW_ORGANISATION_ADMINS'),
    ]);
    repositoryMock.findOrganisationAdminById.mockResolvedValue(
      targetAdmin(['INVITE_ORGANISATION_ADMINS']),
    );
    repositoryMock.countActiveOrganisationAdminsWithPermission.mockResolvedValue(0);

    await expect(
      changeAdminPermissions(actorUserId, organisationId, targetAdminId, {
        permissionKeys: ['VIEW_ORGANISATION_ADMINS'],
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      error: 'ORG_ADMIN_CRITICAL_PERMISSION_REQUIRED',
    });
    expect(auditLogMock.recordAuditLog).toHaveBeenCalledWith({
      actorUserId,
      actorType: 'ORGANISATION_ADMIN',
      organisationId,
      targetType: 'ORGANISATION_ADMIN_PERMISSION',
      targetId: targetAdminId,
      actionType: 'PERMISSIONS_CHANGED',
      outcome: 'FAILURE',
      metadata: {
        reason: 'LAST_CRITICAL_ADMIN_PERMISSION_CHANGE',
        targetAdminId,
        affectedPermissionKeys: [
          'INVITE_ORGANISATION_ADMINS',
          'CHANGE_ORGANISATION_ADMIN_PERMISSIONS',
        ],
      },
    });
    expect(repositoryMock.replaceOrganisationAdminPermissionGrants).not.toHaveBeenCalled();
  });

  it('removes admins and ensures they remain active organisation trainees', async () => {
    repositoryMock.findActorOrganisationAdmin.mockResolvedValue(
      actorAdmin(['REMOVE_ORGANISATION_ADMINS']),
    );
    repositoryMock.findOrganisationAdminById.mockResolvedValue(targetAdmin());

    const result = await removeAdmin(actorUserId, organisationId, targetAdminId, {
      password: removeConfirmationSecret,
      confirmation: 'REMOVE',
    });

    expect(passwordMock.verifyPassword).toHaveBeenCalledWith(
      removeConfirmationSecret,
      storedCredentialHash,
    );
    expect(repositoryMock.disableOrganisationAdmin).toHaveBeenCalledWith(
      {
        organisationId,
        adminId: targetAdminId,
        disabledReason: 'Removed by organisation admin',
      },
      tx,
    );
    expect(repositoryMock.deleteOrganisationAdminPermissionGrants).toHaveBeenCalledWith(
      {
        organisationId,
        organisationAdminId: targetAdminId,
      },
      tx,
    );
    expect(repositoryMock.ensureActiveOrganisationTraineeProfileForUser).toHaveBeenCalledWith(
      {
        organisationId,
        userId: 'target-user-1',
      },
      tx,
    );
    expect(sessionMock.revokeSessionsForUser).toHaveBeenCalledWith({
      userId: 'target-user-1',
      reason: 'ADMIN_DISABLED',
    });
    expect(result).toEqual({
      adminId: targetAdminId,
      status: 'DISABLED',
    });
  });

  it('ensures an initial admin without a trainee profile is demoted to organisation trainee', async () => {
    repositoryMock.findActorOrganisationAdmin.mockResolvedValue(
      actorAdmin(['REMOVE_ORGANISATION_ADMINS']),
    );
    repositoryMock.findOrganisationAdminById.mockResolvedValue(
      targetAdmin(['INVITE_ORGANISATION_ADMINS', 'CHANGE_ORGANISATION_ADMIN_PERMISSIONS']),
    );

    await removeAdmin(actorUserId, organisationId, targetAdminId, {
      password: removeConfirmationSecret,
      confirmation: 'REMOVE',
    });

    expect(repositoryMock.ensureActiveOrganisationTraineeProfileForUser).toHaveBeenCalledWith(
      {
        organisationId,
        userId: 'target-user-1',
      },
      tx,
    );
    const ensureTraineeCallOrder = firstCallOrder(
      repositoryMock.ensureActiveOrganisationTraineeProfileForUser,
    );
    expect(firstCallOrder(repositoryMock.disableOrganisationAdmin)).toBeLessThan(
      ensureTraineeCallOrder,
    );
    expect(firstCallOrder(repositoryMock.deleteOrganisationAdminPermissionGrants)).toBeLessThan(
      ensureTraineeCallOrder,
    );
  });

  it('rejects admin removal when password confirmation fails', async () => {
    repositoryMock.findActorOrganisationAdmin.mockResolvedValue(
      actorAdmin(['REMOVE_ORGANISATION_ADMINS']),
    );
    passwordMock.verifyPassword.mockResolvedValue(false);

    await expect(
      removeAdmin(actorUserId, organisationId, targetAdminId, {
        password: invalidRemoveConfirmationSecret,
        confirmation: 'REMOVE',
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      error: 'ORG_ADMIN_PASSWORD_INVALID',
    });
    expect(repositoryMock.findOrganisationAdminById).not.toHaveBeenCalled();
    expect(repositoryMock.disableOrganisationAdmin).not.toHaveBeenCalled();
    expect(auditLogMock.recordAuditLog).toHaveBeenCalledWith({
      actorUserId,
      actorType: 'ORGANISATION_ADMIN',
      organisationId,
      targetType: 'OTHER',
      actionType: 'DEMOTED',
      outcome: 'FAILURE',
      metadata: {
        reason: 'INCORRECT_PASSWORD',
        targetAdminId,
      },
    });
    expect(sessionMock.revokeSessionsForUser).not.toHaveBeenCalled();
  });

  it('audits blocked removal of the final critical admin', async () => {
    repositoryMock.findActorOrganisationAdmin.mockResolvedValue(
      actorAdmin(['REMOVE_ORGANISATION_ADMINS']),
    );
    repositoryMock.findOrganisationAdminById.mockResolvedValue(targetAdmin());
    repositoryMock.countActiveOrganisationAdminsWithPermission.mockResolvedValue(0);

    await expect(
      removeAdmin(actorUserId, organisationId, targetAdminId, {
        password: removeConfirmationSecret,
        confirmation: 'REMOVE',
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      error: 'ORG_ADMIN_CRITICAL_PERMISSION_REQUIRED',
    });
    expect(auditLogMock.recordAuditLog).toHaveBeenCalledWith({
      actorUserId,
      actorType: 'ORGANISATION_ADMIN',
      organisationId,
      targetType: 'USER',
      targetId: 'target-user-1',
      actionType: 'DEMOTED',
      outcome: 'FAILURE',
      metadata: {
        reason: 'LAST_CRITICAL_ADMIN_REMOVAL',
        targetAdminId,
        affectedPermissionKeys: [
          'INVITE_ORGANISATION_ADMINS',
          'CHANGE_ORGANISATION_ADMIN_PERMISSIONS',
        ],
      },
    });
    expect(repositoryMock.disableOrganisationAdmin).not.toHaveBeenCalled();
    expect(sessionMock.revokeSessionsForUser).not.toHaveBeenCalled();
  });

  describe('getOwnOrganisation', () => {
    it('returns own organisation information for an active organisation admin', async () => {
      repositoryMock.findActorOrganisationAdmin.mockResolvedValue(actorAdmin());
      orgRepositoryMock.findOrganisationWithCount.mockResolvedValue({
        id: organisationId,
        name: 'Acme Security',
        description: 'Leading provider of training',
        website: 'https://acme.example.test',
        approximateSize: 200,
        status: 'ACTIVE',
        createdAt: new Date('2026-05-16T09:00:00.000Z'),
        _count: {
          adminProfiles: 3,
          traineeProfiles: 25,
        },
      });

      const result = await getOwnOrganisation(actorUserId, organisationId);

      expect(repositoryMock.findActorOrganisationAdmin).toHaveBeenCalledWith({
        userId: actorUserId,
        organisationId,
      });
      expect(orgRepositoryMock.findOrganisationWithCount).toHaveBeenCalledWith(organisationId);
      expect(result).toEqual({
        id: organisationId,
        name: 'Acme Security',
        description: 'Leading provider of training',
        website: 'https://acme.example.test',
        approximateSize: 200,
        registeredTraineeCount: 25,
        registrationDate: '2026-05-16T09:00:00.000Z',
        status: 'ACTIVE',
      });
    });

    it('rejects with 403 when user is not an active admin for that organisation', async () => {
      repositoryMock.findActorOrganisationAdmin.mockResolvedValue(null);

      await expect(getOwnOrganisation(actorUserId, organisationId)).rejects.toMatchObject({
        statusCode: 403,
        error: 'ORG_ADMIN_REQUIRED',
      });
      expect(orgRepositoryMock.findOrganisationWithCount).not.toHaveBeenCalled();
    });

    it('rejects with 403 when the organisation is not active', async () => {
      repositoryMock.findActorOrganisationAdmin.mockResolvedValue({
        ...actorAdmin(),
        organisation: { id: organisationId, name: 'Acme Security', status: 'SUSPENDED' },
      });

      await expect(getOwnOrganisation(actorUserId, organisationId)).rejects.toMatchObject({
        statusCode: 403,
        error: 'ORGANISATION_NOT_ACTIVE',
      });
      expect(orgRepositoryMock.findOrganisationWithCount).not.toHaveBeenCalled();
    });

    it('rejects with 404 when organisation record is not found in database', async () => {
      repositoryMock.findActorOrganisationAdmin.mockResolvedValue(actorAdmin());
      orgRepositoryMock.findOrganisationWithCount.mockResolvedValue(null);

      await expect(getOwnOrganisation(actorUserId, organisationId)).rejects.toMatchObject({
        statusCode: 404,
        error: 'ORGANISATION_NOT_FOUND',
      });
    });
  });
});

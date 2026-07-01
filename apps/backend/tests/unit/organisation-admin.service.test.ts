import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  changeAdminPermissions,
  createAdminPromotion,
  getOrganisationAdmins,
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
  listOrganisationAdminsWithPermissions: vi.fn(),
  listOrganisationPermissions: vi.fn(),
  replaceOrganisationAdminPermissionGrants: vi.fn(),
  runOrganisationAdminTransaction: vi.fn(),
  updatePromotionInvitationStatus: vi.fn(),
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
    emailHookMock.requestAuthEmailSend.mockResolvedValue({ queued: true });
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
      status: 'SENT',
      expiresAt: '2026-07-08T08:00:00.000Z',
      permissionKeys: ['VIEW_ORGANISATION_ADMINS'],
      emailQueued: true,
    });
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
    expect(repositoryMock.replaceOrganisationAdminPermissionGrants).not.toHaveBeenCalled();
  });

  it('removes admins after password confirmation and revokes their sessions', async () => {
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
    expect(sessionMock.revokeSessionsForUser).toHaveBeenCalledWith({
      userId: 'target-user-1',
      reason: 'ADMIN_DISABLED',
    });
    expect(result).toEqual({
      adminId: targetAdminId,
      status: 'DISABLED',
    });
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
    expect(sessionMock.revokeSessionsForUser).not.toHaveBeenCalled();
  });
});

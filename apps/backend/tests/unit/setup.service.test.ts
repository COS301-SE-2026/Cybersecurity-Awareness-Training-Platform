import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import {
  completeSetupWithToken,
  getSetupTokenContext,
  SetupFlowError,
} from '../../src/services/setup.service.js';

const setupRepositoryMock = vi.hoisted(() => ({
  activateOrganisationAdminUser: vi.fn(),
  activateOrganisationTraineeUser: vi.fn(),
  activatePlatformAdminUser: vi.fn(),
  createOrganisationAdminUser: vi.fn(),
  createOrganisationTraineeUser: vi.fn(),
  createPlatformAdminUser: vi.fn(),
  findSetupActionTokenById: vi.fn(),
  findSetupUserByEmail: vi.fn(),
  markInvitationAccepted: vi.fn(),
}));

const actionTokenServiceMock = vi.hoisted(() => ({
  runWithConsumedActionToken: vi.fn(),
  validateActionToken: vi.fn(),
}));

const auditLogServiceMock = vi.hoisted(() => ({
  recordAuditLog: vi.fn(),
}));

const authEmailHookServiceMock = vi.hoisted(() => ({
  requestAuthEmailSend: vi.fn(),
}));

const passwordServiceMock = vi.hoisted(() => ({
  hashPassword: vi.fn(),
}));

vi.mock('../../src/repositories/setup.repository.js', () => setupRepositoryMock);
vi.mock('../../src/services/action-token.service.js', () => actionTokenServiceMock);
vi.mock('../../src/services/audit-log.service.js', () => auditLogServiceMock);
vi.mock('../../src/services/auth-email-hook.service.js', () => authEmailHookServiceMock);
vi.mock('../../src/services/password.service.js', () => passwordServiceMock);

const tx = { transaction: true };
const rawSetupValue = ['raw', 'setup', 'value'].join('-');
const strongTestPassword = ['Stronger', 'Pass', '1!'].join('');
const setupInvitationExpiryMs = 24 * 60 * 60 * 1000;

const activeOrganisation = {
  id: 'org-1',
  name: 'Acme Security',
  status: 'ACTIVE',
};

const publicUser = {
  id: 'user-1',
  firstName: 'Johan',
  lastName: 'Nel',
  email: 'trainee@example.com',
  userType: 'ORGANISATION_TRAINEE',
  authStatus: 'ACTIVE',
  createdAt: new Date('2026-06-25T08:00:00.000Z'),
};

const publicAdminUser = {
  id: 'admin-user-1',
  firstName: 'Amina',
  lastName: 'Khan',
  email: 'admin@example.com',
  userType: 'ORGANISATION_ADMIN',
  authStatus: 'ACTIVE',
  createdAt: new Date('2026-06-25T08:00:00.000Z'),
};

const completeSetupInput = {
  firstName: 'Johan',
  lastName: 'Nel',
  password: strongTestPassword,
  confirmPassword: strongTestPassword,
};

const publicUserResponse = {
  id: 'user-1',
  firstName: 'Johan',
  lastName: 'Nel',
  email: 'trainee@example.com',
  userType: 'ORGANISATION_TRAINEE',
  authStatus: 'ACTIVE',
  createdAt: '2026-06-25T08:00:00.000Z',
};

const publicAdminUserResponse = {
  id: 'admin-user-1',
  firstName: 'Amina',
  lastName: 'Khan',
  email: 'admin@example.com',
  userType: 'ORGANISATION_ADMIN',
  authStatus: 'ACTIVE',
  createdAt: '2026-06-25T08:00:00.000Z',
};

function setupToken(overrides = {}) {
  return {
    id: 'action-token-1',
    purpose: 'ORGANISATION_TRAINEE_INVITE',
    targetEmail: null,
    invitationId: 'invitation-1',
    organisationRegistrationRequestId: null,
    userId: null,
    invitation: {
      id: 'invitation-1',
      recipientEmail: 'trainee@example.com',
      organisationId: 'org-1',
      recipientFirstName: 'Johan',
      recipientLastName: 'Nel',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + setupInvitationExpiryMs),
      organisation: activeOrganisation,
      organisationRegistrationRequest: null,
    },
    organisationRegistrationRequest: null,
    user: null,
    ...overrides,
  };
}

describe('setup service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-25'));
    vi.clearAllMocks();

    actionTokenServiceMock.validateActionToken.mockResolvedValue({
      state: 'VALID',
      token: { id: 'action-token-1' },
    });
    actionTokenServiceMock.runWithConsumedActionToken.mockImplementation(
      async (_input, action) => ({
        claimed: true,
        result: await action(tx),
      }),
    );

    setupRepositoryMock.findSetupActionTokenById.mockResolvedValue(setupToken());
    setupRepositoryMock.findSetupUserByEmail.mockResolvedValue(null);
    setupRepositoryMock.createOrganisationTraineeUser.mockResolvedValue(publicUser);
    setupRepositoryMock.markInvitationAccepted.mockResolvedValue({ id: 'invitation-1' });
    auditLogServiceMock.recordAuditLog.mockResolvedValue({ id: 'audit-1' });

    passwordServiceMock.hashPassword.mockResolvedValue('hashed-password');
    authEmailHookServiceMock.requestAuthEmailSend.mockResolvedValue({
      status: 'NOT_ACCEPTED',
      acceptedByProvider: false,
      queued: false,
      reason: 'EMAIL_SEND_FAILED',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns safe setup context without consuming the action token', async () => {
    const response = await getSetupTokenContext(rawSetupValue);

    expect(actionTokenServiceMock.validateActionToken).toHaveBeenCalledWith({
      rawToken: rawSetupValue,
      expectedPurpose: 'INITIAL_ORGANISATION_ADMIN_SETUP',
    });
    expect(setupRepositoryMock.findSetupActionTokenById).toHaveBeenCalledWith('action-token-1');
    expect(actionTokenServiceMock.runWithConsumedActionToken).not.toHaveBeenCalled();
    expect(response).toEqual({
      token: {
        state: 'VALID',
        purpose: 'ORGANISATION_TRAINEE_INVITE',
      },
      targetEmail: 'trainee@example.com',
      organisationName: 'Acme Security',
      targetFirstName: 'Johan',
      role: 'ORGANISATION_TRAINEE',
      targetLastName: 'Nel',
    });
  });

  it('returns invalid context when the token cannot be validated', async () => {
    actionTokenServiceMock.validateActionToken.mockResolvedValue({ state: 'INVALID' });

    const response = await getSetupTokenContext('missing-token');

    expect(response).toEqual({
      token: {
        state: 'INVALID',
      },
    });
    expect(setupRepositoryMock.findSetupActionTokenById).not.toHaveBeenCalled();
  });

  it('hashes the password, creates the invited trainee, accepts the invite', async () => {
    const response = await completeSetupWithToken(rawSetupValue, completeSetupInput);

    expect(passwordServiceMock.hashPassword).toHaveBeenCalledWith(strongTestPassword);
    expect(actionTokenServiceMock.runWithConsumedActionToken).toHaveBeenCalledWith(
      { tokenId: 'action-token-1' },
      expect.any(Function),
    );
    expect(setupRepositoryMock.createOrganisationTraineeUser).toHaveBeenCalledWith(
      {
        email: 'trainee@example.com',
        firstName: 'Johan',
        lastName: 'Nel',
        passwordHash: 'hashed-password',
        organisationId: 'org-1',
      },
      tx,
    );
    expect(setupRepositoryMock.markInvitationAccepted).toHaveBeenCalledWith('invitation-1', tx);
    expect(authEmailHookServiceMock.requestAuthEmailSend).not.toHaveBeenCalled();
    expect(response).toEqual({
      user: publicUserResponse,
    });
  });

  it('allows setup completion when the invitation email has already been sent', async () => {
    setupRepositoryMock.findSetupActionTokenById.mockResolvedValue(
      setupToken({ invitation: { ...setupToken().invitation, status: 'SENT' } }),
    );
    const response = await completeSetupWithToken(rawSetupValue, completeSetupInput);
    expect(setupRepositoryMock.createOrganisationTraineeUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'trainee@example.com',
        firstName: 'Johan',
        lastName: 'Nel',
        organisationId: 'org-1',
      }),
      tx,
    );
    expect(setupRepositoryMock.markInvitationAccepted).toHaveBeenCalledWith('invitation-1', tx);
    expect(response).toEqual({ user: publicUserResponse });
  });

  it('marks the initial organisation admin and links the setup invitation', async () => {
    setupRepositoryMock.findSetupActionTokenById.mockResolvedValue(
      setupToken({
        purpose: 'INITIAL_ORGANISATION_ADMIN_SETUP',
        targetEmail: 'admin@example.com',
        invitationId: 'initial-admin-invitation-1',
        invitation: {
          ...setupToken().invitation,
          id: 'initial-admin-invitation-1',
          recipientEmail: 'admin@example.com',
        },
      }),
    );
    setupRepositoryMock.createOrganisationAdminUser.mockResolvedValue(publicAdminUser);

    const response = await completeSetupWithToken(rawSetupValue, completeSetupInput);

    expect(setupRepositoryMock.createOrganisationAdminUser).toHaveBeenCalledWith(
      {
        email: 'admin@example.com',
        firstName: 'Johan',
        lastName: 'Nel',
        passwordHash: 'hashed-password',
        organisationId: 'org-1',
        isInitialAdmin: true,
        createdFromInvitationId: 'initial-admin-invitation-1',
      },
      tx,
    );
    expect(response).toEqual({ user: publicAdminUserResponse });
  });

  it('marks an existing user as the initial organisation admin during initial setup', async () => {
    setupRepositoryMock.findSetupActionTokenById.mockResolvedValue(
      setupToken({
        purpose: 'INITIAL_ORGANISATION_ADMIN_SETUP',
        targetEmail: 'admin@example.com',
        invitationId: 'initial-admin-invitation-1',
        invitation: {
          ...setupToken().invitation,
          id: 'initial-admin-invitation-1',
          recipientEmail: 'admin@example.com',
        },
      }),
    );
    setupRepositoryMock.findSetupUserByEmail.mockResolvedValue({
      id: 'admin-user-1',
      userType: 'ORGANISATION_ADMIN',
      authStatus: 'INVITED',
    });
    setupRepositoryMock.activateOrganisationAdminUser.mockResolvedValue(publicAdminUser);

    const response = await completeSetupWithToken(rawSetupValue, completeSetupInput);

    expect(setupRepositoryMock.activateOrganisationAdminUser).toHaveBeenCalledWith(
      {
        userId: 'admin-user-1',
        firstName: 'Johan',
        lastName: 'Nel',
        passwordHash: 'hashed-password',
        organisationId: 'org-1',
        isInitialAdmin: true,
        createdFromInvitationId: 'initial-admin-invitation-1',
      },
      tx,
    );
    expect(response).toEqual({ user: publicAdminUserResponse });
  });

  it('activates the organisation and seeds default permissions for the initial organisation admin if organisation status is PENDING_ONBOARDING', async () => {
    setupRepositoryMock.findSetupActionTokenById.mockResolvedValue(
      setupToken({
        purpose: 'INITIAL_ORGANISATION_ADMIN_SETUP',
        targetEmail: 'admin@example.com',
        invitationId: 'initial-admin-invitation-1',
        invitation: {
          ...setupToken().invitation,
          id: 'initial-admin-invitation-1',
          recipientEmail: 'admin@example.com',
          organisation: {
            id: 'org-1',
            name: 'Acme Security',
            status: 'PENDING_ONBOARDING',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      }),
    );
    setupRepositoryMock.createOrganisationAdminUser.mockResolvedValue(publicAdminUser);

    const organisationUpdateManyMock = vi.fn().mockResolvedValue({ count: 1 });
    const adminProfileFindFirstMock = vi.fn().mockResolvedValue({ id: 'admin-profile-1' });
    const organisationPermissionFindManyMock = vi
      .fn()
      .mockResolvedValue([{ id: 'perm-1', key: 'VIEW_ORGANISATION_ADMINS' }]);
    const organisationAdminPermissionCreateManyMock = vi.fn();

    const customTx = {
      organisation: { updateMany: organisationUpdateManyMock },
      organisationAdminProfile: { findFirst: adminProfileFindFirstMock },
      organisationPermission: { findMany: organisationPermissionFindManyMock },
      organisationAdminPermission: { createMany: organisationAdminPermissionCreateManyMock },
    } as unknown as PrismaClient;

    actionTokenServiceMock.runWithConsumedActionToken.mockImplementation(
      async (_input, action) => ({
        claimed: true,
        result: await action(customTx),
      }),
    );

    await completeSetupWithToken(rawSetupValue, completeSetupInput);

    expect(auditLogServiceMock.recordAuditLog).toHaveBeenCalledWith(
      {
        actorUserId: publicAdminUser.id,
        actorType: 'ORGANISATION_ADMIN',
        organisationId: 'org-1',
        targetType: 'INVITATION',
        targetId: 'initial-admin-invitation-1',
        actionType: 'COMPLETED',
        outcome: 'SUCCESS',
        metadata: {
          milestone: 'INITIAL_ADMIN_SETUP_COMPLETED',
        },
      },
      customTx,
    );
    expect(organisationUpdateManyMock).toHaveBeenCalledWith({
      where: { id: 'org-1', status: 'PENDING_ONBOARDING' },
      data: { status: 'ACTIVE' },
    });
    expect(auditLogServiceMock.recordAuditLog).toHaveBeenCalledWith(
      {
        actorUserId: publicAdminUser.id,
        actorType: 'ORGANISATION_ADMIN',
        organisationId: 'org-1',
        targetType: 'ORGANISATION',
        targetId: 'org-1',
        actionType: 'ENABLED',
        outcome: 'SUCCESS',
        metadata: {
          milestone: 'ORGANISATION_ACTIVATED',
          fromStatus: 'PENDING_ONBOARDING',
          toStatus: 'ACTIVE',
        },
      },
      customTx,
    );
    expect(auditLogServiceMock.recordAuditLog).toHaveBeenCalledTimes(2);

    const auditMetadataText = JSON.stringify(
      auditLogServiceMock.recordAuditLog.mock.calls.map(([entry]) => entry.metadata ?? {}),
    );
    expect(auditMetadataText).not.toContain('@');
    expect(auditMetadataText).not.toContain(rawSetupValue);
    expect(auditMetadataText).not.toContain('tokenHash');
    expect(auditMetadataText).not.toContain('permission');
    expect(auditLogServiceMock.recordAuditLog.mock.invocationCallOrder[0]).toBeLessThan(
      organisationUpdateManyMock.mock.invocationCallOrder[0],
    );
    expect(adminProfileFindFirstMock).toHaveBeenCalledWith({
      where: { userId: publicAdminUser.id, organisationId: 'org-1' },
    });
    expect(organisationPermissionFindManyMock).toHaveBeenCalledWith({
      where: { organisationId: 'org-1' },
    });
    expect(organisationAdminPermissionCreateManyMock).toHaveBeenCalledWith({
      data: [
        {
          id: 'org-admin-grant-admin-profile-1-perm-1',
          organisationId: 'org-1',
          organisationAdminId: 'admin-profile-1',
          organisationPermissionId: 'perm-1',
        },
      ],
      skipDuplicates: true,
    });
  });

  it('does not record organisation activation when the conditional status update does not match', async () => {
    setupRepositoryMock.findSetupActionTokenById.mockResolvedValue(
      setupToken({
        purpose: 'INITIAL_ORGANISATION_ADMIN_SETUP',
        targetEmail: 'admin@example.com',
        invitationId: 'initial-admin-invitation-1',
        invitation: {
          ...setupToken().invitation,
          id: 'initial-admin-invitation-1',
          recipientEmail: 'admin@example.com',
          organisation: {
            id: 'org-1',
            name: 'Acme Security',
            status: 'PENDING_ONBOARDING',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      }),
    );
    setupRepositoryMock.createOrganisationAdminUser.mockResolvedValue(publicAdminUser);

    const organisationUpdateManyMock = vi.fn().mockResolvedValue({ count: 0 });
    const adminProfileFindFirstMock = vi.fn().mockResolvedValue({ id: 'admin-profile-1' });
    const organisationPermissionFindManyMock = vi.fn().mockResolvedValue([]);
    const organisationAdminPermissionCreateManyMock = vi.fn();

    const customTx = {
      organisation: { updateMany: organisationUpdateManyMock },
      organisationAdminProfile: { findFirst: adminProfileFindFirstMock },
      organisationPermission: { findMany: organisationPermissionFindManyMock },
      organisationAdminPermission: { createMany: organisationAdminPermissionCreateManyMock },
    } as unknown as PrismaClient;

    actionTokenServiceMock.runWithConsumedActionToken.mockImplementation(
      async (_input, action) => ({
        claimed: true,
        result: await action(customTx),
      }),
    );

    await completeSetupWithToken(rawSetupValue, completeSetupInput);

    expect(organisationUpdateManyMock).toHaveBeenCalledWith({
      where: { id: 'org-1', status: 'PENDING_ONBOARDING' },
      data: { status: 'ACTIVE' },
    });
    expect(auditLogServiceMock.recordAuditLog).toHaveBeenCalledTimes(1);
    expect(auditLogServiceMock.recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: 'INVITATION',
        targetId: 'initial-admin-invitation-1',
        actionType: 'COMPLETED',
      }),
      customTx,
    );
    expect(auditLogServiceMock.recordAuditLog).not.toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: 'ORGANISATION',
        targetId: 'org-1',
        actionType: 'ENABLED',
      }),
      expect.anything(),
    );
  });

  it.each(['FAILED_TO_SEND', 'ACCEPTED', 'EXPIRED', 'REVOKED'])(
    'rejects setup completion when the invite status is %s',
    async (status) => {
      setupRepositoryMock.findSetupActionTokenById.mockResolvedValue(
        setupToken({ invitation: { ...setupToken().invitation, status } }),
      );
      await expect(completeSetupWithToken(rawSetupValue, completeSetupInput)).rejects.toMatchObject(
        { statusCode: 409, error: 'SETUP_INVITATION_NOT_ACCEPTABLE' },
      );
      expect(actionTokenServiceMock.runWithConsumedActionToken).not.toHaveBeenCalled();
      expect(setupRepositoryMock.markInvitationAccepted).not.toHaveBeenCalled();
    },
  );

  it('rejects used setup tokens before hashing the password or consuming the token', async () => {
    actionTokenServiceMock.validateActionToken.mockResolvedValue({
      state: 'USED',
      token: { id: 'action-token-1' },
    });

    await expect(completeSetupWithToken(rawSetupValue, completeSetupInput)).rejects.toMatchObject({
      statusCode: 401,
      error: 'SETUP_TOKEN_USED',
    });

    expect(passwordServiceMock.hashPassword).not.toHaveBeenCalled();
    expect(actionTokenServiceMock.runWithConsumedActionToken).not.toHaveBeenCalled();
  });

  it('rejects blocked organisations and does not consume the token', async () => {
    setupRepositoryMock.findSetupActionTokenById.mockResolvedValue(
      setupToken({
        invitation: {
          ...setupToken().invitation,
          organisation: {
            ...activeOrganisation,
            status: 'DISABLED',
          },
        },
      }),
    );

    await expect(completeSetupWithToken(rawSetupValue, completeSetupInput)).rejects.toMatchObject({
      statusCode: 409,
      error: 'ORGANISATION_DISABLED',
    });

    expect(actionTokenServiceMock.runWithConsumedActionToken).not.toHaveBeenCalled();
    expect(setupRepositoryMock.markInvitationAccepted).not.toHaveBeenCalled();
    expect(setupRepositoryMock.createOrganisationTraineeUser).not.toHaveBeenCalled();
    expect(setupRepositoryMock.activateOrganisationTraineeUser).not.toHaveBeenCalled();
    expect(authEmailHookServiceMock.requestAuthEmailSend).not.toHaveBeenCalled();
  });

  it('does not send the email hook when the action-token claim is stale', async () => {
    actionTokenServiceMock.runWithConsumedActionToken.mockResolvedValue({
      claimed: false,
    });

    await expect(completeSetupWithToken(rawSetupValue, completeSetupInput)).rejects.toBeInstanceOf(
      SetupFlowError,
    );

    expect(authEmailHookServiceMock.requestAuthEmailSend).not.toHaveBeenCalled();
  });

  it('does not record setup success milestones when the action-token claim is stale', async () => {
    actionTokenServiceMock.runWithConsumedActionToken.mockResolvedValue({
      claimed: false,
    });

    await expect(completeSetupWithToken(rawSetupValue, completeSetupInput)).rejects.toBeInstanceOf(
      SetupFlowError,
    );

    expect(auditLogServiceMock.recordAuditLog).not.toHaveBeenCalled();
  });
});

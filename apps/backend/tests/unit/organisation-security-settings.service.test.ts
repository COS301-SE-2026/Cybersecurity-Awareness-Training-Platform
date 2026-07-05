import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryMock = vi.hoisted(() => ({
  ORGANISATION_SECURITY_SETTINGS_UPDATE_PERMISSION: 'CHANGE_ORGANISATION_SECURITY_SETTINGS',
  findOrganisationSecuritySettingsActorAdmin: vi.fn(),
  findOrganisationSecuritySettingsByOrganisationId: vi.fn(),
  runOrganisationSecuritySettingsTransaction: vi.fn(),
  updateOrganisationSecuritySettings: vi.fn(),
}));

const auditLogMock = vi.hoisted(() => ({
  recordAuditLog: vi.fn(),
}));

vi.mock(
  '../../src/repositories/organisation-security-settings.repository.js',
  () => repositoryMock,
);
vi.mock('../../src/services/audit-log.service.js', () => auditLogMock);

import {
  getOrganisationSecuritySettings,
  patchOrganisationSecuritySettings,
} from '../../src/services/organisation-security-settings.service.js';

const actorUserId = '33333333-3333-4333-8333-333333333333';
const organisationId = '11111111-1111-4111-8111-111111111111';
const actorAdminId = '22222222-2222-4222-8222-222222222222';

function createActor(permissionKeys = ['CHANGE_ORGANISATION_SECURITY_SETTINGS']) {
  return {
    id: actorAdminId,
    userId: actorUserId,
    organisationId,
    adminStatus: 'ACTIVE',
    organisation: {
      id: organisationId,
      name: 'Example Organisation',
      status: 'ACTIVE',
    },
    user: {
      id: actorUserId,
      email: 'admin@example.test',
    },
    permissionGrants: permissionKeys.map((key) => ({
      organisationPermission: {
        key,
      },
    })),
  };
}

function createSettings(overrides: Record<string, unknown> = {}) {
  return {
    id: '44444444-4444-4444-8444-444444444444',
    organisationId,
    enforceRememberMePolicy: true,
    allowRememberMe: true,
    maxRememberedSessionHours: 168,
    enforceRegularSessionLength: true,
    regularSessionLengthHours: 8,
    enforceIdleTimeout: true,
    idleTimeoutMinutes: 30,
    requireReauthenticationForSensitiveActions: true,
    allowTraineeEmailChange: false,
    updatedByOrganisationAdminId: actorAdminId,
    createdAt: new Date('2026-07-01T08:00:00.000Z'),
    updatedAt: new Date('2026-07-02T08:00:00.000Z'),
    organisation: {
      id: organisationId,
      name: 'Example Organisation',
      status: 'ACTIVE',
    },
    updatedByOrganisationAdmin: null,
    ...overrides,
  };
}

function validUpdateInput() {
  return {
    enforceRememberMePolicy: true,
    allowRememberMe: true,
    maxRememberedSessionHours: 72,
    enforceRegularSessionLength: true,
    regularSessionLengthHours: 4,
    enforceIdleTimeout: true,
    idleTimeoutMinutes: 15,
    requireReauthenticationForSensitiveActions: false,
    allowTraineeEmailChange: true,
  };
}

describe('organisation security settings service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repositoryMock.findOrganisationSecuritySettingsActorAdmin.mockResolvedValue(createActor());
    repositoryMock.findOrganisationSecuritySettingsByOrganisationId.mockResolvedValue(
      createSettings(),
    );
    repositoryMock.runOrganisationSecuritySettingsTransaction.mockImplementation((action) =>
      action('tx-client'),
    );
    repositoryMock.updateOrganisationSecuritySettings.mockResolvedValue({
      oldSettings: createSettings(),
      newSettings: createSettings(validUpdateInput()),
    });
    auditLogMock.recordAuditLog.mockResolvedValue({ id: 'audit-1' });
  });

  it('returns read-only capability metadata when the actor lacks update permission', async () => {
    repositoryMock.findOrganisationSecuritySettingsActorAdmin.mockResolvedValue(createActor([]));

    await expect(
      getOrganisationSecuritySettings(actorUserId, organisationId),
    ).resolves.toMatchObject({
      organisationId,
      capabilities: {
        canView: true,
        canEdit: false,
        readOnlyReason: 'MISSING_PERMISSION',
      },
      platformLimits: {
        rememberMe: {
          maxRememberedSessionHours: {
            max: 720,
          },
        },
      },
    });
  });

  it('updates settings and audit logs safe old and new values', async () => {
    const input = validUpdateInput();

    await expect(
      patchOrganisationSecuritySettings(actorUserId, organisationId, input),
    ).resolves.toMatchObject({
      settings: {
        maxRememberedSessionHours: 72,
        regularSessionLengthHours: 4,
        idleTimeoutMinutes: 15,
        allowTraineeEmailChange: true,
      },
      effectivePolicy: {
        organisationId,
        regularSessionSeconds: 14400,
        idleTimeoutMinutes: 15,
        allowEmailChange: true,
      },
      capabilities: {
        canEdit: true,
        readOnlyReason: null,
      },
    });
    expect(repositoryMock.updateOrganisationSecuritySettings).toHaveBeenCalledWith(
      {
        organisationId,
        updatedByOrganisationAdminId: actorAdminId,
        ...input,
      },
      'tx-client',
    );
    expect(auditLogMock.recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId,
        actorType: 'ORGANISATION_ADMIN',
        organisationId,
        targetType: 'ORGANISATION_SECURITY_SETTINGS',
        targetId: '44444444-4444-4444-8444-444444444444',
        actionType: 'SETTINGS_CHANGED',
        outcome: 'SUCCESS',
        oldValues: expect.objectContaining({
          maxRememberedSessionHours: 168,
          updatedByOrganisationAdminId: actorAdminId,
        }),
        newValues: expect.objectContaining({
          maxRememberedSessionHours: 72,
          allowTraineeEmailChange: true,
        }),
      }),
      'tx-client',
    );
  });

  it('rejects updates without the required organisation permission', async () => {
    repositoryMock.findOrganisationSecuritySettingsActorAdmin.mockResolvedValue(createActor([]));

    await expect(
      patchOrganisationSecuritySettings(actorUserId, organisationId, validUpdateInput()),
    ).rejects.toMatchObject({
      statusCode: 403,
      error: 'ORG_SECURITY_SETTINGS_PERMISSION_REQUIRED',
    });
    expect(repositoryMock.updateOrganisationSecuritySettings).not.toHaveBeenCalled();
    expect(auditLogMock.recordAuditLog).not.toHaveBeenCalled();
  });

  it('rejects updates while the organisation is suspended', async () => {
    repositoryMock.findOrganisationSecuritySettingsActorAdmin.mockResolvedValue({
      ...createActor(['CHANGE_ORGANISATION_SECURITY_SETTINGS']),
      organisation: {
        id: organisationId,
        name: 'Example Organisation',
        status: 'SUSPENDED',
      },
    });

    await expect(
      patchOrganisationSecuritySettings(actorUserId, organisationId, validUpdateInput()),
    ).rejects.toMatchObject({
      statusCode: 409,
      error: 'ORG_SECURITY_SETTINGS_READ_ONLY',
    });
    expect(repositoryMock.updateOrganisationSecuritySettings).not.toHaveBeenCalled();
  });

  it('returns field-specific validation errors for conflicting dependent values', async () => {
    await expect(
      patchOrganisationSecuritySettings(actorUserId, organisationId, {
        ...validUpdateInput(),
        enforceIdleTimeout: true,
        idleTimeoutMinutes: null,
      }),
    ).rejects.toMatchObject({
      statusCode: 422,
      error: 'ORG_SECURITY_SETTINGS_VALIDATION_FAILED',
      fieldErrors: [
        {
          field: 'idleTimeoutMinutes',
          message: 'Idle timeout minutes is required when idle timeout is enforced',
        },
      ],
    });
    expect(repositoryMock.updateOrganisationSecuritySettings).not.toHaveBeenCalled();
  });
});

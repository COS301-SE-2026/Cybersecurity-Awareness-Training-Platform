import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  OrganisationScopeServiceError,
  requireOrganisationAdminScope,
} from '../../../src/services/organisation-scope.service.js';

const repositoryMock = vi.hoisted(() => ({
  findOrganisationAdminActorScope: vi.fn(),
  findOrganisationTraineeActorScope: vi.fn(),
  findOrganisationScopeById: vi.fn(),
}));

vi.mock('../../../src/repositories/organisation-scope.repository.js', () => repositoryMock);

const userId = '22222222-2222-4222-8222-222222222222';
const organisationId = '11111111-1111-4111-8111-111111111111';

function adminScope(permission: 'VIEW_CAMPAIGNS' | 'MANAGE_CAMPAIGNS') {
  return {
    id: 'admin-profile-id',
    userId,
    organisationId,
    organisation: { id: organisationId, name: 'Example', status: 'ACTIVE' },
    permissionGrants: [{ organisationPermission: { key: permission } }],
  };
}

describe('organisation scope service', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(['VIEW_CAMPAIGNS', 'MANAGE_CAMPAIGNS'] as const)(
    'accepts %s when a campaign read allows either permission',
    async (permission) => {
      repositoryMock.findOrganisationAdminActorScope.mockResolvedValue(adminScope(permission));

      await expect(
        requireOrganisationAdminScope({
          userId,
          organisationId,
          requiredAnyPermission: ['VIEW_CAMPAIGNS', 'MANAGE_CAMPAIGNS'],
        }),
      ).resolves.toMatchObject({
        userId,
        organisationId,
        grantedPermissions: new Set([permission]),
      });
    },
  );

  it('rejects an administrator who has neither permitted campaign read capability', async () => {
    repositoryMock.findOrganisationAdminActorScope.mockResolvedValue({
      ...adminScope('VIEW_CAMPAIGNS'),
      permissionGrants: [],
    });

    await expect(
      requireOrganisationAdminScope({
        userId,
        organisationId,
        requiredAnyPermission: ['VIEW_CAMPAIGNS', 'MANAGE_CAMPAIGNS'],
      }),
    ).rejects.toBeInstanceOf(OrganisationScopeServiceError);
  });
});

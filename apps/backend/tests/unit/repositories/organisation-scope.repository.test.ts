import { describe, expect, it, vi } from 'vitest';
import * as OrganisationScopeRepository from '../../../src/repositories/organisation-scope.repository.js';
import { prisma } from '../../../src/lib/prisma.js';

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    ipAdminProfile: {
      findFirst: vi.fn(),
    },
  },
}));

describe('OrganisationScopeRepository', () => {
  it('requires both the platform administrator and user account to be active', async () => {
    vi.mocked(prisma.ipAdminProfile.findFirst).mockResolvedValue(null);

    await OrganisationScopeRepository.findActiveIpAdminScope('user-1');

    expect(prisma.ipAdminProfile.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        adminStatus: 'ACTIVE',
        user: {
          authStatus: 'ACTIVE',
        },
      },
      select: {
        id: true,
        userId: true,
        adminStatus: true,
        platformAdminRole: true,
      },
    });
  });
});

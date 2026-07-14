import { vi } from 'vitest';
import type { ActionTokenPurpose, UserType } from '../../../src/generated/prisma/enums.js';

export const mockFutureDate = new Date(Date.now() + 86400000);
export const mockPastDate = new Date(Date.now() - 86400000);

export function buildMockInvitationToken(overrides: Record<string, unknown> = {}) {
  return {
    id: 'token-1',
    purpose: 'ORGANISATION_TRAINEE_INVITE' as ActionTokenPurpose,
    expiresAt: mockFutureDate,
    usedAt: null,
    revokedAt: null,
    targetEmail: 'trainee@example.com',
    invitation: {
      id: 'inv-1',
      status: 'PENDING',
      organisationId: 'org-1',
      recipientEmail: 'trainee@example.com',
      organisation: { id: 'org-1', name: 'Acme Corp', status: 'ACTIVE' },
      permissionGrants: [],
    },
    user: null,
    ...overrides,
  };
}

export function buildMockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'trainee@example.com',
    userType: 'ORGANISATION_TRAINEE' as UserType,
    authStatus: 'ACTIVE',
    ...overrides,
  };
}

export function createInvitationRepoMock() {
  return {
    findInvitationTokenByHash: vi.fn(),
    findUserByEmailWithProfiles: vi.fn(),
    claimInvitationAccept: vi.fn(),
    claimInvitationReject: vi.fn(),
    claimInvitationToken: vi.fn(),
    insertInvitationPermissionGrantsToAdmin: vi.fn(),
    updateUserRoleAndProfilesFromInvitation: vi.fn(),
    InvitationRepositoryConflictError: class extends Error {
      constructor(
        public readonly errorKey: string,
        message: string,
      ) {
        super(message);
        this.name = 'InvitationRepositoryConflictError';
      }
    },
  };
}

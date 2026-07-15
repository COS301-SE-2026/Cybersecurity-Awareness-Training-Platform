import { vi } from 'vitest';
import type {
  ActionTokenPurpose,
  InvitationStatus,
  OrganisationPermissionKey,
  UserType,
} from '../../../src/generated/prisma/enums.js';

export const mockOrgId = '11111111-1111-4111-8111-111111111111';
export const mockActorUserId = '22222222-2222-4222-8222-222222222222';
export const mockActorAdminId = '33333333-3333-4333-8333-333333333333';
export const mockTraineeId = '44444444-4444-4444-8444-444444444444';
export const mockTraineeUserId = '55555555-5555-4555-8555-555555555555';
export const mockInvitationId = '66666666-6666-4666-8666-666666666666';
export const mockActionTokenId = '77777777-7777-4777-8777-777777777777';
export const mockStoredPasswordHash = 'hashed_password_mock_123';

export function permissionGrant(key: OrganisationPermissionKey | string) {
  return {
    organisationPermission: {
      key,
      displayName: key.replaceAll('_', ' '),
    },
  };
}

export function buildMockActorAdmin(
  permissionKeys: readonly string[] = ['VIEW_ORGANISATION_TRAINEES'],
  overrides: Record<string, unknown> = {},
) {
  return {
    id: mockActorAdminId,
    userId: mockActorUserId,
    organisationId: mockOrgId,
    organisation: {
      id: mockOrgId,
      name: 'Acme Cybersecurity',
      status: 'ACTIVE',
    },
    user: {
      id: mockActorUserId,
      passwordHash: mockStoredPasswordHash,
    },
    permissionGrants: permissionKeys.map(permissionGrant),
    ...overrides,
  };
}

export function buildMockTraineeProfile(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-07-15T08:00:00.000Z');
  return {
    id: mockTraineeId,
    organisationId: mockOrgId,
    traineeProfileId: 'profile-id-1',
    membershipStatus: 'ACTIVE',
    createdAt: now,
    disabledAt: null,
    disabledReason: null,
    traineeProfile: {
      id: 'profile-id-1',
      userId: mockTraineeUserId,
      user: {
        id: mockTraineeUserId,
        email: 'trainee@example.com',
        firstName: 'Alex',
        lastName: 'Trainee',
        lastLoginAt: now,
      },
    },
    ...overrides,
  };
}

export function buildMockInvitation(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-07-15T08:00:00.000Z');
  const future = new Date('2026-07-22T08:00:00.000Z');
  return {
    id: mockInvitationId,
    organisationId: mockOrgId,
    recipientEmail: 'trainee@example.com',
    recipientFirstName: 'Alex',
    recipientLastName: 'Trainee',
    purpose: 'ORGANISATION_TRAINEE_INVITE' as ActionTokenPurpose,
    status: 'PENDING' as InvitationStatus,
    createdAt: now,
    updatedAt: now,
    expiresAt: future,
    ...overrides,
  };
}

export function buildMockUserWithProfiles(overrides: Record<string, unknown> = {}) {
  return {
    id: mockTraineeUserId,
    email: 'trainee@example.com',
    userType: 'ORGANISATION_TRAINEE' as UserType,
    authStatus: 'ACTIVE',
    ...overrides,
  };
}

export function createTraineeRepoMock() {
  return {
    findOrganisationTrainees: vi.fn(),
    findOrganisationTraineeInvitations: vi.fn(),
    findOrganisationTraineeByEmail: vi.fn(),
    findPendingTraineeInvitationByEmail: vi.fn(),
    findOrganisationTraineeById: vi.fn(),
    disableOrganisationTraineeProfile: vi.fn(),
  };
}

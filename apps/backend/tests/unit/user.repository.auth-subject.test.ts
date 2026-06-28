import { beforeEach, describe, expect, it, vi } from 'vitest';
const prismaMock = vi.hoisted(() => ({ user: { findUnique: vi.fn() } }));
vi.mock('../../src/lib/prisma.js', () => ({ prisma: prismaMock }));
import {
  findAuthSubjectByEmail,
  findAuthSubjectByUserId,
  toGuardAuthSubject,
} from '../../src/repositories/user.repository.js';
type AuthSubjectUser = NonNullable<Parameters<typeof toGuardAuthSubject>[0]>;
function authSubjectUser(overrides: Record<string, unknown>): AuthSubjectUser {
  return {
    id: 'user01',
    userType: 'GENERAL_TRAINEE',
    emailVerifiedAt: null,
    disabledAt: null,
    traineeProfile: null,
    organisationAdminProfile: null,
    ipAdminProfile: null,
    authStatus: 'ACTIVE',
    ...overrides,
  } as unknown as AuthSubjectUser;
}

describe('user repository auth subject helpers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps null users to an empty subject', () => {
    expect(toGuardAuthSubject(null)).toEqual({ user: null });
  });

  it('finds and maps auth subject by user id and email', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await findAuthSubjectByUserId('user01');
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user01' } }),
    );

    await findAuthSubjectByEmail('test@example.com');
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'test@example.com' } }),
    );
  });

  it('maps a general trainee subject with trainee profile', () => {
    const user = authSubjectUser({
      userType: 'GENERAL_TRAINEE',
      emailVerifiedAt: new Date('2026-06-26T08:00:00.000Z'),
      traineeProfile: {
        traineeStatus: 'ACTIVE',
        organisationTraineeProfile: null,
      },
    });

    expect(toGuardAuthSubject(user)).toMatchObject({
      user: {
        id: 'user01',
        userType: 'GENERAL_TRAINEE',
        authStatus: 'ACTIVE',
        emailVerifiedAt: new Date('2026-06-26T08:00:00.000Z'),
        disabledAt: null,
      },
      traineeProfile: { traineeStatus: 'ACTIVE' },
      organisationTraineeProfile: null,
    });
  });

  it('maps an organisation trainee subject with organisation context', () => {
    const user = authSubjectUser({
      userType: 'ORGANISATION_TRAINEE',
      traineeProfile: {
        traineeStatus: 'ACTIVE',
        organisationTraineeProfile: {
          organisationUserStatus: 'ACTIVE',
          organisation: {
            id: 'org01',
            status: 'ACTIVE',
          },
        },
      },
    });

    expect(toGuardAuthSubject(user)).toMatchObject({
      user: {
        id: 'user01',
        userType: 'ORGANISATION_TRAINEE',
        authStatus: 'ACTIVE',
      },
      traineeProfile: { traineeStatus: 'ACTIVE' },
      organisationTraineeProfile: {
        organisationUserStatus: 'ACTIVE',
        organisation: {
          id: 'org01',
          status: 'ACTIVE',
        },
      },
    });
  });

  it('maps organisation admin subject with organisation context', () => {
    const user = authSubjectUser({
      userType: 'ORGANISATION_ADMIN',
      organisationAdminProfile: {
        adminStatus: 'ACTIVE',
        organisation: {
          id: 'org01',
          status: 'ACTIVE',
        },
      },
    });

    expect(toGuardAuthSubject(user)).toMatchObject({
      user: {
        id: 'user01',
        userType: 'ORGANISATION_ADMIN',
        authStatus: 'ACTIVE',
      },
      organisationAdminProfile: {
        adminStatus: 'ACTIVE',
        organisation: {
          id: 'org01',
          status: 'ACTIVE',
        },
      },
    });
  });

  it('maps a IP admin subject with admin status', () => {
    const user = authSubjectUser({
      userType: 'IP_ADMIN',
      ipAdminProfile: {
        adminStatus: 'ACTIVE',
      },
    });

    expect(toGuardAuthSubject(user)).toMatchObject({
      user: {
        id: 'user01',
        userType: 'IP_ADMIN',
        authStatus: 'ACTIVE',
      },
      ipAdminProfile: {
        adminStatus: 'ACTIVE',
      },
    });
  });
}); //describe

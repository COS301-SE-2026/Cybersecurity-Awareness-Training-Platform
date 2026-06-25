import { prisma } from '../lib/prisma.js';
import type { GuardAuthSubject } from '../services/auth-status-guard.service.js';

const authSubjectInclude = {
  traineeProfile: {
    include: {
      organisationTraineeProfile: {
        include: {
          organisation: true,
        },
      },
    },
  },
  organisationAdminProfile: {
    include: {
      organisation: true,
    },
  },
  ipAdminProfile: true,
} as const;

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: {
      email,
    },
  });
}

export function createGeneralTraineeUser(input: {
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
}) {
  return prisma.user.create({
    data: {
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      passwordHash: input.passwordHash,
      userType: 'GENERAL_TRAINEE',
      authStatus: 'ACTIVE',
      traineeProfile: {
        create: {
          traineeStatus: 'ACTIVE',
          generalTraineeProfile: {
            create: {
              accessSource: 'SELF_SIGNUP',
            },
          },
        },
      },
    },
  });
}

export function findUserById(id: string) {
  return prisma.user.findUnique({
    where: {
      id,
    },
  });
}

export function findUserWithAuthSubjectById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: authSubjectInclude,
  });
}

type UserWithAuthSubject = NonNullable<Awaited<ReturnType<typeof findUserWithAuthSubjectById>>>;
export function toGuardAuthSubject(user: UserWithAuthSubject | null): GuardAuthSubject {
  if (!user) {
    return {
      user: null,
    };
  }

  return {
    user: {
      id: user.id,
      userType: user.userType,
      authStatus: user.authStatus,
      emailVerifiedAt: user.emailVerifiedAt,
      disabledAt: user.disabledAt,
    },
    traineeProfile: user.traineeProfile
      ? {
          traineeStatus: user.traineeProfile.traineeStatus,
        }
      : null,
    organisationTraineeProfile: user.traineeProfile?.organisationTraineeProfile
      ? {
          organisationUserStatus:
            user.traineeProfile.organisationTraineeProfile.organisationUserStatus,
          organisation: {
            id: user.traineeProfile.organisationTraineeProfile.organisation.id,
            status: user.traineeProfile.organisationTraineeProfile.organisation.status,
          },
        }
      : null,
    organisationAdminProfile: user.organisationAdminProfile
      ? {
          adminStatus: user.organisationAdminProfile.adminStatus,
          organisation: {
            id: user.organisationAdminProfile.organisation.id,
            status: user.organisationAdminProfile.organisation.status,
          },
        }
      : null,
    ipAdminProfile: user.ipAdminProfile
      ? {
          adminStatus: user.ipAdminProfile.adminStatus,
        }
      : null,
  };
}

export async function findAuthSubjectByUserId(userId: string): Promise<GuardAuthSubject> {
  const user = await findUserWithAuthSubjectById(userId);
  return toGuardAuthSubject(user);
}

export function findUserWithAuthSubjectByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: authSubjectInclude,
  });
}

export async function findAuthSubjectByEmail(email: string): Promise<GuardAuthSubject> {
  const user = await findUserWithAuthSubjectByEmail(email);
  return toGuardAuthSubject(user);
}

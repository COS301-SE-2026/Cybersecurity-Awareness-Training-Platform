import { prisma } from '../lib/prisma.js';

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: {
      email,
    },
  });
}

export function createGeneralLearnerUser(input: {
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
      userType: 'GENERAL_LEARNER',
      authStatus: 'ACTIVE',
      learnerProfile: {
        create: {
          learnerStatus: 'ACTIVE',
          generalLearnerProfile: {
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

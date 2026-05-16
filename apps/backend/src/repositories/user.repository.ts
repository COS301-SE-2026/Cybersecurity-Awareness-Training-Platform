import { prisma } from '../lib/prisma.js';

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

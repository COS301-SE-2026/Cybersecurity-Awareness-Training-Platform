import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';

type AccountClient = PrismaClient | Prisma.TransactionClient;

export type AccountUserRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  userType: string;
  authStatus: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AccountSecurityPreferencesRecord = {
  id: string;
  userId: string;
  preferredRegularSessionLengthHours: number | null;
  preferredRememberMeSessionLengthHours: number | null;
  preferredIdleTimeoutMinutes: number | null;
  createdAt: Date;
  updatedAt: Date;
};

type SecurityPreferenceInput = {
  userId: string;
  preferredRegularSessionLengthHours?: number | null;
  preferredRememberMeSessionLengthHours?: number | null;
  preferredIdleTimeoutMinutes?: number | null;
};

type SecurityPreferenceValues = Omit<SecurityPreferenceInput, 'userId'>;

const accountUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  userType: true,
  authStatus: true,
  emailVerifiedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export function findAccountUserById(userId: string, client: AccountClient = prisma) {
  return client.user.findUnique({
    where: { id: userId },
    select: accountUserSelect,
  });
}

export function updateAccountProfile(
  input: { userId: string; firstName: string; lastName: string },
  client: AccountClient = prisma,
) {
  return client.user.update({
    where: { id: input.userId },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
    },
    select: accountUserSelect,
  });
}

export function findAccountSecurityPreferences(userId: string, client: AccountClient = prisma) {
  return client.userSecurityPreferences.findUnique({
    where: { userId },
  });
}

export function upsertAccountSecurityPreferences(
  input: SecurityPreferenceInput,
  client: AccountClient = prisma,
) {
  const preferenceValues: SecurityPreferenceValues = {};

  if (Object.hasOwn(input, 'preferredRegularSessionLengthHours')) {
    preferenceValues.preferredRegularSessionLengthHours =
      input.preferredRegularSessionLengthHours ?? null;
  }

  if (Object.hasOwn(input, 'preferredRememberMeSessionLengthHours')) {
    preferenceValues.preferredRememberMeSessionLengthHours =
      input.preferredRememberMeSessionLengthHours ?? null;
  }

  if (Object.hasOwn(input, 'preferredIdleTimeoutMinutes')) {
    preferenceValues.preferredIdleTimeoutMinutes = input.preferredIdleTimeoutMinutes ?? null;
  }

  return client.userSecurityPreferences.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      ...preferenceValues,
    },
    update: preferenceValues,
  });
}

export function runAccountTransaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(callback);
}

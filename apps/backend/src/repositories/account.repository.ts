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

export type AccountUserWithPasswordRecord = AccountUserRecord & {
  passwordHash: string;
};

export type AccountSessionRecord = {
  id: string;
  rememberMe: boolean;
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
  idleTimeoutMinutes: number | null;
  revokedAt: Date | null;
  revokedReason: string | null;
  deviceSummary: string | null;
  locationSummary: string | null;
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

const accountUserWithPasswordSelect = {
  ...accountUserSelect,
  passwordHash: true,
} as const;

const accountSessionSelect = {
  id: true,
  rememberMe: true,
  createdAt: true,
  lastActiveAt: true,
  expiresAt: true,
  idleTimeoutMinutes: true,
  revokedAt: true,
  revokedReason: true,
  deviceSummary: true,
  locationSummary: true,
} as const;

export function findAccountUserById(userId: string, client: AccountClient = prisma) {
  return client.user.findUnique({
    where: { id: userId },
    select: accountUserSelect,
  });
}

export function findAccountUserWithPasswordById(userId: string, client: AccountClient = prisma) {
  return client.user.findUnique({
    where: { id: userId },
    select: accountUserWithPasswordSelect,
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

export function updateAccountPasswordHash(
  input: { userId: string; passwordHash: string },
  client: AccountClient = prisma,
) {
  return client.user.update({
    where: { id: input.userId },
    data: {
      passwordHash: input.passwordHash,
    },
    select: accountUserSelect,
  });
}

export function findAccountUserByEmail(email: string, client: AccountClient = prisma) {
  return client.user.findUnique({
    where: { email },
    select: accountUserSelect,
  });
}

export function cancelPendingEmailChangeRequests(
  input: { userId: string; now: Date },
  client: AccountClient = prisma,
) {
  return client.emailChangeRequest.updateMany({
    where: {
      userId: input.userId,
      status: 'PENDING',
    },
    data: {
      status: 'CANCELED',
      updatedAt: input.now,
    },
  });
}

export function revokePendingEmailChangeTokens(
  input: { userId: string; now: Date; reason: string },
  client: AccountClient = prisma,
) {
  return client.actionToken.updateMany({
    where: {
      userId: input.userId,
      purpose: 'EMAIL_CHANGE_VERIFICATION',
      usedAt: null,
      revokedAt: null,
    },
    data: {
      revokedAt: input.now,
      revokedReason: input.reason,
    },
  });
}

export function createEmailChangeRequest(
  input: {
    userId: string;
    currentEmail: string;
    requestedEmail: string;
    expiresAt: Date;
  },
  client: AccountClient = prisma,
) {
  return client.emailChangeRequest.create({
    data: {
      userId: input.userId,
      currentEmail: input.currentEmail,
      RequestedEmail: input.requestedEmail,
      expiresAt: input.expiresAt,
    },
  });
}

export function cancelEmailChangeRequest(
  input: { requestId: string; now: Date },
  client: AccountClient = prisma,
) {
  return client.emailChangeRequest.updateMany({
    where: {
      id: input.requestId,
      status: 'PENDING',
    },
    data: {
      status: 'CANCELED',
      updatedAt: input.now,
    },
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

export function listAccountSessions(userId: string, now: Date, client: AccountClient = prisma) {
  return client.authSession.findMany({
    where: {
      userId,
      revokedAt: null,
      expiresAt: {
        gt: now,
      },
    },
    select: accountSessionSelect,
    orderBy: [{ lastActiveAt: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
  });
}

export function findAccountSessionForUser(
  input: { userId: string; sessionId: string },
  client: AccountClient = prisma,
) {
  return client.authSession.findFirst({
    where: {
      id: input.sessionId,
      userId: input.userId,
    },
    select: accountSessionSelect,
  });
}

export function revokeAccountSessionForUser(
  input: { userId: string; sessionId: string; now: Date },
  client: AccountClient = prisma,
) {
  return client.authSession.updateMany({
    where: {
      id: input.sessionId,
      userId: input.userId,
      revokedAt: null,
    },
    data: {
      revokedAt: input.now,
      revokedReason: 'LOGOUT',
    },
  });
}

export function revokeOtherAccountSessions(
  input: { userId: string; currentSessionId: string; now: Date },
  client: AccountClient = prisma,
) {
  return client.authSession.updateMany({
    where: {
      userId: input.userId,
      id: {
        not: input.currentSessionId,
      },
      revokedAt: null,
    },
    data: {
      revokedAt: input.now,
      revokedReason: 'LOGOUT_ALL',
    },
  });
}

export function revokeAccountSessionsForPasswordChange(
  input: { userId: string; now: Date },
  client: AccountClient = prisma,
) {
  return client.authSession.updateMany({
    where: {
      userId: input.userId,
      revokedAt: null,
    },
    data: {
      revokedAt: input.now,
      revokedReason: 'PASSWORD_CHANGE',
    },
  });
}

export function revokeRefreshTokensForAccountSession(
  input: { sessionId: string; now: Date; reason: 'LOGOUT' | 'LOGOUT_ALL' | 'PASSWORD_CHANGE' },
  client: AccountClient = prisma,
) {
  return client.refreshToken.updateMany({
    where: {
      authSessionId: input.sessionId,
      revokedAt: null,
    },
    data: {
      revokedAt: input.now,
      revokedReason: input.reason,
    },
  });
}

export function revokeRefreshTokensForAccountUser(
  input: { userId: string; now: Date; reason: 'LOGOUT_ALL' | 'PASSWORD_CHANGE' },
  client: AccountClient = prisma,
) {
  return client.refreshToken.updateMany({
    where: {
      authSession: {
        userId: input.userId,
      },
      revokedAt: null,
    },
    data: {
      revokedAt: input.now,
      revokedReason: input.reason,
    },
  });
}

export function revokeRefreshTokensForOtherAccountSessions(
  input: { userId: string; currentSessionId: string; now: Date },
  client: AccountClient = prisma,
) {
  return client.refreshToken.updateMany({
    where: {
      authSession: {
        userId: input.userId,
        id: {
          not: input.currentSessionId,
        },
      },
      revokedAt: null,
    },
    data: {
      revokedAt: input.now,
      revokedReason: 'LOGOUT_ALL',
    },
  });
}

export function runAccountTransaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(callback);
}

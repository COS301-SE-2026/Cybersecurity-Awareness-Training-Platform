import request from 'supertest';
import { createApp } from '../../src/app.js';
import type { Prisma } from '../../src/generated/prisma/client.js';
import {
  AuthStatus,
  OrganisationStatus,
  OrganisationUserStatus,
  UserType,
} from '../../src/generated/prisma/enums.js';
import { prisma } from '../../src/lib/prisma.js';
import { issueAuthSession } from '../../src/services/auth-session.service.js';
import { issueRefreshToken } from '../../src/services/refresh-token.service.js';
import { loginTestUser } from './auth.js';
import {
  createOrganisation,
  createOrganisationAdminTestFixture,
  createTrainee,
  generateTestEmail,
} from './factories.js';

export type AccountSecurityRole = 'GENERAL_TRAINEE' | 'ORGANISATION_TRAINEE' | 'ORGANISATION_ADMIN';

export type AccountSecuritySettingsOverrides = Partial<
  Pick<
    Prisma.OrganisationSecuritySettingsUncheckedCreateInput,
    | 'enforceRememberMePolicy'
    | 'allowRememberMe'
    | 'maxRememberedSessionHours'
    | 'enforceRegularSessionLength'
    | 'regularSessionLengthHours'
    | 'enforceIdleTimeout'
    | 'idleTimeoutMinutes'
    | 'requireReauthenticationForSensitiveActions'
    | 'allowTraineeEmailChange'
  >
>;

export type AccountSecurityUserFixtureInput = {
  role?: AccountSecurityRole;
  email?: string;
  firstName?: string;
  lastName?: string;
  organisationStatus?: OrganisationStatus;
  securitySettings?: AccountSecuritySettingsOverrides;
};

const defaultSessionTtlMs = 8 * 60 * 60 * 1000;

function accountSecurityUserType(role: AccountSecurityRole) {
  switch (role) {
    case 'ORGANISATION_ADMIN':
      return UserType.ORGANISATION_ADMIN;
    case 'ORGANISATION_TRAINEE':
      return UserType.ORGANISATION_TRAINEE;
    case 'GENERAL_TRAINEE':
      return UserType.GENERAL_TRAINEE;
  }
}

export function accountAuthHeader(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

export async function upsertAccountSecurityOrganisationSettings(
  organisationId: string,
  overrides: AccountSecuritySettingsOverrides = {},
) {
  return prisma.organisationSecuritySettings.upsert({
    where: { organisationId },
    create: {
      organisationId,
      ...overrides,
    },
    update: overrides,
  });
}

export async function createAccountSecurityUserFixture(
  input: AccountSecurityUserFixtureInput = {},
) {
  const role = input.role ?? 'GENERAL_TRAINEE';
  const email = input.email ?? generateTestEmail('account-security');
  const firstName = input.firstName ?? 'Account';
  const lastName = input.lastName ?? 'User';

  if (role === 'GENERAL_TRAINEE') {
    const trainee = await createTrainee({
      user: {
        email,
        firstName,
        lastName,
        userType: accountSecurityUserType(role),
        authStatus: AuthStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      },
    });

    return {
      role,
      user: trainee.user,
      organisation: null,
      traineeProfile: trainee.traineeProfile,
      organisationTraineeProfile: null,
      adminProfile: null,
    };
  }

  const organisation = await createOrganisation({
    status: input.organisationStatus ?? OrganisationStatus.ACTIVE,
  });

  if (input.securitySettings) {
    await upsertAccountSecurityOrganisationSettings(organisation.id, input.securitySettings);
  }

  if (role === 'ORGANISATION_ADMIN') {
    const admin = await createOrganisationAdminTestFixture({
      organisation: { id: organisation.id },
      user: {
        email,
        firstName,
        lastName,
        authStatus: AuthStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      },
    });

    return {
      role,
      user: admin.user,
      organisation: admin.organisation,
      traineeProfile: null,
      organisationTraineeProfile: null,
      adminProfile: admin.adminProfile,
    };
  }

  const trainee = await createTrainee({
    user: {
      email,
      firstName,
      lastName,
      userType: accountSecurityUserType(role),
      authStatus: AuthStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
    organisationProfile: {
      organisationId: organisation.id,
      membershipStatus: OrganisationUserStatus.ACTIVE,
    },
  });

  return {
    role,
    user: trainee.user,
    organisation,
    traineeProfile: trainee.traineeProfile,
    organisationTraineeProfile: trainee.organisationTraineeProfile,
    adminProfile: null,
  };
}

export async function loginAccountSecurityUser(email: string) {
  const response = await loginTestUser(email);
  const accessToken =
    typeof response.body.accessToken === 'string'
      ? response.body.accessToken
      : typeof response.body.token === 'string'
        ? response.body.token
        : null;

  if (response.status !== 200 || !accessToken) {
    throw new Error(`Expected account-security fixture login to succeed, got ${response.status}`);
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { email },
  });
  const currentSession = await prisma.authSession.findFirstOrThrow({
    where: { userId: user.id, revokedAt: null },
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
  });

  return {
    response,
    accessToken,
    token: accessToken,
    headers: accountAuthHeader(accessToken),
    cookies: response.headers['set-cookie'],
    currentSession,
  };
}

export async function createAccountSecuritySession(input: {
  userId: string;
  rememberMe?: boolean;
  expiresAt?: Date;
  idleTimeoutMinutes?: number | null;
  lastActiveAt?: Date;
  deviceSummary?: string | null;
  locationSummary?: string | null;
}) {
  const expiresAt = input.expiresAt ?? new Date(Date.now() + defaultSessionTtlMs);
  const session = await issueAuthSession({
    userId: input.userId,
    rememberMe: input.rememberMe ?? false,
    expiresAt,
    idleTimeoutMinutes: input.idleTimeoutMinutes ?? null,
    deviceSummary: input.deviceSummary ?? null,
    locationSummary: input.locationSummary ?? null,
  });
  const refreshToken = await issueRefreshToken({
    authSessionId: session.id,
    expiresAt,
  });

  if (input.lastActiveAt) {
    await prisma.authSession.update({
      where: { id: session.id },
      data: { lastActiveAt: input.lastActiveAt },
    });
  }

  return {
    session: input.lastActiveAt
      ? await prisma.authSession.findUniqueOrThrow({ where: { id: session.id } })
      : session,
    refreshToken: refreshToken.token,
    rawRefreshToken: refreshToken.rawToken,
  };
}

export async function createAccountSecurityUserWithSessions(
  input: AccountSecurityUserFixtureInput & { sessionCount?: number } = {},
) {
  const fixture = await createAccountSecurityUserFixture(input);
  const sessionCount = input.sessionCount ?? 2;
  const sessions = [];

  for (let index = 0; index < sessionCount; index += 1) {
    sessions.push(
      await createAccountSecuritySession({
        userId: fixture.user.id,
        deviceSummary: `Test device ${index + 1}`,
        locationSummary: `Test location ${index + 1}`,
      }),
    );
  }

  return {
    ...fixture,
    sessions,
  };
}

export async function getAccount(app = createApp(), accessToken: string) {
  return request(app).get('/account').set(accountAuthHeader(accessToken));
}

export async function readAccountSecurityUserState(userId: string) {
  return prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      securityPreferences: true,
      authSessions: {
        include: {
          refreshTokens: {
            select: {
              id: true,
              authSessionId: true,
              issuedAt: true,
              expiresAt: true,
              usedAt: true,
              revokedAt: true,
              revokedReason: true,
              replacedByTokenId: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      },
      emailChangeRequests: {
        include: {
          actionTokens: {
            select: {
              id: true,
              purpose: true,
              userId: true,
              emailChangeRequestId: true,
              targetEmail: true,
              expiresAt: true,
              usedAt: true,
              revokedAt: true,
              revokedReason: true,
              createdAt: true,
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      },
    },
  });
}

export async function readLatestEmailChangeRequest(userId: string) {
  return prisma.emailChangeRequest.findFirst({
    where: { userId },
    include: {
      actionTokens: {
        select: {
          id: true,
          purpose: true,
          userId: true,
          emailChangeRequestId: true,
          targetEmail: true,
          expiresAt: true,
          usedAt: true,
          revokedAt: true,
          revokedReason: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
  });
}

export async function readAccountEmailDeliveries(userId: string) {
  return prisma.emailDeliveryLog.findMany({
    where: { userId },
    select: {
      id: true,
      emailType: true,
      userId: true,
      actionTokenId: true,
      fallbackRelatedEntityType: true,
      fallbackRelatedEntityId: true,
      deliveryStatus: true,
      failureReason: true,
      sentAt: true,
      failedAt: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
  });
}

export async function readAccountAuditEntries(userId: string) {
  return prisma.auditLogEntry.findMany({
    where: { actorUserId: userId },
    select: {
      id: true,
      actorUserId: true,
      actorType: true,
      organisationId: true,
      targetType: true,
      targetId: true,
      actionType: true,
      outcome: true,
      oldValues: true,
      newValues: true,
      metadata: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
  });
}

export function serialiseAuditPayloads(
  entries: Awaited<ReturnType<typeof readAccountAuditEntries>>,
) {
  return JSON.stringify(
    entries.map((entry) => ({
      oldValues: entry.oldValues,
      newValues: entry.newValues,
      metadata: entry.metadata,
    })),
  );
}

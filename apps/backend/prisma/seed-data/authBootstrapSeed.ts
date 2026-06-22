import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { hashPassword } from '../../src/services/password.service.js';

const AUTH_BOOTSTRAP_ENV = {
  email: 'AUTH_BOOTSTRAP_SUPER_ADMIN_EMAIL',
  password: 'AUTH_BOOTSTRAP_SUPER_ADMIN_PASSWORD',
  name: 'AUTH_BOOTSTRAP_SUPER_ADMIN_NAME',
} as const;

export type AuthBootstrapSeedSummary = {
  readonly skipped: boolean;
  readonly created: boolean;
  readonly updated: boolean;
  readonly email?: string;
  readonly reason?: string;
};

type AuthBootstrapConfig = {
  readonly email: string;
  readonly password: string;
  readonly firstName: string;
  readonly lastName: string;
};

export function getAuthBootstrapEnvVarNames(): typeof AUTH_BOOTSTRAP_ENV {
  return AUTH_BOOTSTRAP_ENV;
}

export function readAuthBootstrapConfig(
  env: NodeJS.ProcessEnv = process.env,
): AuthBootstrapConfig | null {
  const email = env[AUTH_BOOTSTRAP_ENV.email]?.trim().toLowerCase();
  const password = env[AUTH_BOOTSTRAP_ENV.password]?.trim();
  const name = env[AUTH_BOOTSTRAP_ENV.name]?.trim();

  if (!email && !password && !name) {
    return null;
  }

  const missing = Object.values(AUTH_BOOTSTRAP_ENV).filter((key) => !env[key]?.trim());

  if (missing.length > 0) {
    throw new TypeError(`Missing auth bootstrap enviroment variables: ${missing.join(', ')}`);
  }

  const [firstName, ...lastNameParts] = name!.split(/\s+/);

  return {
    email: email!,
    password: password!,
    firstName,
    lastName: lastNameParts.join(' ') || 'Admin',
  };
}

export async function seedAuthBootstrap(
  client: PrismaClient,
  env: NodeJS.ProcessEnv = process.env,
): Promise<AuthBootstrapSeedSummary> {
  const config = readAuthBootstrapConfig(env);

  if (!config) {
    return {
      skipped: true,
      created: false,
      updated: false,
      reason: 'Auth bootstrap env vars are not set.',
    };
  }

  const passwordHash = await hashPassword(config.password);

  const existingSuperAdmin = await client.ipAdminProfile.findFirst({
    where: {
      platformAdminRole: 'SUPER_ADMIN',
    },
  });

  if (existingSuperAdmin) {
    await client.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: existingSuperAdmin.userId,
        },
        data: {
          email: config.email,
          firstName: config.firstName,
          lastName: config.lastName,
          passwordHash,
          userType: 'IP_ADMIN',
          authStatus: 'ACTIVE',
          emailVerifiedAt: new Date(),
          disabledAt: null,
          disabledReason: null,
        },
      });

      await tx.ipAdminProfile.update({
        where: {
          userId: existingSuperAdmin.userId,
        },
        data: {
          adminStatus: 'ACTIVE',
          platformAdminRole: 'SUPER_ADMIN',
          revokedAt: null,
          revokedReason: null,
        },
      });
    });

    return {
      skipped: false,
      created: false,
      updated: true,
      email: config.email,
    };
  }

  await client.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: {
        email: config.email,
      },
      create: {
        email: config.email,
        firstName: config.firstName,
        lastName: config.lastName,
        passwordHash,
        userType: 'IP_ADMIN',
        authStatus: 'ACTIVE',
        emailVerifiedAt: new Date(),
        disabledAt: null,
        disabledReason: null,
      },
      update: {
        firstName: config.firstName,
        lastName: config.lastName,
        passwordHash,
        userType: 'IP_ADMIN',
        authStatus: 'ACTIVE',
        emailVerifiedAt: new Date(),
        disabledAt: null,
        disabledReason: null,
      },
    });

    await tx.ipAdminProfile.upsert({
      where: {
        userId: user.id,
      },
      create: {
        userId: user.id,
        adminStatus: 'ACTIVE',
        platformAdminRole: 'SUPER_ADMIN',
      },
      update: {
        userId: user.id,
        adminStatus: 'ACTIVE',
        platformAdminRole: 'SUPER_ADMIN',
        revokedAt: null,
        revokedReason: null,
      },
    });
  });

  return {
    skipped: false,
    created: true,
    updated: false,
    email: config.email,
  };
}

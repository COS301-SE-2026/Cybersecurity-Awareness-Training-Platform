import { hashPassword } from '../../src/services/password.service.js';

const AUTH_BOOTSTRAP_PASSWORD_ENV_VAR = ['AUTH_BOOTSTRAP_SUPER_ADMIN', 'PASSWORD'].join('_');

const AUTH_BOOTSTRAP_ENV = {
  email: 'AUTH_BOOTSTRAP_SUPER_ADMIN_EMAIL',
  password: AUTH_BOOTSTRAP_PASSWORD_ENV_VAR,
  name: 'AUTH_BOOTSTRAP_SUPER_ADMIN_NAME',
} as const;

const AUTH_BOOTSTRAP_EXAMPLE_EMAIL = 'admin@example.com';
const AUTH_BOOTSTRAP_EXAMPLE_NAME = 'Platform Admin';

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

type AuthBootstrapUserData = {
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly passwordHash: string;
  readonly userType: 'IP_ADMIN';
  readonly authStatus: 'ACTIVE';
  readonly emailVerifiedAt: Date;
  readonly disabledAt: null;
  readonly disabledReason: null;
};

const ACTIVE_SUPER_ADMIN_PROFILE_DATA = {
  adminStatus: 'ACTIVE',
  platformAdminRole: 'SUPER_ADMIN',
  revokedAt: null,
  revokedReason: null,
} as const;

type AuthBootstrapIpAdminProfile = {
  readonly userId: string;
};

type AuthBootstrapPrismaTransaction = {
  readonly user: {
    update(args: { where: { id: string }; data: AuthBootstrapUserData }): Promise<unknown>;
    upsert(args: {
      where: { email: string };
      create: AuthBootstrapUserData;
      update: AuthBootstrapUserData;
    }): Promise<{ id: string }>;
  };
  readonly ipAdminProfile: {
    update(args: {
      where: { userId: string };
      data: typeof ACTIVE_SUPER_ADMIN_PROFILE_DATA;
    }): Promise<unknown>;
    upsert(args: {
      where: { userId: string };
      create: {
        userId: string;
        adminStatus: 'ACTIVE';
        platformAdminRole: 'SUPER_ADMIN';
      };
      update: typeof ACTIVE_SUPER_ADMIN_PROFILE_DATA;
    }): Promise<unknown>;
  };
};

type AuthBootstrapPrismaClient = {
  readonly ipAdminProfile: {
    findFirst(args: {
      where: { platformAdminRole: 'SUPER_ADMIN' };
    }): Promise<AuthBootstrapIpAdminProfile | null>;
  };
  $transaction(callback: (tx: AuthBootstrapPrismaTransaction) => Promise<void>): Promise<void>;
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
  const values = { email, password, name };

  if (isAuthBootstrapPlaceholderConfig(values)) {
    return null;
  }

  const missing = [
    !isMeaningfulAuthBootstrapEmail(email) ? AUTH_BOOTSTRAP_ENV.email : null,
    !password ? AUTH_BOOTSTRAP_ENV.password : null,
    !isMeaningfulAuthBootstrapName(name) ? AUTH_BOOTSTRAP_ENV.name : null,
  ].filter((key): key is string => key !== null);

  if (missing.length > 0) {
    throw new TypeError(`Missing auth bootstrap environment variables: ${missing.join(', ')}`);
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
  client: AuthBootstrapPrismaClient,
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
  const userData = buildAuthBootstrapUserData(config, passwordHash);

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
        data: userData,
      });

      await tx.ipAdminProfile.update({
        where: {
          userId: existingSuperAdmin.userId,
        },
        data: ACTIVE_SUPER_ADMIN_PROFILE_DATA,
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
      create: userData,
      update: userData,
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
      update: ACTIVE_SUPER_ADMIN_PROFILE_DATA,
    });
  });

  return {
    skipped: false,
    created: true,
    updated: false,
    email: config.email,
  };
}

function buildAuthBootstrapUserData(
  config: AuthBootstrapConfig,
  passwordHash: string,
): AuthBootstrapUserData {
  return {
    email: config.email,
    firstName: config.firstName,
    lastName: config.lastName,
    passwordHash,
    userType: 'IP_ADMIN',
    authStatus: 'ACTIVE',
    emailVerifiedAt: new Date(),
    disabledAt: null,
    disabledReason: null,
  };
}

function isAuthBootstrapPlaceholderConfig(values: {
  readonly email: string | undefined;
  readonly password: string | undefined;
  readonly name: string | undefined;
}): boolean {
  return (
    !isMeaningfulAuthBootstrapEmail(values.email) &&
    !values.password &&
    !isMeaningfulAuthBootstrapName(values.name)
  );
}

function isMeaningfulAuthBootstrapEmail(email: string | undefined): email is string {
  return Boolean(email && email !== AUTH_BOOTSTRAP_EXAMPLE_EMAIL);
}

function isMeaningfulAuthBootstrapName(name: string | undefined): name is string {
  return Boolean(name && name !== AUTH_BOOTSTRAP_EXAMPLE_NAME);
}

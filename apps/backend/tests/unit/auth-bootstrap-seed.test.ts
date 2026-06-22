import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getAuthBootstrapEnvVarNames,
  readAuthBootstrapConfig,
  seedAuthBootstrap,
} from '../../prisma/seed-data/authBootstrapSeed.js';

vi.mock('../../src/services/password.service.js', () => ({
  hashPassword: vi.fn(async (password: string) => `scrypt$mock$${password}`),
}));

function createPrismaMock() {
  const tx = {
    user: {
      update: vi.fn(),
      upsert: vi.fn(async () => ({ id: 'user-1' })),
    },
    ipAdminProfile: {
      update: vi.fn(),
      upsert: vi.fn(),
    },
  };

  return {
    ipAdminProfile: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(async (callback: (txClient: typeof tx) => Promise<void>) => callback(tx)),
    __tx: tx,
  };
}

describe('auth bootstrap seed', () => {
  const envNames = getAuthBootstrapEnvVarNames();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('skips safely when bootstrap env vars are absent', async () => {
    const prismaMock = createPrismaMock();

    const summary = await seedAuthBootstrap(prismaMock as never, {});

    expect(summary).toMatchObject({
      skipped: true,
      created: false,
      updated: false,
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('throws clearly when bootstrap env config is partial', () => {
    expect(() =>
      readAuthBootstrapConfig({
        [envNames.email]: 'admin@example.com',
      } as NodeJS.ProcessEnv),
    ).toThrow(envNames.password);
  });

  it('creates the first SUPER_ADMIN user and IP admin profile', async () => {
    const prismaMock = createPrismaMock();
    prismaMock.ipAdminProfile.findFirst.mockResolvedValue(null);

    const summary = await seedAuthBootstrap(
      prismaMock as never,
      {
        [envNames.email]: ' Admin@Example.com ',
        [envNames.password]: 'SuperAdmin123!',
        [envNames.name]: 'Platform Admin',
      } as NodeJS.ProcessEnv,
    );

    expect(summary).toMatchObject({
      skipped: false,
      created: true,
      updated: false,
      email: 'admin@example.com',
    });

    expect(prismaMock.__tx.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          email: 'admin@example.com',
        },
      }),
    );

    expect(prismaMock.__tx.ipAdminProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          adminStatus: 'ACTIVE',
          platformAdminRole: 'SUPER_ADMIN',
        }),
        update: expect.objectContaining({
          adminStatus: 'ACTIVE',
          platformAdminRole: 'SUPER_ADMIN',
        }),
      }),
    );
  });

  it('updates an existing SUPER_ADMIN instead of duplicating it', async () => {
    const prismaMock = createPrismaMock();
    prismaMock.ipAdminProfile.findFirst.mockResolvedValue({
      userId: 'existing-user',
    });

    const summary = await seedAuthBootstrap(
      prismaMock as never,
      {
        [envNames.email]: 'admin@example.com',
        [envNames.password]: 'SuperAdmin123!',
        [envNames.name]: 'Platform Admin',
      } as NodeJS.ProcessEnv,
    );

    expect(summary).toMatchObject({
      skipped: false,
      created: false,
      updated: true,
      email: 'admin@example.com',
    });

    expect(prismaMock.__tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'existing-user',
        },
      }),
    );

    expect(prismaMock.__tx.user.upsert).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const txMock = vi.hoisted(() => ({
  $executeRaw: vi.fn(),
  emailProviderProfile: {
    findFirst: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  phishingSimulation: { findFirst: vi.fn() },
}));
const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(async (operation: (tx: typeof txMock) => Promise<unknown>) =>
    operation(txMock),
  ),
}));

vi.mock('../../../src/lib/prisma.js', () => ({ prisma: prismaMock }));

const { reserveEmailProviderProfileMutation, updateEmailProviderProfile } =
  await import('../../../src/repositories/email-provider-profile.repository.js');

describe('EmailProviderProfileRepository mutation ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects an overlapping reservation without changing the profile', async () => {
    txMock.emailProviderProfile.findFirst.mockResolvedValue({
      id: 'profile-1',
      mutationToken: 'existing-owner',
    });

    const result = await reserveEmailProviderProfileMutation({
      organisationId: 'organisation-1',
      profileId: 'profile-1',
      mutationToken: 'new-owner',
      inUseStatuses: ['SCHEDULED', 'RUNNING'],
    });

    expect(result).toEqual({ state: 'MUTATION_IN_PROGRESS' });
    expect(txMock.phishingSimulation.findFirst).not.toHaveBeenCalled();
    expect(txMock.emailProviderProfile.update).not.toHaveBeenCalled();
  });

  it('finalises an update only for its reservation owner', async () => {
    txMock.emailProviderProfile.updateMany.mockResolvedValue({ count: 1 });
    txMock.emailProviderProfile.findFirst.mockResolvedValue({ id: 'profile-1' });

    await updateEmailProviderProfile({
      organisationId: 'organisation-1',
      profileId: 'profile-1',
      mutationToken: 'mutation-owner',
      status: 'ACTIVE',
    });

    expect(txMock.emailProviderProfile.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'profile-1',
        organisationId: 'organisation-1',
        mutationToken: 'mutation-owner',
      },
      data: { status: 'ACTIVE', mutationToken: null },
    });
  });
});

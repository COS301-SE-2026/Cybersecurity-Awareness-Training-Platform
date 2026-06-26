import { beforeEach, describe, expect, it, vi } from 'vitest';
const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  actionToken: {
    create: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
}));
vi.mock('../../src/lib/prisma.js', () => ({ prisma: prismaMock }));
import {
  createActionToken,
  markActionTokenUsed,
  revokeActionToken,
  withClaimedActionToken,
} from '../../src/repositories/action-token.repository.js';

describe('action-token repository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates an action token with nulled defaul relations', async () => {
    await createActionToken({
      tokenHash: 'tokenhash01',
      purpose: 'EMAIL_VERIFICATION',
      expiresAt: new Date('2026-06-24'),
    } as any);
    expect(prismaMock.actionToken.create).toHaveBeenCalledWith({
      data: {
        tokenHash: 'tokenhash01',
        purpose: 'EMAIL_VERIFICATION',
        expiresAt: new Date('2026-06-24'),
        usedId: null,
        invitationId: null,
        emailChangeRequestId: null,
        organisationRegistrationRequestId: null,
        targetEmail: null,
      },
    });
  });

  it('marks only tokens that are not consumed and not revoked as used', async () => {
    prismaMock.actionToken.updateMany.mockResolvedValue({ count: 1 });
    await expect(markActionTokenUsed('actiontoken01')).resolves.toBe(true);
    expect(prismaMock.actionToken.updateMany).toHaveBeenCalledWith({
      where: { id: 'actiontoken01', usedAt: null, revokedAt: null },
      data: { usedAt: expect.any(Date) },
    });
  });

  it('returnf false when no token was claimed', async () => {
    prismaMock.actionToken.updateMany.mockResolvedValue({ count: 0 });
    await expect(markActionTokenUsed('actiontoken01')).resolves.toBe(false);
  });

  it('reokes an action token with a reason', async () => {
    await revokeActionToken({ id: 'actiontoken01', revokedReason: 'superseded' });
    expect(prismaMock.actionToken.update).toHaveBeenCalledWith({
      where: {
        id: 'actiontoken01',
        data: { revokedAt: expect.any(Date), revokedReason: 'superseded' },
      },
    });
  });

  it('doesnt run the action when the transaction claim fails', async () => {
    const tx = { actionToken: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) } };
    prismaMock.$transaction.mockImplementation((fn) => fn(tx));
    const action = vi.fn();
    await expect(withClaimedActionToken({ tokenId: 'actiontoken01' }, action)).resolves.toEqual({
      claimed: false,
      result: null,
    });
    expect(action).not.toHaveBeenCalled();
  });
}); //describe

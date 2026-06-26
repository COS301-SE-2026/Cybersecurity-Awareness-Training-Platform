import { beforeEach, describe, expect, it, vi } from 'vitest';
const prismaMock = vi.hoisted(() => ({ user: { findUnique: vi.fn() } }));
vi.mock('../../src/lib/prisma.js', () => ({ prisma: prismaMock }));
import {
  findAuthSubjectByEmail,
  findAuthSubjectByUserId,
  toGuardAuthSubject,
} from '../../src/repositories/user.repository.js';

describe('user repository auth subject helpers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps null users to an empty subject', () => {
    expect(toGuardAuthSubject(null)).toEqual({ user: null });
  });

  it('finds and maps auth subject by user id and email', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await findAuthSubjectByUserId('user01');
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user01' } }),
    );

    await findAuthSubjectByEmail('test@example.com');
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'test@example.com' } }),
    );
  });
}); //describe

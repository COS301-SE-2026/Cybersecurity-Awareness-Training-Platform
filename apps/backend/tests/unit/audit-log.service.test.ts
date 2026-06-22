import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  recordAuditFailure,
  recordAuditLog,
  sanitiseValues,
} from '../../src/services/audit-log.service.js';
import type { Prisma } from '../../src/generated/prisma/client.js';

const prismaMock = vi.hoisted(() => ({
  auditLogEntry: {
    create: vi.fn(),
  },
}));

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

const baseAuditInput = {
  actorUserId: 'user01',
  actorType: 'IP_ADMIN' as const,
  organisationId: 'org01',
  targetType: 'USER' as const,
  targetId: 'targetuser01',
  actionType: 'UPDATED' as const,
};

describe('recordAuditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    prismaMock.auditLogEntry.create.mockResolvedValue({
      id: 'auditlog01',
      createdAt: new Date('2026-06-22'),
    });
  });

  it('created a success audit log entry with actor, organisation, target and request metadata', async () => {
    await recordAuditLog({
      ...baseAuditInput,
      oldValues: { firstName: 'Old' },
      newValues: { firstName: 'New' },
      metadata: { reason: 'profile_update' },
      ipAddress: '127.0.0.1',
      userAgent: 'Test',
    });

    expect(prismaMock.auditLogEntry.create).toHaveBeenCalledWith({
      data: {
        actorUserId: 'user01',
        actorType: 'IP_ADMIN',
        organisationId: 'org01',
        targetType: 'USER',
        targetId: 'targetuser01',
        actionType: 'UPDATED',
        outcome: 'SUCCESS',
        oldValues: { firstName: 'Old' },
        newValues: { firstName: 'New' },
        metadata: { reason: 'profile_update' },
        ipAddress: '127.0.0.1',
        userAgent: 'Test',
      },
    });
  });

  it('defaults optional nullable fields to null', async () => {
    await recordAuditLog({
      actorUserId: 'user01',
      actorType: 'IP_ADMIN',
      targetType: 'OTHER',
      actionType: 'UPDATED',
    });

    expect(prismaMock.auditLogEntry.create).toHaveBeenCalledWith({
      data: {
        actorUserId: 'user01',
        actorType: 'IP_ADMIN',
        organisationId: null,
        targetType: 'OTHER',
        targetId: null,
        actionType: 'UPDATED',
        outcome: 'SUCCESS',
        oldValues: undefined,
        newValues: undefined,
        metadata: undefined,
        ipAddress: null,
        userAgent: null,
      },
    });
  });

  it('creates a failure audit log entry using recordAuditFailure', async () => {
    await recordAuditFailure({
      ...baseAuditInput,
      oldValues: { firstName: 'Old' },
      newValues: { firstName: 'New' },
      metadata: { reason: 'profile_update' },
      ipAddress: '127.0.0.1',
      userAgent: 'Test',
    });

    expect(prismaMock.auditLogEntry.create).toHaveBeenCalledWith({
      data: {
        actorUserId: 'user01',
        actorType: 'IP_ADMIN',
        organisationId: 'org01',
        targetType: 'USER',
        targetId: 'targetuser01',
        actionType: 'UPDATED',
        outcome: 'FAILURE',
        oldValues: { firstName: 'Old' },
        newValues: { firstName: 'New' },
        metadata: { reason: 'profile_update' },
        ipAddress: '127.0.0.1',
        userAgent: 'Test',
      },
    });
  });

  it('rejects SYSTEM audit entries that have an actorUserId', () => {
    expect(() =>
      recordAuditLog({
        ...baseAuditInput,
        actorType: 'SYSTEM',
        actorUserId: 'user01',
      }),
    ).toThrow('SYSTEM audit entries must now have an actorUserId');

    expect(prismaMock.auditLogEntry.create).not.toHaveBeenCalled();
  });

  it('rejects non-SYSTEM audit entries that do not have an actorUserId', () => {
    expect(() =>
      recordAuditLog({
        ...baseAuditInput,
        actorType: 'IP_ADMIN',
        actorUserId: undefined,
      }),
    ).toThrow('Audit entries not made by the SYSTEM actor must have an actorUserId');

    expect(prismaMock.auditLogEntry.create).not.toHaveBeenCalled();
  });

  it('rejects audit entries that do not have a targetId unless the targetType is OTHER', () => {
    expect(() =>
      recordAuditLog({
        ...baseAuditInput,
        targetType: 'USER',
        targetId: undefined,
      }),
    ).toThrow('Audit entries must have a tagetId unless the targetType is OTHER');

    expect(prismaMock.auditLogEntry.create).not.toHaveBeenCalled();
  });

  it('allows audit entries that do not have a targetId if the targetType is OTHER', async () => {
    await recordAuditLog({
      ...baseAuditInput,
      targetType: 'OTHER',
      targetId: undefined,
    });

    expect(prismaMock.auditLogEntry.create).toHaveBeenCalledWith({
      data: {
        actorUserId: 'user01',
        actorType: 'IP_ADMIN',
        organisationId: 'org01',
        targetType: 'OTHER',
        targetId: null,
        actionType: 'UPDATED',
        outcome: 'SUCCESS',
        oldValues: undefined,
        newValues: undefined,
        metadata: undefined,
        ipAddress: null,
        userAgent: null,
      },
    });
  });

  it('redacts sensitive fields from oldValues, newValues and metadata', async () => {
    await recordAuditLog({
      ...baseAuditInput,
      oldValues: { password: 'oldpassword', firstName: 'Old' },
      newValues: {
        password: 'newpassword',
        nested: { refreshToken: 'tokenvalue' },
        firstName: 'New',
      },
      metadata: { reason: 'profile_update', secretKey: 'secret' },
    });

    expect(prismaMock.auditLogEntry.create).toHaveBeenCalledWith({
      data: {
        actorUserId: 'user01',
        actorType: 'IP_ADMIN',
        organisationId: 'org01',
        targetType: 'USER',
        targetId: 'targetuser01',
        actionType: 'UPDATED',
        outcome: 'SUCCESS',
        oldValues: { password: '[REDACTED]', firstName: 'Old' },
        newValues: {
          password: '[REDACTED]',
          nested: { refreshToken: '[REDACTED]' },
          firstName: 'New',
        },
        metadata: { reason: 'profile_update', secretKey: '[REDACTED]' },
        ipAddress: null,
        userAgent: null,
      },
    });
  });

  it('uses the transaction client if provided', async () => {
    const transactionClientMock = {
      auditLogEntry: {
        create: vi.fn().mockResolvedValue({
          id: 'auditlog02',
        }),
      },
    };

    await recordAuditLog(
      baseAuditInput,
      transactionClientMock as unknown as Prisma.TransactionClient,
    );

    expect(transactionClientMock.auditLogEntry.create).toHaveBeenCalledTimes(1);
    expect(transactionClientMock.auditLogEntry.create).toHaveBeenCalledWith({
      data: {
        actorUserId: 'user01',
        actorType: 'IP_ADMIN',
        organisationId: 'org01',
        targetType: 'USER',
        targetId: 'targetuser01',
        actionType: 'UPDATED',
        outcome: 'SUCCESS',
        oldValues: undefined,
        newValues: undefined,
        metadata: undefined,
        ipAddress: null,
        userAgent: null,
      },
    });

    expect(prismaMock.auditLogEntry.create).not.toHaveBeenCalled();
  });
});

describe('sanitiseValues', () => {
  it('returns undefined for null or undefined input', () => {
    expect(sanitiseValues(null)).toBeUndefined();
    expect(sanitiseValues(undefined)).toBeUndefined();
  });

  it('redacts sensitive keys recusivel in objects and in arrays', () => {
    expect(
      sanitiseValues({
        email: 'user@example.com',
        password: 'secret123',
        nested: {
          token: 'secret-token',
          safe: 'value',
        },
        array: [{ refreshToken: 'secret-refresh-token', safe: 'value' }, { safe: 'value' }],
      }),
    ).toEqual({
      email: 'user@example.com',
      password: '[REDACTED]',
      nested: {
        token: '[REDACTED]',
        safe: 'value',
      },
      array: [{ refreshToken: '[REDACTED]', safe: 'value' }, { safe: 'value' }],
    });
  });
});

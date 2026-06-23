import { describe, expect, it } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { recordAuditLog } from '../../src/services/audit-log.service.js';
import { recordAuditFailure } from '../../src/services/audit-log.service.js';
import { createOrganisation, createTrainee } from '../helpers/factories.js';

describe('Audit log integration tests', () => {
  it('creates a success audit log entry with organisation scope', async () => {
    const organisation = await createOrganisation();
    const trainee = await createTrainee({
      organisationProfile: { organisationId: organisation.id },
    });

    const auditEntry = await recordAuditLog({
      actorUserId: trainee.user.id,
      actorType: 'ORGANISATION_TRAINEE',
      organisationId: organisation.id,
      targetType: 'USER',
      targetId: trainee.user.id,
      actionType: 'UPDATED',
      oldValues: { firstName: 'Old' },
      newValues: { firstName: 'New' },
      metadata: { reason: 'profile_update' },
      ipAddress: '127.0.0.1',
      userAgent: 'Test',
    });

    const persistedEntry = await prisma.auditLogEntry.findUnique({ where: { id: auditEntry.id } });

    expect(persistedEntry).not.toBeNull();
    expect(persistedEntry).toMatchObject({
      actorUserId: trainee.user.id,
      actorType: 'ORGANISATION_TRAINEE',
      organisationId: organisation.id,
      targetType: 'USER',
      targetId: trainee.user.id,
      actionType: 'UPDATED',
      outcome: 'SUCCESS',
      oldValues: { firstName: 'Old' },
      newValues: { firstName: 'New' },
      metadata: { reason: 'profile_update' },
      ipAddress: '127.0.0.1',
      userAgent: 'Test',
    });
    expect(persistedEntry!.oldValues).toEqual({ firstName: 'Old' });
    expect(persistedEntry!.newValues).toEqual({ firstName: 'New' });
    expect(persistedEntry!.metadata).toEqual({ reason: 'profile_update' });
    expect(persistedEntry!.createdAt).toBeInstanceOf(Date);
  });

  it('creates a success audit log entry without organisation scope', async () => {
    const organisation = await createOrganisation();
    const trainee = await createTrainee({
      organisationProfile: { organisationId: organisation.id },
    });

    const auditEntry = await recordAuditLog({
      actorUserId: trainee.user.id,
      actorType: 'GENERAL_TRAINEE',
      targetType: 'USER',
      targetId: trainee.user.id,
      actionType: 'LOGIN',
      metadata: { flow_tag: 'general_login' },
    });

    const persistedEntry = await prisma.auditLogEntry.findUnique({ where: { id: auditEntry.id } });

    expect(persistedEntry).not.toBeNull();
    expect(persistedEntry).toMatchObject({
      actorUserId: trainee.user.id,
      actorType: 'GENERAL_TRAINEE',
      organisationId: null,
      targetType: 'USER',
      targetId: trainee.user.id,
      actionType: 'LOGIN',
      outcome: 'SUCCESS',
      metadata: { flow_tag: 'general_login' },
      ipAddress: null,
      userAgent: null,
    });
    expect(persistedEntry!.metadata).toEqual({ flow_tag: 'general_login' });
    expect(persistedEntry!.createdAt).toBeInstanceOf(Date);
  });

  it('creates a system failure audit entry without actor user or organisation', async () => {
    const auditEntry = await recordAuditFailure({
      actorType: 'SYSTEM',
      targetType: 'OTHER',
      actionType: 'LOGIN',
      metadata: { reason: 'unknown_user' },
    });

    const persistedEntry = await prisma.auditLogEntry.findUnique({ where: { id: auditEntry.id } });

    expect(persistedEntry).not.toBeNull();
    expect(persistedEntry).toMatchObject({
      actorUserId: null,
      actorType: 'SYSTEM',
      organisationId: null,
      targetType: 'OTHER',
      targetId: null,
      actionType: 'LOGIN',
      outcome: 'FAILURE',
      metadata: { reason: 'unknown_user' },
      ipAddress: null,
      userAgent: null,
    });
    expect(persistedEntry!.metadata).toEqual({ reason: 'unknown_user' });
    expect(persistedEntry!.createdAt).toBeInstanceOf(Date);
  });

  it('persists audit log entries created inside a prisma transaction', async () => {
    const organisation = await createOrganisation();
    const trainee = await createTrainee({
      organisationProfile: { organisationId: organisation.id },
    });

    const auditEntryId = await prisma.$transaction(async (tx) => {
      const entry = await recordAuditLog(
        {
          actorUserId: trainee.user.id,
          actorType: 'ORGANISATION_TRAINEE',
          organisationId: organisation.id,
          targetType: 'ORGANISATION',
          targetId: organisation.id,
          actionType: 'SETTINGS_CHANGED',
          metadata: { transaction: true, setting_changed: 'example_setting' },
        },
        tx,
      );

      return entry.id;
    });

    const persistedEntry = await prisma.auditLogEntry.findUnique({ where: { id: auditEntryId } });

    expect(persistedEntry).not.toBeNull();
    expect(persistedEntry).toMatchObject({
      actorUserId: trainee.user.id,
      actorType: 'ORGANISATION_TRAINEE',
      organisationId: organisation.id,
      targetType: 'ORGANISATION',
      targetId: organisation.id,
      actionType: 'SETTINGS_CHANGED',
      outcome: 'SUCCESS',
      metadata: { transaction: true, setting_changed: 'example_setting' },
      ipAddress: null,
      userAgent: null,
    });
    expect(persistedEntry!.metadata).toEqual({
      transaction: true,
      setting_changed: 'example_setting',
    });
    expect(persistedEntry!.createdAt).toBeInstanceOf(Date);
  });

  it('redacts sensitive values in oldValues and newValues and metadata', async () => {
    const trainee = await createTrainee();

    const auditEntry = await recordAuditLog({
      actorUserId: trainee.user.id,
      actorType: 'GENERAL_TRAINEE',
      targetType: 'USER',
      targetId: trainee.user.id,
      actionType: 'UPDATED',
      oldValues: { password: 'oldpassword', firstName: 'Old' },
      newValues: {
        password: 'newpassword',
        firstName: 'New',
        nested: { secret: 'this is a secret' },
      },
      metadata: { reason: 'profile_update', secretNote: 'this is a secret' },
    });

    const persistedEntry = await prisma.auditLogEntry.findUnique({ where: { id: auditEntry.id } });

    expect(persistedEntry).not.toBeNull();
    expect(persistedEntry).toMatchObject({
      actorUserId: trainee.user.id,
      actorType: 'GENERAL_TRAINEE',
      organisationId: null,
      targetType: 'USER',
      targetId: trainee.user.id,
      actionType: 'UPDATED',
      outcome: 'SUCCESS',
      oldValues: { password: '[REDACTED]', firstName: 'Old' },
      newValues: { password: '[REDACTED]', firstName: 'New', nested: { secret: '[REDACTED]' } },
      metadata: { reason: 'profile_update', secretNote: '[REDACTED]' },
      ipAddress: null,
      userAgent: null,
    });
    expect(persistedEntry!.oldValues).toEqual({ password: '[REDACTED]', firstName: 'Old' });
    expect(persistedEntry!.newValues).toEqual({
      password: '[REDACTED]',
      firstName: 'New',
      nested: { secret: '[REDACTED]' },
    });
    expect(persistedEntry!.metadata).toEqual({
      reason: 'profile_update',
      secretNote: '[REDACTED]',
    });
    expect(persistedEntry!.createdAt).toBeInstanceOf(Date);
  });
});

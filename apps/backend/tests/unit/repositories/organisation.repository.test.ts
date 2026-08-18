import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  findOrganisationById,
  findOrganisationWithCount,
  findRegistrationRequestByOrganisationId,
  findRegistrationRequestById,
  findOrganisationAdmins,
  findSetupInvitationAndEmailLog,
  findLatestEmailLogForInvitation,
  findAuditLogsForTimeline,
  findEmailLogsForTimeline,
  findUserForSetupValidation,
  claimInvitationForResend,
  revokeActiveActionTokensForInvitation,
  markActionTokenRevoked,
  runInTransaction,
} from '../../../src/repositories/organisation.repository.js';

const prismaMock = vi.hoisted(() => ({
  organisation: {
    findUnique: vi.fn(),
  },
  organisationRegistrationRequest: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
  organisationAdminProfile: {
    findMany: vi.fn(),
  },
  invitation: {
    findFirst: vi.fn(),
    updateMany: vi.fn(),
  },
  emailDeliveryLog: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  auditLogEntry: {
    findMany: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  actionToken: {
    updateMany: vi.fn(),
  },
  $transaction: vi.fn((callback: (tx: typeof prismaMock) => unknown) => callback(prismaMock)),
}));

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

describe('organisation repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('finds organisation by id', async () => {
    prismaMock.organisation.findUnique.mockResolvedValue({ id: 'org-1' });

    const result = await findOrganisationById('org-1');

    expect(prismaMock.organisation.findUnique).toHaveBeenCalledWith({
      where: { id: 'org-1' },
    });
    expect(result).toEqual({ id: 'org-1' });
  });

  it('finds organisation with counts', async () => {
    prismaMock.organisation.findUnique.mockResolvedValue({
      id: 'org-1',
      _count: { adminProfiles: 2, traineeProfiles: 15 },
    });

    const result = await findOrganisationWithCount('org-1');

    expect(prismaMock.organisation.findUnique).toHaveBeenCalledWith({
      where: { id: 'org-1' },
      include: {
        _count: {
          select: {
            adminProfiles: true,
            traineeProfiles: true,
          },
        },
      },
    });
    expect(result).toEqual({
      id: 'org-1',
      _count: { adminProfiles: 2, traineeProfiles: 15 },
    });
  });

  it('finds registration request by approved organisation id', async () => {
    prismaMock.organisationRegistrationRequest.findFirst.mockResolvedValue({ id: 'req-1' });

    const result = await findRegistrationRequestByOrganisationId('org-1');

    expect(prismaMock.organisationRegistrationRequest.findFirst).toHaveBeenCalledWith({
      where: { approvedOrganisationId: 'org-1' },
    });
    expect(result).toEqual({ id: 'req-1' });
  });

  it('finds registration request by request id', async () => {
    prismaMock.organisationRegistrationRequest.findUnique.mockResolvedValue({ id: 'req-1' });

    const result = await findRegistrationRequestById('req-1');

    expect(prismaMock.organisationRegistrationRequest.findUnique).toHaveBeenCalledWith({
      where: { id: 'req-1' },
    });
    expect(result).toEqual({ id: 'req-1' });
  });

  it('finds organisation admins with user details', async () => {
    prismaMock.organisationAdminProfile.findMany.mockResolvedValue([]);

    await findOrganisationAdmins('org-1');

    expect(prismaMock.organisationAdminProfile.findMany).toHaveBeenCalledWith({
      where: { organisationId: 'org-1' },
      select: {
        id: true,
        adminStatus: true,
        isInitialAdmin: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  });

  it('finds setup invitation scoped by organisation id or registration request id', async () => {
    prismaMock.invitation.findFirst.mockResolvedValue({ id: 'invite-1' });

    await findSetupInvitationAndEmailLog({ organisationId: 'org-1' });
    expect(prismaMock.invitation.findFirst).toHaveBeenCalledWith({
      where: { organisationId: 'org-1', purpose: 'INITIAL_ORGANISATION_ADMIN_SETUP' },
      include: {
        actionTokens: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        },
      },
    });

    await findSetupInvitationAndEmailLog({ organisationRegistrationRequestId: 'req-1' });
    expect(prismaMock.invitation.findFirst).toHaveBeenCalledWith({
      where: {
        organisationRegistrationRequestId: 'req-1',
        purpose: 'INITIAL_ORGANISATION_ADMIN_SETUP',
      },
      include: {
        actionTokens: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        },
      },
    });
  });

  it('finds latest email log for invitation', async () => {
    prismaMock.emailDeliveryLog.findFirst.mockResolvedValue({ id: 'log-1' });

    const result = await findLatestEmailLogForInvitation('invite-1');

    expect(prismaMock.emailDeliveryLog.findFirst).toHaveBeenCalledWith({
      where: {
        invitationId: 'invite-1',
        emailType: 'INITIAL_ORGANISATION_ADMIN_SETUP',
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    expect(result).toEqual({ id: 'log-1' });
  });

  it('scopes onboarding timeline audit logs to authoritative targets', async () => {
    prismaMock.auditLogEntry.findMany.mockResolvedValue([]);

    await findAuditLogsForTimeline({
      organisationId: 'org-1',
      requestId: 'request-1',
      invitationId: 'initial-admin-invitation-1',
    });

    expect(prismaMock.auditLogEntry.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          {
            organisationId: 'org-1',
            targetType: 'ORGANISATION',
            targetId: 'org-1',
            actionType: { in: ['CREATED', 'ENABLED', 'SUSPENDED', 'REACTIVATED'] },
          },
          {
            targetType: 'ORGANISATION_REGISTRATION_REQUEST',
            targetId: 'request-1',
            actionType: { in: ['CREATED', 'CONTACTED', 'APPROVED', 'REJECTED'] },
          },
          {
            targetType: 'INVITATION',
            targetId: 'initial-admin-invitation-1',
            actionType: { in: ['CREATED', 'RESENT', 'ACCEPTED', 'COMPLETED'] },
          },
        ],
      },
      include: {
        actorUser: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 50,
    });
  });

  it('returns empty array when finding audit logs with no criteria', async () => {
    const result = await findAuditLogsForTimeline({
      organisationId: null,
      requestId: null,
      invitationId: null,
    });

    expect(result).toEqual([]);
    expect(prismaMock.auditLogEntry.findMany).not.toHaveBeenCalled();
  });

  it('finds email logs for timeline scoped to invitation', async () => {
    prismaMock.emailDeliveryLog.findMany.mockResolvedValue([]);

    await findEmailLogsForTimeline('invite-1');

    expect(prismaMock.emailDeliveryLog.findMany).toHaveBeenCalledWith({
      where: {
        invitationId: 'invite-1',
        emailType: 'INITIAL_ORGANISATION_ADMIN_SETUP',
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 50,
    });
  });

  it('returns empty array when finding email logs with null invitationId', async () => {
    const result = await findEmailLogsForTimeline(null);

    expect(result).toEqual([]);
    expect(prismaMock.emailDeliveryLog.findMany).not.toHaveBeenCalled();
  });

  it('finds user for setup validation with admin and trainee profiles', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1' });

    await findUserForSetupValidation('test@example.com');

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
      include: {
        organisationAdminProfile: true,
        traineeProfile: {
          include: {
            organisationTraineeProfile: true,
          },
        },
      },
    });
  });

  it('claims invitation for resend atomically', async () => {
    const updatedAt = new Date('2026-07-01T08:00:00Z');
    const expiresAt = new Date('2026-07-08T08:00:00Z');

    prismaMock.invitation.updateMany.mockResolvedValue({ count: 1 });

    const success = await claimInvitationForResend({
      id: 'invite-1',
      status: 'PENDING',
      updatedAt,
      expiresAt,
    });

    expect(prismaMock.invitation.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'invite-1',
        status: 'PENDING',
        updatedAt,
      },
      data: {
        status: 'PENDING',
        expiresAt,
      },
    });
    expect(success).toBe(true);

    prismaMock.invitation.updateMany.mockResolvedValue({ count: 0 });

    const failed = await claimInvitationForResend({
      id: 'invite-1',
      status: 'PENDING',
      updatedAt,
      expiresAt,
    });

    expect(failed).toBe(false);
  });

  it('revokes active action tokens for invitation', async () => {
    prismaMock.actionToken.updateMany.mockResolvedValue({ count: 1 });

    await revokeActiveActionTokensForInvitation('invite-1', 'SUPERSEDED_BY_RESEND');

    expect(prismaMock.actionToken.updateMany).toHaveBeenCalledWith({
      where: {
        invitationId: 'invite-1',
        usedAt: null,
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
        revokedReason: 'SUPERSEDED_BY_RESEND',
      },
    });
  });

  it('marks action token revoked for definite delivery failure', async () => {
    prismaMock.actionToken.updateMany.mockResolvedValue({ count: 1 });

    await markActionTokenRevoked('token-1', 'EMAIL_SEND_FAILED');

    expect(prismaMock.actionToken.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'token-1',
        usedAt: null,
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
        revokedReason: 'EMAIL_SEND_FAILED',
      },
    });
  });

  it('runs callback within transaction', async () => {
    const callback = vi.fn().mockResolvedValue('tx-result');

    const result = await runInTransaction(callback);

    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(callback).toHaveBeenCalled();
    expect(result).toBe('tx-result');
  });
});

import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  findOrganisationTrainees,
  findOrganisationTraineeInvitations,
  findOrganisationTraineeByEmail,
  findPendingTraineeInvitationByEmail,
  findOrganisationTraineeById,
  disableOrganisationTraineeProfile,
  findAuthoritativeInvitationById,
  findAuthoritativeResentInvitation,
  createOrganisationTraineeInvitationTx,
  resendOrganisationTraineeInvitationTx,
  revokeOrganisationTraineeInvitationTx,
  disableOrganisationTraineeTx,
} from '../../../src/repositories/organisation-trainee.repository.js';
import { prisma } from '../../../src/lib/prisma.js';
import { recordAuditLog } from '../../../src/services/audit-log.service.js';
import { sendEmail } from '../../../src/services/email.service.js';
import { findInvitationById } from '../../../src/repositories/invitation.repository.js';
import { revokeUserAuthSessions } from '../../../src/repositories/auth-session.repository.js';

const txMock = {
  $executeRaw: vi.fn().mockResolvedValue(1),
  organisationTraineeProfile: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  invitation: {
    findFirst: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
  actionToken: {
    create: vi.fn(),
    updateMany: vi.fn(),
  },
};

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn(async (cb: (tx: typeof txMock) => unknown) => cb(txMock)),
    organisationTraineeProfile: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    invitation: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../../../src/services/audit-log.service.js', () => ({
  recordAuditLog: vi.fn(),
}));

vi.mock('../../../src/services/email.service.js', () => ({
  sendEmail: vi.fn(),
}));

vi.mock('../../../src/repositories/invitation.repository.js', () => ({
  findInvitationById: vi.fn(),
}));

vi.mock('../../../src/repositories/auth-session.repository.js', () => ({
  revokeUserAuthSessions: vi.fn(),
}));

describe('organisation-trainee.repository unit tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findOrganisationTrainees', () => {
    it('calls findMany with organisationId and order', async () => {
      vi.mocked(prisma.organisationTraineeProfile.findMany).mockResolvedValue([
        { id: 'tr-1' },
      ] as never);
      const res = await findOrganisationTrainees('org-1');
      expect(prisma.organisationTraineeProfile.findMany).toHaveBeenCalledWith({
        where: {
          organisationId: 'org-1',
          membershipStatus: {
            in: ['ACTIVE', 'DISABLED'],
          },
        },
        include: { traineeProfile: { include: { user: true } } },
        orderBy: { createdAt: 'desc' },
      });
      expect(res).toEqual([{ id: 'tr-1' }]);
    });
  });

  describe('findOrganisationTraineeInvitations', () => {
    it('calls findMany with purpose filter', async () => {
      vi.mocked(prisma.invitation.findMany).mockResolvedValue([{ id: 'inv-1' }] as never);
      const res = await findOrganisationTraineeInvitations('org-1');
      expect(prisma.invitation.findMany).toHaveBeenCalledWith({
        where: { organisationId: 'org-1', purpose: 'ORGANISATION_TRAINEE_INVITE' },
        include: {
          emailDeliveryLogs: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(res).toEqual([{ id: 'inv-1' }]);
    });
  });

  describe('findOrganisationTraineeByEmail', () => {
    it('normalises email and finds trainee', async () => {
      vi.mocked(prisma.organisationTraineeProfile.findFirst).mockResolvedValue({
        id: 'tr-1',
      } as never);
      const res = await findOrganisationTraineeByEmail('org-1', '  Test@Example.COM  ');
      expect(prisma.organisationTraineeProfile.findFirst).toHaveBeenCalledWith({
        where: {
          organisationId: 'org-1',
          traineeProfile: { user: { email: 'test@example.com' } },
        },
        include: { traineeProfile: { include: { user: true } } },
      });
      expect(res).toEqual({ id: 'tr-1' });
    });
  });

  describe('findPendingTraineeInvitationByEmail', () => {
    it('normalises email and checks pending status', async () => {
      vi.mocked(prisma.invitation.findFirst).mockResolvedValue({ id: 'inv-1' } as never);
      const res = await findPendingTraineeInvitationByEmail('org-1', '  User@Example.COM  ');
      expect(prisma.invitation.findFirst).toHaveBeenCalledWith({
        where: {
          organisationId: 'org-1',
          purpose: 'ORGANISATION_TRAINEE_INVITE',
          recipientEmail: 'user@example.com',
          status: { in: ['PENDING', 'SENT', 'FAILED_TO_SEND'] },
        },
      });
      expect(res).toEqual({ id: 'inv-1' });
    });
  });

  describe('findOrganisationTraineeById', () => {
    it('calls findFirst matching OR conditions', async () => {
      vi.mocked(prisma.organisationTraineeProfile.findFirst).mockResolvedValue({
        id: 'tr-1',
      } as never);
      const res = await findOrganisationTraineeById('org-1', 'trainee-x');
      expect(prisma.organisationTraineeProfile.findFirst).toHaveBeenCalledWith({
        where: {
          organisationId: 'org-1',
          OR: [
            { id: 'trainee-x' },
            { traineeProfileId: 'trainee-x' },
            { traineeProfile: { userId: 'trainee-x' } },
          ],
        },
        include: { traineeProfile: { include: { user: true } } },
      });
      expect(res).toEqual({ id: 'tr-1' });
    });
  });

  describe('disableOrganisationTraineeProfile', () => {
    it('updates status and default disabledReason', async () => {
      vi.mocked(prisma.organisationTraineeProfile.update).mockResolvedValue({
        id: 'tr-1',
        membershipStatus: 'DISABLED',
      } as never);
      const res = await disableOrganisationTraineeProfile('tr-1');
      expect(prisma.organisationTraineeProfile.update).toHaveBeenCalledWith({
        where: { id: 'tr-1' },
        data: {
          membershipStatus: 'DISABLED',
          disabledAt: expect.any(Date),
          disabledReason: 'Disabled by organisation admin',
        },
      });
      expect(res).toEqual({ id: 'tr-1', membershipStatus: 'DISABLED' });
    });

    it('updates status with custom reason', async () => {
      vi.mocked(prisma.organisationTraineeProfile.update).mockResolvedValue({
        id: 'tr-1',
        membershipStatus: 'DISABLED',
      } as never);
      await disableOrganisationTraineeProfile('tr-1', 'Employee departed');
      expect(prisma.organisationTraineeProfile.update).toHaveBeenCalledWith({
        where: { id: 'tr-1' },
        data: {
          membershipStatus: 'DISABLED',
          disabledAt: expect.any(Date),
          disabledReason: 'Employee departed',
        },
      });
    });
  });

  describe('findAuthoritativeInvitationById', () => {
    it('fetches invitation by id', async () => {
      vi.mocked(prisma.invitation.findUnique).mockResolvedValue({ id: 'inv-1' } as never);
      const res = await findAuthoritativeInvitationById('inv-1');
      expect(prisma.invitation.findUnique).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
      });
      expect(res).toEqual({ id: 'inv-1' });
    });
  });

  describe('findAuthoritativeResentInvitation', () => {
    it('fetches invitation with actionToken filter', async () => {
      vi.mocked(prisma.invitation.findUnique).mockResolvedValue({ id: 'inv-1' } as never);
      const res = await findAuthoritativeResentInvitation('inv-1', 'token-1');
      expect(prisma.invitation.findUnique).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        include: {
          actionTokens: {
            where: { id: 'token-1' },
          },
        },
      });
      expect(res).toEqual({ id: 'inv-1' });
    });
  });

  describe('createOrganisationTraineeInvitationTx', () => {
    const input = {
      actorUserId: 'admin-1',
      organisationId: 'org-1',
      recipientEmail: 'trainee@example.com',
      recipientFirstName: 'Alex',
      recipientLastName: 'Trainee',
      organisationName: 'Acme Corp',
      requiresAccountConflictResolution: false,
      expiresAt: new Date('2026-07-22T08:00:00.000Z'),
      rawToken: 'raw-token',
      tokenHash: 'token-hash',
    };

    it('creates invitation, action token, audit log, and email inside transaction', async () => {
      txMock.organisationTraineeProfile.findFirst.mockResolvedValue(null);
      txMock.invitation.findFirst.mockResolvedValue(null);
      txMock.invitation.create.mockResolvedValue({ id: 'inv-1' });
      txMock.actionToken.create.mockResolvedValue({ id: 'token-1' });
      vi.mocked(sendEmail).mockResolvedValue({ status: 'QUEUED' } as never);

      const result = await createOrganisationTraineeInvitationTx(input);

      expect(txMock.$executeRaw).toHaveBeenCalled();
      expect(txMock.invitation.create).toHaveBeenCalledWith({
        data: {
          organisationId: 'org-1',
          recipientEmail: 'trainee@example.com',
          recipientFirstName: 'Alex',
          recipientLastName: 'Trainee',
          purpose: 'ORGANISATION_TRAINEE_INVITE',
          status: 'PENDING',
          expiresAt: input.expiresAt,
        },
      });
      expect(txMock.actionToken.create).toHaveBeenCalledWith({
        data: {
          tokenHash: 'token-hash',
          purpose: 'ORGANISATION_TRAINEE_INVITE',
          invitationId: 'inv-1',
          expiresAt: input.expiresAt,
        },
      });
      expect(recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'INVITED',
          actorUserId: 'admin-1',
          targetId: 'inv-1',
        }),
        txMock,
      );
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          emailType: 'ORGANISATION_TRAINEE_INVITE',
          recipientEmail: 'trainee@example.com',
        }),
        txMock,
      );
      expect(result).toEqual({
        invitation: { id: 'inv-1' },
        actionToken: { id: 'token-1' },
        emailResult: { status: 'QUEUED' },
      });
    });

    it('throws 409 conflict when user is already active trainee in transaction', async () => {
      txMock.organisationTraineeProfile.findFirst.mockResolvedValue({
        id: 'tr-1',
        membershipStatus: 'ACTIVE',
        disabledAt: null,
      });

      await expect(createOrganisationTraineeInvitationTx(input)).rejects.toMatchObject({
        statusCode: 409,
        errorKey: 'CANNOT_INVITE_USER',
      });
    });

    it('throws 409 conflict when pending invitation already exists in transaction', async () => {
      txMock.organisationTraineeProfile.findFirst.mockResolvedValue(null);
      txMock.invitation.findFirst.mockResolvedValue({ id: 'inv-existing' });

      await expect(createOrganisationTraineeInvitationTx(input)).rejects.toMatchObject({
        statusCode: 409,
        errorKey: 'CANNOT_INVITE_USER',
      });
    });

    it('throws 503 EMAIL_QUEUE_FAILED when email sending is not queued', async () => {
      txMock.organisationTraineeProfile.findFirst.mockResolvedValue(null);
      txMock.invitation.findFirst.mockResolvedValue(null);
      txMock.invitation.create.mockResolvedValue({ id: 'inv-1' });
      txMock.actionToken.create.mockResolvedValue({ id: 'token-1' });
      vi.mocked(sendEmail).mockResolvedValue({ status: 'NOT_QUEUED' } as never);

      await expect(createOrganisationTraineeInvitationTx(input)).rejects.toMatchObject({
        statusCode: 503,
        errorKey: 'EMAIL_QUEUE_FAILED',
      });
    });
  });

  describe('resendOrganisationTraineeInvitationTx', () => {
    const input = {
      actorUserId: 'admin-1',
      invitationId: 'inv-1',
      organisationId: 'org-1',
      recipientEmail: 'trainee@example.com',
      recipientFirstName: 'Alex',
      organisationName: 'Acme Corp',
      observedUpdatedAt: new Date('2026-07-15T08:00:00.000Z'),
      requiresAccountConflictResolution: false,
      expiresAt: new Date('2026-07-22T08:00:00.000Z'),
      rawToken: 'raw-token',
      tokenHash: 'token-hash',
    };

    it('rotates action tokens, logs audit, and sends email within transaction', async () => {
      txMock.invitation.updateMany.mockResolvedValue({ count: 1 });
      txMock.actionToken.updateMany.mockResolvedValue({ count: 1 });
      txMock.actionToken.create.mockResolvedValue({ id: 'new-token' });
      vi.mocked(sendEmail).mockResolvedValue({ status: 'QUEUED' } as never);

      const result = await resendOrganisationTraineeInvitationTx(input);

      expect(txMock.invitation.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'inv-1',
          status: { in: ['PENDING', 'SENT', 'FAILED_TO_SEND'] },
          updatedAt: input.observedUpdatedAt,
        },
        data: {
          status: 'PENDING',
          expiresAt: input.expiresAt,
          updatedAt: expect.any(Date),
        },
      });
      expect(txMock.actionToken.updateMany).toHaveBeenCalledWith({
        where: {
          invitationId: 'inv-1',
          revokedAt: null,
          usedAt: null,
        },
        data: {
          revokedAt: expect.any(Date),
        },
      });
      expect(recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: 'RESENT', targetId: 'inv-1' }),
        txMock,
      );
      expect(result).toEqual({
        actionToken: { id: 'new-token' },
        claimedAt: expect.any(Date),
        emailResult: { status: 'QUEUED' },
      });
    });

    it('throws 409 INVITATION_NOT_RESENDABLE on concurrent update conflict', async () => {
      txMock.invitation.updateMany.mockResolvedValue({ count: 0 });

      await expect(resendOrganisationTraineeInvitationTx(input)).rejects.toMatchObject({
        statusCode: 409,
        errorKey: 'INVITATION_NOT_RESENDABLE',
      });
    });

    it('throws 503 EMAIL_QUEUE_FAILED when email fails to queue', async () => {
      txMock.invitation.updateMany.mockResolvedValue({ count: 1 });
      txMock.actionToken.updateMany.mockResolvedValue({ count: 1 });
      txMock.actionToken.create.mockResolvedValue({ id: 'new-token' });
      vi.mocked(sendEmail).mockResolvedValue({ status: 'NOT_QUEUED' } as never);

      await expect(resendOrganisationTraineeInvitationTx(input)).rejects.toMatchObject({
        statusCode: 503,
        errorKey: 'EMAIL_QUEUE_FAILED',
      });
    });
  });

  describe('revokeOrganisationTraineeInvitationTx', () => {
    const input = {
      actorUserId: 'admin-1',
      organisationId: 'org-1',
      invitationId: 'inv-1',
    };

    it('updates invitation status to REVOKED, revokes tokens, and records audit log', async () => {
      txMock.invitation.updateMany.mockResolvedValue({ count: 1 });
      txMock.actionToken.updateMany.mockResolvedValue({ count: 1 });

      const result = await revokeOrganisationTraineeInvitationTx(input);

      expect(txMock.invitation.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'inv-1',
          status: { in: ['PENDING', 'SENT', 'FAILED_TO_SEND'] },
        },
        data: {
          status: 'REVOKED',
        },
      });
      expect(txMock.actionToken.updateMany).toHaveBeenCalledWith({
        where: {
          invitationId: 'inv-1',
          revokedAt: null,
          usedAt: null,
        },
        data: {
          revokedAt: expect.any(Date),
        },
      });
      expect(recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: 'REVOKED', targetId: 'inv-1' }),
        txMock,
      );
      expect(result).toEqual({
        alreadyRevoked: false,
        invitationId: 'inv-1',
        revokedAt: expect.any(String),
      });
    });

    it('returns alreadyRevoked true when invitation was concurrently revoked', async () => {
      txMock.invitation.updateMany.mockResolvedValue({ count: 0 });
      vi.mocked(findInvitationById).mockResolvedValue({
        id: 'inv-1',
        status: 'REVOKED',
        updatedAt: new Date('2026-07-15T08:00:00.000Z'),
      } as never);

      const result = await revokeOrganisationTraineeInvitationTx(input);

      expect(result).toEqual({
        alreadyRevoked: true,
        invitationId: 'inv-1',
        revokedAt: '2026-07-15T08:00:00.000Z',
      });
    });

    it('throws 409 INVITATION_ALREADY_ACCEPTED when invitation was accepted or mutated', async () => {
      txMock.invitation.updateMany.mockResolvedValue({ count: 0 });
      vi.mocked(findInvitationById).mockResolvedValue({
        id: 'inv-1',
        status: 'ACCEPTED',
      } as never);

      await expect(revokeOrganisationTraineeInvitationTx(input)).rejects.toMatchObject({
        statusCode: 409,
        errorKey: 'INVITATION_ALREADY_ACCEPTED',
      });
    });
  });

  describe('disableOrganisationTraineeTx', () => {
    const input = {
      actorUserId: 'admin-1',
      organisationId: 'org-1',
      traineeId: 'trainee-1',
      disabledReason: 'Departed',
    };

    it('disables profile, revokes auth sessions, and records audit log', async () => {
      const mockTrainee = {
        id: 'trainee-1',
        traineeProfileId: 'tp-1',
        membershipStatus: 'ACTIVE',
        disabledAt: null,
        traineeProfile: { userId: 'user-1' },
      };
      txMock.organisationTraineeProfile.findFirst.mockResolvedValue(mockTrainee);
      txMock.organisationTraineeProfile.update.mockResolvedValue({
        ...mockTrainee,
        membershipStatus: 'DISABLED',
      });

      const result = await disableOrganisationTraineeTx(input);

      expect(txMock.organisationTraineeProfile.update).toHaveBeenCalledWith({
        where: { id: 'trainee-1' },
        data: {
          membershipStatus: 'DISABLED',
          disabledAt: expect.any(Date),
          disabledReason: 'Departed',
        },
      });
      expect(revokeUserAuthSessions).toHaveBeenCalledWith(
        { userId: 'user-1', revokedReason: 'ADMIN_DISABLED' },
        txMock,
      );
      expect(recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'DISABLED',
          outcome: 'SUCCESS',
          targetId: 'user-1',
        }),
        txMock,
      );
      expect(result).toEqual({
        txTrainee: mockTrainee,
        disabledReason: 'Departed',
      });
    });

    it('throws 404 TRAINEE_NOT_FOUND when trainee profile does not exist', async () => {
      txMock.organisationTraineeProfile.findFirst.mockResolvedValue(null);

      await expect(disableOrganisationTraineeTx(input)).rejects.toMatchObject({
        statusCode: 404,
        errorKey: 'TRAINEE_NOT_FOUND',
      });
    });

    it('throws 409 TRAINEE_ALREADY_DISABLED when trainee is already disabled', async () => {
      txMock.organisationTraineeProfile.findFirst.mockResolvedValue({
        id: 'trainee-1',
        membershipStatus: 'DISABLED',
        disabledAt: new Date(),
        traineeProfile: { userId: 'user-1' },
      });

      await expect(disableOrganisationTraineeTx(input)).rejects.toMatchObject({
        statusCode: 409,
        errorKey: 'TRAINEE_ALREADY_DISABLED',
      });
    });
  });
});

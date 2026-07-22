import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findAuditLogsForTimeline } from '../../../src/repositories/organisation.repository.js';

const prismaMock = vi.hoisted(() => ({
  auditLogEntry: {
    findMany: vi.fn(),
  },
}));

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

describe('organisation repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});

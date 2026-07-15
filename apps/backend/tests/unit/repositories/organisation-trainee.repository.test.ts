import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  findOrganisationTrainees,
  findOrganisationTraineeInvitations,
  findOrganisationTraineeByEmail,
  findPendingTraineeInvitationByEmail,
  findOrganisationTraineeById,
  disableOrganisationTraineeProfile,
} from '../../../src/repositories/organisation-trainee.repository.js';
import { prisma } from '../../../src/lib/prisma.js';

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    organisationTraineeProfile: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    invitation: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

describe('organisation-trainee.repository unit tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('findOrganisationTrainees calls findMany with organisationId and order', async () => {
    vi.mocked(prisma.organisationTraineeProfile.findMany).mockResolvedValue([
      { id: 'tr-1' },
    ] as any);
    const res = await findOrganisationTrainees('org-1');
    expect(prisma.organisationTraineeProfile.findMany).toHaveBeenCalledWith({
      where: { organisationId: 'org-1' },
      include: { traineeProfile: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
    });
    expect(res).toEqual([{ id: 'tr-1' }]);
  });

  it('findOrganisationTraineeInvitations calls findMany with purpose filter', async () => {
    vi.mocked(prisma.invitation.findMany).mockResolvedValue([{ id: 'inv-1' }] as any);
    const res = await findOrganisationTraineeInvitations('org-1');
    expect(prisma.invitation.findMany).toHaveBeenCalledWith({
      where: { organisationId: 'org-1', purpose: 'ORGANISATION_TRAINEE_INVITE' },
      orderBy: { createdAt: 'desc' },
    });
    expect(res).toEqual([{ id: 'inv-1' }]);
  });

  it('findOrganisationTraineeByEmail normalises email and finds trainee', async () => {
    vi.mocked(prisma.organisationTraineeProfile.findFirst).mockResolvedValue({ id: 'tr-1' } as any);
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

  it('findPendingTraineeInvitationByEmail normalises email and checks pending status', async () => {
    vi.mocked(prisma.invitation.findFirst).mockResolvedValue({ id: 'inv-1' } as any);
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

  it('findOrganisationTraineeById calls findFirst matching OR conditions', async () => {
    vi.mocked(prisma.organisationTraineeProfile.findFirst).mockResolvedValue({ id: 'tr-1' } as any);
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

  it('disableOrganisationTraineeProfile updates status and default disabledReason', async () => {
    vi.mocked(prisma.organisationTraineeProfile.update).mockResolvedValue({
      id: 'tr-1',
      membershipStatus: 'DISABLED',
    } as any);
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

  it('disableOrganisationTraineeProfile updates status with custom reason', async () => {
    vi.mocked(prisma.organisationTraineeProfile.update).mockResolvedValue({
      id: 'tr-1',
      membershipStatus: 'DISABLED',
    } as any);
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

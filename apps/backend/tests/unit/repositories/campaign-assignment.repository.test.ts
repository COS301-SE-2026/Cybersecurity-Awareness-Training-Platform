import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeBulkCampaignAssignment } from '../../../src/repositories/campaign-assignment.repository.js';
import { prisma } from '../../../src/lib/prisma.js';

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    campaign: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    organisationTraineeProfile: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    campaignAssignment: {
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(prisma)),
  },
}));

describe('CampaignAssignmentRepository', () => {
  const organisationId = '11111111-1111-4111-8111-111111111111';
  const campaignId = '22222222-2222-4222-8222-222222222222';
  const traineeProfileId = '33333333-3333-4333-8333-333333333333';
  const actorUserId = '44444444-4444-4444-8444-444444444444';

  beforeEach(() => {
    vi.resetAllMocks();
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((cb) => cb(prisma));
  });

  describe('executeBulkCampaignAssignment', () => {
    it('creates missing assignments when target campaign and trainee are active', async () => {
      (prisma.campaignAssignment.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]); // no existing assignments
      (prisma.campaign.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        {
          id: campaignId,
          organisationId,
          status: 'ACTIVE',
          campaignType: 'ORGANISATION_CUSTOM',
        },
      ]);
      (prisma.organisationTraineeProfile.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        {
          traineeProfileId,
          membershipStatus: 'ACTIVE',
          traineeProfile: {
            traineeStatus: 'ACTIVE',
            user: { userType: 'ORGANISATION_TRAINEE', authStatus: 'ACTIVE' },
          },
        },
      ]);
      (prisma.campaignAssignment.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'assign-1',
        campaignId,
        traineeProfileId,
      });

      const result = await executeBulkCampaignAssignment({
        organisationId,
        campaignIds: [campaignId],
        traineeProfileIds: [traineeProfileId],
        actorUserId,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.created).toHaveLength(1);
        expect(result.alreadyAssigned).toHaveLength(0);
      }
    });

    it('returns alreadyAssigned when all pairs already exist even if campaign is PAUSED', async () => {
      (prisma.campaignAssignment.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        { id: 'assign-existing', campaignId, traineeProfileId },
      ]);

      const result = await executeBulkCampaignAssignment({
        organisationId,
        campaignIds: [campaignId],
        traineeProfileIds: [traineeProfileId],
        actorUserId,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.created).toHaveLength(0);
        expect(result.alreadyAssigned).toHaveLength(1);
      }
      expect(prisma.campaign.findMany).not.toHaveBeenCalled();
    });

    it('returns CAMPAIGN_INACTIVE when a new assignment is needed for a PAUSED campaign', async () => {
      (prisma.campaignAssignment.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]); // no existing assignments
      (prisma.campaign.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        {
          id: campaignId,
          organisationId,
          status: 'PAUSED',
          campaignType: 'ORGANISATION_CUSTOM',
        },
      ]);

      const result = await executeBulkCampaignAssignment({
        organisationId,
        campaignIds: [campaignId],
        traineeProfileIds: [traineeProfileId],
        actorUserId,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('CAMPAIGN_INACTIVE');
      }
    });
  });
});

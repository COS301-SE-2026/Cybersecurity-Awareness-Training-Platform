import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deleteCampaignAssignment,
  executeBulkCampaignAssignment,
} from '../../../src/repositories/campaign-assignment.repository.js';
import { prisma } from '../../../src/lib/prisma.js';

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    campaign: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    campaignItem: {
      findMany: vi.fn(),
    },
    organisationTraineeProfile: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    campaignAssignment: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
    },
    interactionEvent: {
      deleteMany: vi.fn(),
    },
    emailClassificationResponse: {
      deleteMany: vi.fn(),
    },
    quizAttempt: {
      deleteMany: vi.fn(),
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
      let createdData: Array<{ id: string; campaignId: string; traineeProfileId: string }> = [];

      (prisma.campaignAssignment.createMany as ReturnType<typeof vi.fn>).mockImplementation(
        async (args: {
          data: Array<{ id: string; campaignId: string; traineeProfileId: string }>;
        }) => {
          createdData = args.data;
          return { count: args.data.length };
        },
      );

      (prisma.campaignAssignment.findMany as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([]) // initial existing check
        .mockImplementationOnce(async () =>
          createdData.map((d) => ({
            id: d.id,
            campaignId: d.campaignId,
            traineeProfileId: d.traineeProfileId,
          })),
        ); // postwrite fetch

      (prisma.campaign.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        {
          id: campaignId,
          organisationId,
          status: 'ACTIVE',
          campaignType: 'ORGANISATION_CUSTOM',
        },
      ]);
      (
        prisma.organisationTraineeProfile.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce([
        {
          traineeProfileId,
          membershipStatus: 'ACTIVE',
          traineeProfile: {
            traineeStatus: 'ACTIVE',
            user: { userType: 'ORGANISATION_TRAINEE', authStatus: 'ACTIVE' },
          },
        },
      ]);

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
      const existingRow = { id: 'assign-existing', campaignId, traineeProfileId };
      (prisma.campaignAssignment.findMany as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([existingRow]) // initial existing check
        .mockResolvedValueOnce([existingRow]); // final read fetch

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

  describe('deleteCampaignAssignment', () => {
    const assignmentId = '55555555-5555-4555-8555-555555555555';

    it('returns ASSIGNMENT_NOT_FOUND if campaign assignment is not found', async () => {
      (prisma.campaignAssignment.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

      const result = await deleteCampaignAssignment({ organisationId, assignmentId });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('ASSIGNMENT_NOT_FOUND');
      }
    });

    it('deletes progress and assignment in dependency-safe order', async () => {
      (prisma.campaignAssignment.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: assignmentId,
        campaignId,
        traineeProfileId,
      });

      (prisma.campaignItem.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        { id: 'item-1' },
      ]);

      (prisma.interactionEvent.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        count: 4,
      });
      (
        prisma.emailClassificationResponse.deleteMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce({ count: 2 });
      (prisma.quizAttempt.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        count: 1,
      });
      (prisma.campaignAssignment.delete as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

      const result = await deleteCampaignAssignment({ organisationId, assignmentId });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.assignmentId).toBe(assignmentId);
        expect(result.deletedProgress).toEqual({
          quizAttempts: 1,
          emailClassificationResponses: 2,
          interactionEvents: 4,
        });
      }

      expect(prisma.campaignAssignment.delete).toHaveBeenCalledWith({
        where: { id: assignmentId },
      });
    });
  });
});

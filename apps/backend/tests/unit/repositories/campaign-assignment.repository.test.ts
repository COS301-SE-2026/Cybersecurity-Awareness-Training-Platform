import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deleteCampaignAssignment,
  enrolGeneralTraineeInPlatformCampaign,
  executeBulkCampaignAssignment,
  findActiveGeneralTraineeByUserId,
  findGeneralTraineeActorScope,
  findPlatformCampaignById,
  findPlatformCampaignsForDiscovery,
} from '../../../src/repositories/campaign-assignment.repository.js';
import { prisma } from '../../../src/lib/prisma.js';

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    traineeProfile: {
      findFirst: vi.fn(),
    },
    campaign: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
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
      findUnique: vi.fn(),
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
    auditLogEntry: {
      create: vi.fn(),
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

      const result = await deleteCampaignAssignment({ organisationId, assignmentId, actorUserId });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('ASSIGNMENT_NOT_FOUND');
      }
    });

    it('deletes progress, assignment, and writes audit record in single transaction', async () => {
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
      (prisma.auditLogEntry.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

      const result = await deleteCampaignAssignment({ organisationId, assignmentId, actorUserId });

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
      expect(prisma.auditLogEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorUserId,
            actionType: 'REVOKED',
            outcome: 'SUCCESS',
            organisationId,
            targetId: campaignId,
          }),
        }),
      );
    });

    it('rolls back whole transaction when audit log insertion fails', async () => {
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
      (prisma.auditLogEntry.create as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Database write failure on audit entry'),
      );

      await expect(
        deleteCampaignAssignment({ organisationId, assignmentId, actorUserId }),
      ).rejects.toThrow('Database write failure on audit entry');
    });
  });

  describe('General Trainee Platform Campaign Repository Methods', () => {
    const userId = '11111111-1111-4111-8111-111111111111';

    describe('findGeneralTraineeActorScope', () => {
      it('fetches user with trainee profile and general trainee profile', async () => {
        const expected = {
          id: userId,
          userType: 'GENERAL_TRAINEE',
          authStatus: 'ACTIVE',
          traineeProfile: {
            id: traineeProfileId,
            traineeStatus: 'ACTIVE',
            generalTraineeProfile: {
              id: 'gen-prof-id',
              accessSource: 'SELF_SIGNUP',
            },
          },
        };
        (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(expected);

        const result = await findGeneralTraineeActorScope(userId);
        expect(result).toEqual(expected);
        expect(prisma.user.findUnique).toHaveBeenCalledWith(
          expect.objectContaining({ where: { id: userId } }),
        );
      });
    });

    describe('findActiveGeneralTraineeByUserId', () => {
      it('queries active trainee profile with general trainee profile', async () => {
        const expected = {
          id: traineeProfileId,
          userId,
          traineeStatus: 'ACTIVE',
        };
        (prisma.traineeProfile.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
          expected,
        );

        const result = await findActiveGeneralTraineeByUserId(userId);
        expect(result).toEqual(expected);
        expect(prisma.traineeProfile.findFirst).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              userId,
              traineeStatus: 'ACTIVE',
              user: { userType: 'GENERAL_TRAINEE', authStatus: 'ACTIVE' },
              generalTraineeProfile: { isNot: null },
            }),
          }),
        );
      });
    });

    describe('findPlatformCampaignsForDiscovery', () => {
      it('queries active premade platform campaigns with bounded pagination', async () => {
        (prisma.campaign.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
          {
            id: campaignId,
            name: 'Platform Phishing',
            description: 'Basics',
            accentColor: '#10B981',
            campaignType: 'PREMADE_GENERAL',
            difficultyLevel: 'BEGINNER',
            status: 'ACTIVE',
            startDate: null,
            endDate: null,
            items: [{ id: 'item-1', availabilityStatus: 'AVAILABLE' }],
            assignments: [],
          },
        ]);
        (prisma.campaign.count as ReturnType<typeof vi.fn>).mockResolvedValueOnce(1);

        const result = await findPlatformCampaignsForDiscovery({
          page: 1,
          limit: 10,
          traineeProfileId,
          search: 'phishing',
        });

        expect(result.total).toBe(1);
        expect(result.items).toHaveLength(1);
        expect(result.items[0].id).toBe(campaignId);
        expect(result.items[0].assignment).toBeNull();
        expect(prisma.campaign.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              campaignType: 'PREMADE_GENERAL',
              organisationId: null,
              status: 'ACTIVE',
              name: { contains: 'phishing', mode: 'insensitive' },
            }),
            skip: 0,
            take: 10,
          }),
        );
      });
    });

    describe('findPlatformCampaignById', () => {
      it('queries platform campaign by id', async () => {
        (prisma.campaign.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          id: campaignId,
          name: 'Platform Campaign',
          campaignType: 'PREMADE_GENERAL',
          organisationId: null,
          status: 'ACTIVE',
        });

        const result = await findPlatformCampaignById(campaignId);
        expect(result).not.toBeNull();
        expect(result?.id).toBe(campaignId);
      });
    });

    describe('enrolGeneralTraineeInPlatformCampaign', () => {
      it('creates SELF_SELECTED assignment when trainee and platform campaign are valid', async () => {
        (prisma.traineeProfile.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          id: traineeProfileId,
        });
        (prisma.campaign.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          id: campaignId,
          name: 'Platform Campaign',
          description: null,
          accentColor: null,
          campaignType: 'PREMADE_GENERAL',
          difficultyLevel: 'BEGINNER',
          status: 'ACTIVE',
          startDate: null,
          endDate: null,
          items: [],
        });
        (prisma.campaignAssignment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
          null,
        );
        (prisma.campaignAssignment.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          id: 'new-assignment-id',
          campaignId,
          traineeProfileId,
          assignmentStatus: 'ASSIGNED',
          accessType: 'SELF_SELECTED',
          currentCampaignItemId: null,
          assignedAt: new Date(),
          dueDate: null,
          startedAt: null,
          completedAt: null,
        });

        const result = await enrolGeneralTraineeInPlatformCampaign({
          traineeProfileId,
          campaignId,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.isNew).toBe(true);
          expect(result.assignment.accessType).toBe('SELF_SELECTED');
        }
      });

      it('returns existing assignment without error when duplicate enrolment is requested', async () => {
        (prisma.traineeProfile.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          id: traineeProfileId,
        });
        (prisma.campaign.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          id: campaignId,
          name: 'Platform Campaign',
          description: null,
          accentColor: null,
          campaignType: 'PREMADE_GENERAL',
          difficultyLevel: 'BEGINNER',
          status: 'ACTIVE',
          startDate: null,
          endDate: null,
          items: [],
        });
        (prisma.campaignAssignment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          id: 'existing-assignment-id',
          campaignId,
          traineeProfileId,
          assignmentStatus: 'IN_PROGRESS',
          accessType: 'SELF_SELECTED',
          currentCampaignItemId: null,
          assignedAt: new Date(),
          dueDate: null,
          startedAt: null,
          completedAt: null,
        });

        const result = await enrolGeneralTraineeInPlatformCampaign({
          traineeProfileId,
          campaignId,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.isNew).toBe(false);
          expect(result.assignment.assignmentStatus).toBe('IN_PROGRESS');
        }
        expect(prisma.campaignAssignment.create).not.toHaveBeenCalled();
      });

      it('returns TRAINEE_NOT_ELIGIBLE if trainee is not an active general trainee', async () => {
        (prisma.traineeProfile.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

        const result = await enrolGeneralTraineeInPlatformCampaign({
          traineeProfileId,
          campaignId,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe('TRAINEE_NOT_ELIGIBLE');
        }
      });

      it('returns CAMPAIGN_NOT_FOUND if platform campaign does not exist', async () => {
        (prisma.traineeProfile.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          id: traineeProfileId,
        });
        (prisma.campaign.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

        const result = await enrolGeneralTraineeInPlatformCampaign({
          traineeProfileId,
          campaignId,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe('CAMPAIGN_NOT_FOUND');
        }
      });

      it('returns CAMPAIGN_INACTIVE if platform campaign is not active', async () => {
        (prisma.traineeProfile.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          id: traineeProfileId,
        });
        (prisma.campaign.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          id: campaignId,
          name: 'Platform Campaign',
          description: null,
          accentColor: null,
          campaignType: 'PREMADE_GENERAL',
          difficultyLevel: 'BEGINNER',
          status: 'ARCHIVED',
          startDate: null,
          endDate: null,
          items: [],
        });

        const result = await enrolGeneralTraineeInPlatformCampaign({
          traineeProfileId,
          campaignId,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe('CAMPAIGN_INACTIVE');
        }
      });

      it('handles P2002 race condition on concurrent assignment creation gracefully', async () => {
        (prisma.traineeProfile.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          id: traineeProfileId,
        });
        (prisma.campaign.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          id: campaignId,
          name: 'Platform Campaign',
          description: null,
          accentColor: null,
          campaignType: 'PREMADE_GENERAL',
          difficultyLevel: 'BEGINNER',
          status: 'ACTIVE',
          startDate: null,
          endDate: null,
          items: [],
        });
        (prisma.campaignAssignment.findUnique as ReturnType<typeof vi.fn>)
          .mockResolvedValueOnce(null) // first check
          .mockResolvedValueOnce({
            // fallback after P2002
            id: 'concurrent-assignment-id',
            campaignId,
            traineeProfileId,
            assignmentStatus: 'ASSIGNED',
            accessType: 'SELF_SELECTED',
            currentCampaignItemId: null,
            assignedAt: new Date(),
            dueDate: null,
            startedAt: null,
            completedAt: null,
          });

        const p2002Error = new Error('Unique constraint failed');
        (p2002Error as any).code = 'P2002';
        (prisma.campaignAssignment.create as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
          p2002Error,
        );

        const result = await enrolGeneralTraineeInPlatformCampaign({
          traineeProfileId,
          campaignId,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.isNew).toBe(false);
          expect(result.assignment.id).toBe('concurrent-assignment-id');
        }
      });
    });
  });
});

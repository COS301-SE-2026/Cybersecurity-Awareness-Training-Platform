import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  findCampaignCohortAssignments,
  findCampaignProgressFacts,
  findCampaignWithConsumableItems,
} from '../../../src/repositories/campaign-statistics.repository.js';
import { prisma } from '../../../src/lib/prisma.js';

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    campaign: {
      findFirst: vi.fn(),
    },
    campaignAssignment: {
      findMany: vi.fn(),
    },
    interactionEvent: {
      findMany: vi.fn(),
    },
    quizAttempt: {
      findMany: vi.fn(),
    },
  },
}));

describe('CampaignStatisticsRepository', () => {
  const organisationId = '11111111-1111-4111-8111-111111111111';
  const campaignId = '22222222-2222-4222-8222-222222222222';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('findCampaignWithConsumableItems', () => {
    it('returns null when campaign is not found', async () => {
      vi.mocked(prisma.campaign.findFirst).mockResolvedValue(null);

      const result = await findCampaignWithConsumableItems(organisationId, campaignId);
      expect(result).toBeNull();
      expect(prisma.campaign.findFirst).toHaveBeenCalledWith({
        where: {
          id: campaignId,
          OR: [{ organisationId }, { organisationId: null, campaignType: 'PREMADE_GENERAL' }],
        },
        select: expect.any(Object),
      });
    });

    it('returns mapped campaign entity with consumable items and inbox emails', async () => {
      vi.mocked(prisma.campaign.findFirst).mockResolvedValue({
        id: campaignId,
        name: 'Test Campaign',
        description: 'Test Description',
        campaignType: 'ORGANISATION_CUSTOM',
        status: 'ACTIVE',
        startDate: new Date('2026-09-01T00:00:00.000Z'),
        endDate: new Date('2026-09-30T23:59:59.000Z'),
        items: [
          {
            id: 'item-1',
            componentType: 'TRAINING_DOCUMENT',
            trainingDocumentId: 'doc-1',
            quizId: null,
            simulationId: null,
            simulation: null,
          },
          {
            id: 'item-2',
            componentType: 'QUIZ',
            trainingDocumentId: null,
            quizId: 'quiz-1',
            simulationId: null,
            simulation: null,
          },
          {
            id: 'item-3',
            componentType: 'SIMULATED_INBOX',
            trainingDocumentId: null,
            quizId: null,
            simulationId: 'sim-1',
            simulation: {
              simulatedInbox: {
                emails: [{ id: 'email-1' }, { id: 'email-2' }],
              },
            },
          },
        ],
      } as unknown as Awaited<ReturnType<typeof prisma.campaign.findFirst>>);

      const result = await findCampaignWithConsumableItems(organisationId, campaignId);
      expect(result).toEqual({
        id: campaignId,
        name: 'Test Campaign',
        description: 'Test Description',
        campaignType: 'ORGANISATION_CUSTOM',
        status: 'ACTIVE',
        startDate: new Date('2026-09-01T00:00:00.000Z'),
        endDate: new Date('2026-09-30T23:59:59.000Z'),
        consumableItems: [
          {
            id: 'item-1',
            componentType: 'TRAINING_DOCUMENT',
            trainingDocumentId: 'doc-1',
            quizId: null,
            simulationId: null,
            simulatedInboxEmailIds: [],
          },
          {
            id: 'item-2',
            componentType: 'QUIZ',
            trainingDocumentId: null,
            quizId: 'quiz-1',
            simulationId: null,
            simulatedInboxEmailIds: [],
          },
          {
            id: 'item-3',
            componentType: 'SIMULATED_INBOX',
            trainingDocumentId: null,
            quizId: null,
            simulationId: 'sim-1',
            simulatedInboxEmailIds: ['email-1', 'email-2'],
          },
        ],
      });
    });
  });

  describe('findCampaignCohortAssignments', () => {
    it('returns qualifying cohort assignments including active, inactive, and disabled trainees', async () => {
      const now = new Date('2026-08-01T10:00:00.000Z');
      vi.mocked(prisma.campaignAssignment.findMany).mockResolvedValue([
        {
          id: 'asg-1',
          traineeProfileId: 'trainee-1',
          assignmentStatus: 'IN_PROGRESS',
          accessType: 'ASSIGNED',
          assignedAt: now,
          traineeProfile: {
            user: { firstName: 'Alice', lastName: 'Ndlovu', email: 'alice@example.com' },
            organisationTraineeProfile: { membershipStatus: 'ACTIVE' },
          },
        },
        {
          id: 'asg-2',
          traineeProfileId: 'trainee-2',
          assignmentStatus: 'COMPLETED',
          accessType: 'SELF_SELECTED',
          assignedAt: now,
          traineeProfile: {
            user: { firstName: 'Bob', lastName: 'Khumalo', email: 'bob@example.com' },
            organisationTraineeProfile: { membershipStatus: 'DISABLED' },
          },
        },
      ] as unknown as Awaited<ReturnType<typeof prisma.campaignAssignment.findMany>>);

      const result = await findCampaignCohortAssignments(organisationId, campaignId);
      expect(result).toEqual([
        {
          assignmentId: 'asg-1',
          traineeProfileId: 'trainee-1',
          firstName: 'Alice',
          lastName: 'Ndlovu',
          email: 'alice@example.com',
          traineeStatus: 'ACTIVE',
          assignmentStatus: 'IN_PROGRESS',
          accessType: 'ASSIGNED',
          assignedAt: now,
        },
        {
          assignmentId: 'asg-2',
          traineeProfileId: 'trainee-2',
          firstName: 'Bob',
          lastName: 'Khumalo',
          email: 'bob@example.com',
          traineeStatus: 'DISABLED',
          assignmentStatus: 'COMPLETED',
          accessType: 'SELF_SELECTED',
          assignedAt: now,
        },
      ]);
    });
  });

  describe('findCampaignProgressFacts', () => {
    it('returns empty results when traineeProfileIds or consumableItems are empty', async () => {
      const result1 = await findCampaignProgressFacts({
        traineeProfileIds: [],
        assignmentIds: ['asg-1'],
        consumableItems: [
          {
            id: 'item-1',
            componentType: 'TRAINING_DOCUMENT',
            trainingDocumentId: 'doc-1',
            quizId: null,
            simulationId: null,
            simulatedInboxEmailIds: [],
          },
        ],
      });
      expect(result1).toEqual({
        trainingEvents: [],
        quizAttempts: [],
        simulatedEmailEvents: [],
      });

      const result2 = await findCampaignProgressFacts({
        traineeProfileIds: ['trainee-1'],
        assignmentIds: ['asg-1'],
        consumableItems: [],
      });
      expect(result2).toEqual({
        trainingEvents: [],
        quizAttempts: [],
        simulatedEmailEvents: [],
      });
    });

    it('queries and maps bulk training events, quiz attempts, and simulation events', async () => {
      vi.mocked(prisma.interactionEvent.findMany)
        .mockResolvedValueOnce([
          {
            traineeProfileId: 'trainee-1',
            campaignAssignmentId: 'asg-1',
            campaignItemId: 'item-1',
            trainingDocumentId: 'doc-1',
            eventType: 'TRAINING_COMPLETED',
          },
        ] as unknown as Awaited<ReturnType<typeof prisma.interactionEvent.findMany>>)
        .mockResolvedValueOnce([
          {
            traineeProfileId: 'trainee-1',
            campaignAssignmentId: 'asg-1',
            campaignItemId: 'item-3',
            simulatedEmailId: 'email-1',
            targetId: 'email-1',
          },
        ] as unknown as Awaited<ReturnType<typeof prisma.interactionEvent.findMany>>);

      vi.mocked(prisma.quizAttempt.findMany).mockResolvedValueOnce([
        {
          id: 'attempt-1',
          traineeProfileId: 'trainee-1',
          campaignAssignmentId: 'asg-1',
          campaignItemId: 'item-2',
          quizId: 'quiz-1',
          status: 'SUBMITTED',
          quizResult: { scorePercentage: 85 },
        },
      ] as unknown as Awaited<ReturnType<typeof prisma.quizAttempt.findMany>>);

      const result = await findCampaignProgressFacts({
        traineeProfileIds: ['trainee-1'],
        assignmentIds: ['asg-1'],
        consumableItems: [
          {
            id: 'item-1',
            componentType: 'TRAINING_DOCUMENT',
            trainingDocumentId: 'doc-1',
            quizId: null,
            simulationId: null,
            simulatedInboxEmailIds: [],
          },
          {
            id: 'item-2',
            componentType: 'QUIZ',
            trainingDocumentId: null,
            quizId: 'quiz-1',
            simulationId: null,
            simulatedInboxEmailIds: [],
          },
          {
            id: 'item-3',
            componentType: 'SIMULATED_INBOX',
            trainingDocumentId: null,
            quizId: null,
            simulationId: 'sim-1',
            simulatedInboxEmailIds: ['email-1'],
          },
        ],
      });

      expect(result.trainingEvents).toEqual([
        {
          traineeProfileId: 'trainee-1',
          campaignAssignmentId: 'asg-1',
          campaignItemId: 'item-1',
          trainingDocumentId: 'doc-1',
          eventType: 'TRAINING_COMPLETED',
        },
      ]);
      expect(result.quizAttempts).toEqual([
        {
          traineeProfileId: 'trainee-1',
          campaignAssignmentId: 'asg-1',
          campaignItemId: 'item-2',
          quizId: 'quiz-1',
          status: 'SUBMITTED',
          scorePercentage: 85,
        },
      ]);
      expect(result.simulatedEmailEvents).toEqual([
        {
          traineeProfileId: 'trainee-1',
          campaignAssignmentId: 'asg-1',
          campaignItemId: 'item-3',
          simulatedEmailId: 'email-1',
          targetId: 'email-1',
        },
      ]);
    });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  findCampaignCohortAssignments,
  findCampaignProgressFacts,
  findCampaignWithItems,
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

  describe('findCampaignWithItems', () => {
    it('returns null when campaign is not found', async () => {
      vi.mocked(prisma.campaign.findFirst).mockResolvedValue(null);

      const result = await findCampaignWithItems(organisationId, campaignId);
      expect(result).toBeNull();
      expect(prisma.campaign.findFirst).toHaveBeenCalledWith({
        where: {
          id: campaignId,
          OR: [{ organisationId }, { organisationId: null, campaignType: 'PREMADE_GENERAL' }],
        },
        select: expect.any(Object),
      });
    });

    it('returns mapped campaign entity with all items including GROUP, COMPONENT, and simulation inbox emails', async () => {
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
            id: 'item-group-1',
            itemType: 'GROUP',
            componentType: null,
            isRequired: true,
            trainingDocumentId: null,
            quizId: null,
            simulationId: null,
            simulation: null,
          },
          {
            id: 'item-doc-1',
            itemType: 'COMPONENT',
            componentType: 'TRAINING_DOCUMENT',
            isRequired: true,
            trainingDocumentId: 'doc-1',
            quizId: null,
            simulationId: null,
            simulation: null,
          },
          {
            id: 'item-quiz-1',
            itemType: 'COMPONENT',
            componentType: 'QUIZ',
            isRequired: false,
            trainingDocumentId: null,
            quizId: 'quiz-1',
            simulationId: null,
            simulation: null,
          },
          {
            id: 'item-sim-1',
            itemType: 'COMPONENT',
            componentType: 'SIMULATED_INBOX',
            isRequired: true,
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

      const result = await findCampaignWithItems(organisationId, campaignId);
      expect(result).toEqual({
        id: campaignId,
        name: 'Test Campaign',
        description: 'Test Description',
        campaignType: 'ORGANISATION_CUSTOM',
        status: 'ACTIVE',
        startDate: new Date('2026-09-01T00:00:00.000Z'),
        endDate: new Date('2026-09-30T23:59:59.000Z'),
        items: [
          {
            id: 'item-group-1',
            itemType: 'GROUP',
            componentType: null,
            isRequired: true,
            trainingDocumentId: null,
            quizId: null,
            simulationId: null,
            simulatedInboxEmailIds: [],
          },
          {
            id: 'item-doc-1',
            itemType: 'COMPONENT',
            componentType: 'TRAINING_DOCUMENT',
            isRequired: true,
            trainingDocumentId: 'doc-1',
            quizId: null,
            simulationId: null,
            simulatedInboxEmailIds: [],
          },
          {
            id: 'item-quiz-1',
            itemType: 'COMPONENT',
            componentType: 'QUIZ',
            isRequired: false,
            trainingDocumentId: null,
            quizId: 'quiz-1',
            simulationId: null,
            simulatedInboxEmailIds: [],
          },
          {
            id: 'item-sim-1',
            itemType: 'COMPONENT',
            componentType: 'SIMULATED_INBOX',
            isRequired: true,
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
    it('returns empty results when traineeProfileIds, assignmentIds, or item IDs are empty', async () => {
      const result1 = await findCampaignProgressFacts({
        traineeProfileIds: [],
        assignmentIds: ['asg-1'],
        trainingItemIds: ['item-1'],
        quizItemIds: [],
        simulationItemIds: [],
      });
      expect(result1).toEqual({
        trainingEvents: [],
        quizAttempts: [],
        simulatedEmailEvents: [],
      });

      const result2 = await findCampaignProgressFacts({
        traineeProfileIds: ['trainee-1'],
        assignmentIds: ['asg-1'],
        trainingItemIds: [],
        quizItemIds: [],
        simulationItemIds: [],
      });
      expect(result2).toEqual({
        trainingEvents: [],
        quizAttempts: [],
        simulatedEmailEvents: [],
      });
    });

    it('queries facts strictly scoped to assignment and campaign item IDs without cross-campaign bleed', async () => {
      vi.mocked(prisma.interactionEvent.findMany)
        .mockResolvedValueOnce([
          {
            traineeProfileId: 'trainee-1',
            campaignAssignmentId: 'asg-1',
            campaignItemId: 'item-doc-1',
            trainingDocumentId: 'doc-1',
            eventType: 'TRAINING_COMPLETED',
          },
        ] as unknown as Awaited<ReturnType<typeof prisma.interactionEvent.findMany>>)
        .mockResolvedValueOnce([
          {
            traineeProfileId: 'trainee-1',
            campaignAssignmentId: 'asg-1',
            campaignItemId: 'item-sim-1',
            simulatedEmailId: 'email-1',
            targetId: 'email-1',
          },
        ] as unknown as Awaited<ReturnType<typeof prisma.interactionEvent.findMany>>);

      vi.mocked(prisma.quizAttempt.findMany).mockResolvedValueOnce([
        {
          id: 'attempt-1',
          traineeProfileId: 'trainee-1',
          campaignAssignmentId: 'asg-1',
          campaignItemId: 'item-quiz-1',
          quizId: 'quiz-1',
          status: 'SUBMITTED',
          quizResult: { scorePercentage: 85 },
        },
        {
          id: 'attempt-2',
          traineeProfileId: 'trainee-1',
          campaignAssignmentId: 'asg-1',
          campaignItemId: 'item-quiz-2',
          quizId: 'quiz-2',
          status: 'SUBMITTED',
          quizResult: null,
        },
      ] as unknown as Awaited<ReturnType<typeof prisma.quizAttempt.findMany>>);

      const result = await findCampaignProgressFacts({
        traineeProfileIds: ['trainee-1'],
        assignmentIds: ['asg-1'],
        trainingItemIds: ['item-doc-1'],
        quizItemIds: ['item-quiz-1', 'item-quiz-2'],
        simulationItemIds: ['item-sim-1'],
      });

      expect(prisma.interactionEvent.findMany).toHaveBeenCalledWith({
        where: {
          traineeProfileId: { in: ['trainee-1'] },
          campaignAssignmentId: { in: ['asg-1'] },
          campaignItemId: { in: ['item-doc-1'] },
          eventType: { in: ['TRAINING_VIEWED', 'TRAINING_COMPLETED'] },
        },
        select: expect.any(Object),
      });

      expect(prisma.quizAttempt.findMany).toHaveBeenCalledWith({
        where: {
          traineeProfileId: { in: ['trainee-1'] },
          campaignAssignmentId: { in: ['asg-1'] },
          campaignItemId: { in: ['item-quiz-1', 'item-quiz-2'] },
          status: { in: ['IN_PROGRESS', 'SUBMITTED'] },
        },
        select: expect.any(Object),
      });

      expect(result.trainingEvents).toEqual([
        {
          traineeProfileId: 'trainee-1',
          campaignAssignmentId: 'asg-1',
          campaignItemId: 'item-doc-1',
          trainingDocumentId: 'doc-1',
          eventType: 'TRAINING_COMPLETED',
        },
      ]);
      expect(result.quizAttempts).toEqual([
        {
          traineeProfileId: 'trainee-1',
          campaignAssignmentId: 'asg-1',
          campaignItemId: 'item-quiz-1',
          quizId: 'quiz-1',
          status: 'SUBMITTED',
          hasResult: true,
          scorePercentage: 85,
        },
        {
          traineeProfileId: 'trainee-1',
          campaignAssignmentId: 'asg-1',
          campaignItemId: 'item-quiz-2',
          quizId: 'quiz-2',
          status: 'SUBMITTED',
          hasResult: false,
          scorePercentage: null,
        },
      ]);
      expect(result.simulatedEmailEvents).toEqual([
        {
          traineeProfileId: 'trainee-1',
          campaignAssignmentId: 'asg-1',
          campaignItemId: 'item-sim-1',
          simulatedEmailId: 'email-1',
          targetId: 'email-1',
        },
      ]);
    });
  });
});

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
        name: 'Repo Campaign',
        description: 'Repo Desc',
        campaignType: 'ORGANISATION_CUSTOM',
        status: 'ACTIVE',
        startDate: new Date('2026-09-01T00:00:00.000Z'),
        endDate: new Date('2026-09-30T23:59:59.000Z'),
        items: [
          {
            id: 'g-1',
            itemType: 'GROUP',
            componentType: null,
            isRequired: true,
            trainingDocumentId: null,
            quizId: null,
            simulationId: null,
            simulation: null,
          },
          {
            id: 'd-1',
            itemType: 'COMPONENT',
            componentType: 'TRAINING_DOCUMENT',
            isRequired: true,
            trainingDocumentId: 'doc-10',
            quizId: null,
            simulationId: null,
            simulation: null,
          },
          {
            id: 'q-1',
            itemType: 'COMPONENT',
            componentType: 'QUIZ',
            isRequired: false,
            trainingDocumentId: null,
            quizId: 'quiz-20',
            simulationId: null,
            simulation: null,
          },
          {
            id: 's-1',
            itemType: 'COMPONENT',
            componentType: 'SIMULATED_INBOX',
            isRequired: true,
            trainingDocumentId: null,
            quizId: null,
            simulationId: 'sim-30',
            simulation: { simulatedInbox: { emails: [{ id: 'em-1' }, { id: 'em-2' }] } },
          },
        ],
      } as unknown as Awaited<ReturnType<typeof prisma.campaign.findFirst>>);

      const result = await findCampaignWithItems(organisationId, campaignId);
      expect(result).toEqual({
        id: campaignId,
        name: 'Repo Campaign',
        description: 'Repo Desc',
        campaignType: 'ORGANISATION_CUSTOM',
        status: 'ACTIVE',
        startDate: new Date('2026-09-01T00:00:00.000Z'),
        endDate: new Date('2026-09-30T23:59:59.000Z'),
        items: [
          {
            id: 'g-1',
            itemType: 'GROUP',
            componentType: null,
            isRequired: true,
            trainingDocumentId: null,
            quizId: null,
            simulationId: null,
            simulatedInboxEmailIds: [],
          },
          {
            id: 'd-1',
            itemType: 'COMPONENT',
            componentType: 'TRAINING_DOCUMENT',
            isRequired: true,
            trainingDocumentId: 'doc-10',
            quizId: null,
            simulationId: null,
            simulatedInboxEmailIds: [],
          },
          {
            id: 'q-1',
            itemType: 'COMPONENT',
            componentType: 'QUIZ',
            isRequired: false,
            trainingDocumentId: null,
            quizId: 'quiz-20',
            simulationId: null,
            simulatedInboxEmailIds: [],
          },
          {
            id: 's-1',
            itemType: 'COMPONENT',
            componentType: 'SIMULATED_INBOX',
            isRequired: true,
            trainingDocumentId: null,
            quizId: null,
            simulationId: 'sim-30',
            simulatedInboxEmailIds: ['em-1', 'em-2'],
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
          id: 'asg-active',
          traineeProfileId: 'tp-1',
          assignmentStatus: 'IN_PROGRESS',
          accessType: 'ASSIGNED',
          assignedAt: now,
          traineeProfile: {
            user: { firstName: 'Alice', lastName: 'Ndlovu', email: 'alice@example.com' },
            organisationTraineeProfile: { membershipStatus: 'ACTIVE' },
          },
        },
        {
          id: 'asg-disabled',
          traineeProfileId: 'tp-2',
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
          assignmentId: 'asg-active',
          traineeProfileId: 'tp-1',
          firstName: 'Alice',
          lastName: 'Ndlovu',
          email: 'alice@example.com',
          traineeStatus: 'ACTIVE',
          assignmentStatus: 'IN_PROGRESS',
          accessType: 'ASSIGNED',
          assignedAt: now,
        },
        {
          assignmentId: 'asg-disabled',
          traineeProfileId: 'tp-2',
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
      const r1 = await findCampaignProgressFacts({
        traineeProfileIds: [],
        assignmentIds: ['asg-1'],
        trainingItemIds: ['item-1'],
        quizItemIds: [],
        simulationItemIds: [],
      });
      expect(r1).toEqual({ trainingEvents: [], quizAttempts: [], simulatedEmailEvents: [] });

      const r2 = await findCampaignProgressFacts({
        traineeProfileIds: ['tp-1'],
        assignmentIds: ['asg-1'],
        trainingItemIds: [],
        quizItemIds: [],
        simulationItemIds: [],
      });
      expect(r2).toEqual({ trainingEvents: [], quizAttempts: [], simulatedEmailEvents: [] });
    });

    it('queries facts strictly scoped to assignment and campaign item IDs without cross-campaign bleed', async () => {
      vi.mocked(prisma.interactionEvent.findMany)
        .mockResolvedValueOnce([
          {
            traineeProfileId: 'tp-1',
            campaignAssignmentId: 'asg-1',
            campaignItemId: 'd-1',
            trainingDocumentId: 'doc-1',
            eventType: 'TRAINING_COMPLETED',
          },
        ] as unknown as Awaited<ReturnType<typeof prisma.interactionEvent.findMany>>)
        .mockResolvedValueOnce([
          {
            traineeProfileId: 'tp-1',
            campaignAssignmentId: 'asg-1',
            campaignItemId: 's-1',
            simulatedEmailId: 'em-1',
            targetId: 'em-1',
          },
        ] as unknown as Awaited<ReturnType<typeof prisma.interactionEvent.findMany>>);

      vi.mocked(prisma.quizAttempt.findMany).mockResolvedValueOnce([
        {
          id: 'att-1',
          traineeProfileId: 'tp-1',
          campaignAssignmentId: 'asg-1',
          campaignItemId: 'q-1',
          quizId: 'quiz-1',
          status: 'SUBMITTED',
          quizResult: { scorePercentage: 85 },
        },
        {
          id: 'att-2',
          traineeProfileId: 'tp-1',
          campaignAssignmentId: 'asg-1',
          campaignItemId: 'q-2',
          quizId: 'quiz-2',
          status: 'SUBMITTED',
          quizResult: null,
        },
      ] as unknown as Awaited<ReturnType<typeof prisma.quizAttempt.findMany>>);

      const result = await findCampaignProgressFacts({
        traineeProfileIds: ['tp-1'],
        assignmentIds: ['asg-1'],
        trainingItemIds: ['d-1'],
        quizItemIds: ['q-1', 'q-2'],
        simulationItemIds: ['s-1'],
      });

      expect(prisma.interactionEvent.findMany).toHaveBeenCalledWith({
        where: {
          traineeProfileId: { in: ['tp-1'] },
          campaignAssignmentId: { in: ['asg-1'] },
          campaignItemId: { in: ['d-1'] },
          eventType: { in: ['TRAINING_VIEWED', 'TRAINING_COMPLETED'] },
        },
        select: expect.any(Object),
      });

      expect(prisma.quizAttempt.findMany).toHaveBeenCalledWith({
        where: {
          traineeProfileId: { in: ['tp-1'] },
          campaignAssignmentId: { in: ['asg-1'] },
          campaignItemId: { in: ['q-1', 'q-2'] },
          status: { in: ['IN_PROGRESS', 'SUBMITTED'] },
        },
        select: expect.any(Object),
      });

      expect(result.trainingEvents).toEqual([
        {
          traineeProfileId: 'tp-1',
          campaignAssignmentId: 'asg-1',
          campaignItemId: 'd-1',
          trainingDocumentId: 'doc-1',
          eventType: 'TRAINING_COMPLETED',
        },
      ]);
      expect(result.quizAttempts).toEqual([
        {
          traineeProfileId: 'tp-1',
          campaignAssignmentId: 'asg-1',
          campaignItemId: 'q-1',
          quizId: 'quiz-1',
          status: 'SUBMITTED',
          hasResult: true,
          scorePercentage: 85,
        },
        {
          traineeProfileId: 'tp-1',
          campaignAssignmentId: 'asg-1',
          campaignItemId: 'q-2',
          quizId: 'quiz-2',
          status: 'SUBMITTED',
          hasResult: false,
          scorePercentage: null,
        },
      ]);
      expect(result.simulatedEmailEvents).toEqual([
        {
          traineeProfileId: 'tp-1',
          campaignAssignmentId: 'asg-1',
          campaignItemId: 's-1',
          simulatedEmailId: 'em-1',
          targetId: 'em-1',
        },
      ]);
    });
  });
});

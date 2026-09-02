import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  enrolPlatformCampaign,
  getTraineeCampaignDetail,
  getTraineeCampaigns,
  listPlatformCampaigns,
  TraineeCampaignForbiddenError,
  TraineeCampaignNotFoundError,
} from '../../../src/services/trainee-campaign.service.js';
import * as CampaignAssignmentRepository from '../../../src/repositories/campaign-assignment.repository.js';
import * as TraineeCampaignRepository from '../../../src/repositories/trainee-campaign.repository.js';
import { CampaignEligibilityDenialError } from '../../../src/services/campaign-eligibility.service.js';

vi.mock('../../../src/repositories/campaign-assignment.repository.js', () => ({
  findGeneralTraineeActorScope: vi.fn(),
  findActiveGeneralTraineeByUserId: vi.fn(),
  findPlatformCampaignsForDiscovery: vi.fn(),
  findPlatformCampaignById: vi.fn(),
  enrolGeneralTraineeInPlatformCampaign: vi.fn(),
}));

vi.mock('../../../src/repositories/trainee-campaign.repository.js', () => ({
  findActiveTraineeProfileByUserId: vi.fn(),
  findAccessibleCampaignAssignments: vi.fn(),
  findAccessibleCampaignAssignment: vi.fn(),
  findTrainingInteractionEvents: vi.fn(),
  findQuizAttempts: vi.fn(),
  findSimulationInteractionEvents: vi.fn(),
  findEmailClassificationResponses: vi.fn(),
}));

function makeUuid(idx: number): string {
  const hex = idx.toString(16).padStart(12, '0');
  return `00000000-0000-4000-8000-${hex}`;
}

describe('Trainee Campaign Service', () => {
  const userId = makeUuid(1);
  const traineeProfileId = makeUuid(2);
  const campaignId = makeUuid(3);
  const assignmentId = makeUuid(4);
  const groupItemId = makeUuid(5);
  const trainingItemId = makeUuid(6);
  const quizItemId = makeUuid(7);
  const simulationItemId = makeUuid(8);

  type ActorScope = Awaited<
    ReturnType<typeof CampaignAssignmentRepository.findGeneralTraineeActorScope>
  >;

  const validActorScope: NonNullable<ActorScope> = {
    id: userId,
    userType: 'GENERAL_TRAINEE',
    authStatus: 'ACTIVE',
    traineeProfile: {
      id: traineeProfileId,
      traineeStatus: 'ACTIVE',
      generalTraineeProfile: {
        id: makeUuid(9),
        accessSource: 'SELF_SIGNUP',
      },
    },
  };

  const activeTraineeProfile = {
    id: traineeProfileId,
    userId,
    traineeStatus: 'ACTIVE' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(CampaignAssignmentRepository.findGeneralTraineeActorScope).mockResolvedValue(
      validActorScope,
    );
    vi.mocked(TraineeCampaignRepository.findActiveTraineeProfileByUserId).mockResolvedValue(
      activeTraineeProfile,
    );
    vi.mocked(TraineeCampaignRepository.findTrainingInteractionEvents).mockResolvedValue([]);
    vi.mocked(TraineeCampaignRepository.findQuizAttempts).mockResolvedValue([]);
    vi.mocked(TraineeCampaignRepository.findSimulationInteractionEvents).mockResolvedValue([]);
    vi.mocked(TraineeCampaignRepository.findEmailClassificationResponses).mockResolvedValue([]);
  });

  describe('getTraineeCampaigns', () => {
    it('throws TraineeCampaignNotFoundError if active trainee profile is not found', async () => {
      vi.mocked(TraineeCampaignRepository.findActiveTraineeProfileByUserId).mockResolvedValueOnce(
        null,
      );

      await expect(getTraineeCampaigns(userId)).rejects.toThrow(TraineeCampaignNotFoundError);
    });

    it('returns empty campaigns list when trainee has no assignments', async () => {
      vi.mocked(TraineeCampaignRepository.findAccessibleCampaignAssignments).mockResolvedValueOnce(
        [],
      );

      const result = await getTraineeCampaigns(userId);
      expect(result).toEqual({ campaigns: [] });
    });

    it('maps assignment statuses (ASSIGNED, IN_PROGRESS, COMPLETED) with explicit status and null dates', async () => {
      const assignedDate = new Date('2026-05-16T08:00:00.000Z');
      const camp1Id = makeUuid(10);
      const camp2Id = makeUuid(11);
      const camp3Id = makeUuid(12);
      const assign1Id = makeUuid(13);
      const assign2Id = makeUuid(14);
      const assign3Id = makeUuid(15);
      const item1Id = makeUuid(16);
      const item2Id = makeUuid(17);

      vi.mocked(TraineeCampaignRepository.findAccessibleCampaignAssignments).mockResolvedValueOnce([
        {
          id: assign1Id,
          assignmentStatus: 'ASSIGNED',
          accessType: 'ASSIGNED',
          currentCampaignItemId: null,
          assignedAt: assignedDate,
          dueDate: null,
          startedAt: null,
          completedAt: null,
          campaign: {
            id: camp1Id,
            name: 'Assigned Campaign',
            description: 'Assigned description',
            accentColor: '#2563EB',
            campaignType: 'PREMADE_GENERAL',
            difficultyLevel: 'BEGINNER',
            status: 'ACTIVE',
            startDate: null,
            endDate: null,
            items: [
              { id: item1Id, availabilityStatus: 'AVAILABLE' },
              { id: item2Id, availabilityStatus: 'LOCKED' },
            ],
          },
        },
        {
          id: assign2Id,
          assignmentStatus: 'IN_PROGRESS',
          accessType: 'SELF_SELECTED',
          currentCampaignItemId: item1Id,
          assignedAt: assignedDate,
          dueDate: new Date('2026-06-16T08:00:00.000Z'),
          startedAt: new Date('2026-05-16T08:30:00.000Z'),
          completedAt: null,
          campaign: {
            id: camp2Id,
            name: 'In Progress Campaign',
            description: 'Progress description',
            accentColor: '#10B981',
            campaignType: 'ORGANISATION_CUSTOM',
            difficultyLevel: 'INTERMEDIATE',
            status: 'ACTIVE',
            startDate: new Date('2026-05-01T00:00:00.000Z'),
            endDate: new Date('2026-07-01T00:00:00.000Z'),
            items: [{ id: item1Id, availabilityStatus: 'AVAILABLE' }],
          },
        },
        {
          id: assign3Id,
          assignmentStatus: 'COMPLETED',
          accessType: 'ASSIGNED',
          currentCampaignItemId: null,
          assignedAt: assignedDate,
          dueDate: null,
          startedAt: new Date('2026-05-16T08:30:00.000Z'),
          completedAt: new Date('2026-05-16T09:00:00.000Z'),
          campaign: {
            id: camp3Id,
            name: 'Completed Campaign',
            description: 'Completed description',
            accentColor: '#6366F1',
            campaignType: 'PREMADE_GENERAL',
            difficultyLevel: 'ADVANCED',
            status: 'ARCHIVED',
            startDate: null,
            endDate: null,
            items: [],
          },
        },
      ] as unknown as Awaited<
        ReturnType<typeof TraineeCampaignRepository.findAccessibleCampaignAssignments>
      >);

      const result = await getTraineeCampaigns(userId);

      expect(result.campaigns).toHaveLength(3);
      expect(result.campaigns[0]).toMatchObject({
        campaignId: camp1Id,
        status: 'ACTIVE',
        itemCount: 2,
        availableItemCount: 1,
        assignment: {
          assignmentId: assign1Id,
          assignmentStatus: 'ASSIGNED',
          accessType: 'ASSIGNED',
          currentCampaignItemId: null,
          dueDate: null,
          startedAt: null,
          completedAt: null,
        },
      });
      expect(result.campaigns[1]).toMatchObject({
        campaignId: camp2Id,
        status: 'ACTIVE',
        itemCount: 1,
        availableItemCount: 1,
        assignment: {
          assignmentId: assign2Id,
          assignmentStatus: 'IN_PROGRESS',
          accessType: 'SELF_SELECTED',
          currentCampaignItemId: item1Id,
          dueDate: '2026-06-16T08:00:00.000Z',
          startedAt: '2026-05-16T08:30:00.000Z',
        },
      });
      expect(result.campaigns[2]).toMatchObject({
        campaignId: camp3Id,
        status: 'ARCHIVED',
        itemCount: 0,
        availableItemCount: 0,
        assignment: {
          assignmentId: assign3Id,
          assignmentStatus: 'COMPLETED',
          completedAt: '2026-05-16T09:00:00.000Z',
        },
      });
    });
  });

  describe('getTraineeCampaignDetail', () => {
    const createBaseDetailAssignment = (items: unknown[] = []) => ({
      id: assignmentId,
      assignmentStatus: 'IN_PROGRESS',
      accessType: 'ASSIGNED',
      currentCampaignItemId: trainingItemId,
      assignedAt: new Date('2026-05-16T08:00:00.000Z'),
      dueDate: null,
      startedAt: new Date('2026-05-16T08:30:00.000Z'),
      completedAt: null,
      campaign: {
        id: campaignId,
        name: 'Phishing Awareness',
        description: 'Complete training and drills',
        accentColor: '#2563EB',
        campaignType: 'PREMADE_GENERAL',
        difficultyLevel: 'BEGINNER',
        status: 'ACTIVE',
        startDate: null,
        endDate: null,
        items,
      },
    });

    it('throws TraineeCampaignNotFoundError when trainee profile does not exist', async () => {
      vi.mocked(TraineeCampaignRepository.findActiveTraineeProfileByUserId).mockResolvedValueOnce(
        null,
      );

      await expect(getTraineeCampaignDetail(userId, campaignId)).rejects.toThrow(
        TraineeCampaignNotFoundError,
      );
    });

    it('throws TraineeCampaignNotFoundError when assignment is not found', async () => {
      vi.mocked(TraineeCampaignRepository.findAccessibleCampaignAssignment).mockResolvedValueOnce(
        null,
      );

      await expect(getTraineeCampaignDetail(userId, campaignId)).rejects.toThrow(
        TraineeCampaignNotFoundError,
      );
    });

    it('throws TraineeCampaignNotFoundError when campaign eligibility cannot view (e.g. DRAFT)', async () => {
      const draftAssignment = createBaseDetailAssignment();
      draftAssignment.campaign.status = 'DRAFT';
      draftAssignment.campaign.campaignType = 'ORGANISATION_CUSTOM';

      vi.mocked(TraineeCampaignRepository.findAccessibleCampaignAssignment).mockResolvedValueOnce(
        draftAssignment as unknown as Awaited<
          ReturnType<typeof TraineeCampaignRepository.findAccessibleCampaignAssignment>
        >,
      );

      await expect(getTraineeCampaignDetail(userId, campaignId)).rejects.toThrow(
        TraineeCampaignNotFoundError,
      );
    });

    it('builds item tree with group ordering, child ordering, and default rules', async () => {
      const simId = makeUuid(20);
      const quizId = makeUuid(21);
      const docId = makeUuid(22);

      const items = [
        {
          id: simulationItemId,
          campaignId,
          parentGroupId: null,
          itemType: 'COMPONENT',
          componentType: 'SIMULATED_INBOX',
          title: 'Simulation Root',
          description: 'Drill',
          position: 20,
          isRequired: true,
          availabilityStatus: 'AVAILABLE',
          simulation: {
            id: simId,
            title: 'Inbox',
            description: 'Desc',
            difficultyLevel: 'BEGINNER',
            safetyStatus: 'APPROVED',
            simulatedInbox: { status: 'ACTIVE' },
          },
        },
        {
          id: groupItemId,
          campaignId,
          parentGroupId: null,
          itemType: 'GROUP',
          componentType: null,
          groupType: null,
          completionRule: null,
          title: 'Group Module',
          description: 'Module desc',
          position: 10,
          isRequired: true,
          availabilityStatus: 'AVAILABLE',
        },
        {
          id: quizItemId,
          campaignId,
          parentGroupId: groupItemId,
          itemType: 'COMPONENT',
          componentType: 'QUIZ',
          title: 'Quiz Child',
          description: 'Quiz desc',
          position: 200,
          isRequired: true,
          availabilityStatus: 'AVAILABLE',
          quiz: {
            id: quizId,
            title: 'Quiz Title',
            description: 'Desc',
            passThresholdPercentage: 80,
            difficultyLevel: 'BEGINNER',
            status: 'PUBLISHED',
            _count: { questions: 5 },
          },
        },
        {
          id: trainingItemId,
          campaignId,
          parentGroupId: groupItemId,
          itemType: 'COMPONENT',
          componentType: 'TRAINING_DOCUMENT',
          title: 'Training Child',
          description: 'Doc desc',
          position: 100,
          isRequired: true,
          availabilityStatus: 'AVAILABLE',
          trainingDocument: {
            id: docId,
            title: 'Doc Title',
            contentSummary: 'Summary',
            estimatedReadTimeMinutes: 5,
            difficultyLevel: 'BEGINNER',
            status: 'AVAILABLE',
          },
        },
      ];

      vi.mocked(TraineeCampaignRepository.findAccessibleCampaignAssignment).mockResolvedValueOnce(
        createBaseDetailAssignment(items) as unknown as Awaited<
          ReturnType<typeof TraineeCampaignRepository.findAccessibleCampaignAssignment>
        >,
      );

      const result = await getTraineeCampaignDetail(userId, campaignId);

      expect(result.items).toHaveLength(2);
      expect(result.items[0].campaignItemId).toBe(groupItemId);
      expect(result.items[0]).toMatchObject({
        itemType: 'GROUP',
        groupType: 'SECTION',
        completionRule: 'COMPLETE_ALL',
        isOpenable: false,
        activityApiPath: null,
        progressStatus: 'NOT_STARTED',
      });

      const groupItem = result.items[0] as {
        children: Array<{ campaignItemId: string; position: number }>;
      };
      expect(groupItem.children).toHaveLength(2);
      expect(groupItem.children[0].campaignItemId).toBe(trainingItemId);
      expect(groupItem.children[1].campaignItemId).toBe(quizItemId);

      expect(result.items[1].campaignItemId).toBe(simulationItemId);
    });

    it('evaluates openability accurately across training, quiz, and simulated-inbox states', async () => {
      const items = [
        {
          id: makeUuid(30),
          campaignId,
          parentGroupId: null,
          itemType: 'COMPONENT',
          componentType: 'TRAINING_DOCUMENT',
          title: 'Available Doc',
          position: 1,
          isRequired: true,
          availabilityStatus: 'AVAILABLE',
          trainingDocument: {
            id: makeUuid(31),
            title: 'T',
            status: 'AVAILABLE',
            difficultyLevel: 'BEGINNER',
            estimatedReadTimeMinutes: 5,
            contentSummary: 'S',
          },
        },
        {
          id: makeUuid(32),
          campaignId,
          parentGroupId: null,
          itemType: 'COMPONENT',
          componentType: 'TRAINING_DOCUMENT',
          title: 'Archived Doc',
          position: 2,
          isRequired: true,
          availabilityStatus: 'AVAILABLE',
          trainingDocument: {
            id: makeUuid(33),
            title: 'T',
            status: 'ARCHIVED',
            difficultyLevel: 'BEGINNER',
            estimatedReadTimeMinutes: 5,
            contentSummary: 'S',
          },
        },
        {
          id: makeUuid(34),
          campaignId,
          parentGroupId: null,
          itemType: 'COMPONENT',
          componentType: 'QUIZ',
          title: 'Published Quiz',
          position: 3,
          isRequired: true,
          availabilityStatus: 'AVAILABLE',
          quiz: {
            id: makeUuid(35),
            title: 'Q',
            status: 'PUBLISHED',
            difficultyLevel: 'BEGINNER',
            passThresholdPercentage: 70,
            _count: { questions: 3 },
          },
        },
        {
          id: makeUuid(36),
          campaignId,
          parentGroupId: null,
          itemType: 'COMPONENT',
          componentType: 'QUIZ',
          title: 'Draft Quiz',
          position: 4,
          isRequired: true,
          availabilityStatus: 'AVAILABLE',
          quiz: {
            id: makeUuid(37),
            title: 'Q',
            status: 'DRAFT',
            difficultyLevel: 'BEGINNER',
            passThresholdPercentage: 70,
            _count: { questions: 3 },
          },
        },
        {
          id: makeUuid(38),
          campaignId,
          parentGroupId: null,
          itemType: 'COMPONENT',
          componentType: 'SIMULATED_INBOX',
          title: 'Approved Simulation',
          position: 5,
          isRequired: true,
          availabilityStatus: 'AVAILABLE',
          simulation: {
            id: makeUuid(39),
            title: 'S',
            safetyStatus: 'APPROVED',
            simulatedInbox: { status: 'ACTIVE' },
            difficultyLevel: 'BEGINNER',
          },
        },
        {
          id: makeUuid(40),
          campaignId,
          parentGroupId: null,
          itemType: 'COMPONENT',
          componentType: 'SIMULATED_INBOX',
          title: 'Inactive Simulation',
          position: 6,
          isRequired: true,
          availabilityStatus: 'AVAILABLE',
          simulation: {
            id: makeUuid(41),
            title: 'S',
            safetyStatus: 'APPROVED',
            simulatedInbox: { status: 'INACTIVE' },
            difficultyLevel: 'BEGINNER',
          },
        },
        {
          id: makeUuid(42),
          campaignId,
          parentGroupId: null,
          itemType: 'COMPONENT',
          componentType: 'SIMULATED_INBOX',
          title: 'Unapproved Simulation',
          position: 7,
          isRequired: true,
          availabilityStatus: 'AVAILABLE',
          simulation: {
            id: makeUuid(43),
            title: 'S',
            safetyStatus: 'DRAFT',
            simulatedInbox: { status: 'ACTIVE' },
            difficultyLevel: 'BEGINNER',
          },
        },
        {
          id: makeUuid(44),
          campaignId,
          parentGroupId: null,
          itemType: 'COMPONENT',
          componentType: 'TRAINING_DOCUMENT',
          title: 'Locked Doc',
          position: 8,
          isRequired: true,
          availabilityStatus: 'LOCKED',
          trainingDocument: {
            id: makeUuid(45),
            title: 'T',
            status: 'AVAILABLE',
            difficultyLevel: 'BEGINNER',
            estimatedReadTimeMinutes: 5,
            contentSummary: 'S',
          },
        },
      ];

      vi.mocked(TraineeCampaignRepository.findAccessibleCampaignAssignment).mockResolvedValueOnce(
        createBaseDetailAssignment(items) as unknown as Awaited<
          ReturnType<typeof TraineeCampaignRepository.findAccessibleCampaignAssignment>
        >,
      );

      const result = await getTraineeCampaignDetail(userId, campaignId);
      const openabilityMap = new Map(result.items.map((i) => [i.campaignItemId, i.isOpenable]));

      expect(openabilityMap.get(makeUuid(30))).toBe(true);
      expect(openabilityMap.get(makeUuid(32))).toBe(false);
      expect(openabilityMap.get(makeUuid(34))).toBe(true);
      expect(openabilityMap.get(makeUuid(36))).toBe(false);
      expect(openabilityMap.get(makeUuid(38))).toBe(true);
      expect(openabilityMap.get(makeUuid(40))).toBe(false);
      expect(openabilityMap.get(makeUuid(42))).toBe(false);
      expect(openabilityMap.get(makeUuid(44))).toBe(false);
    });

    it('derives progress status precedence correctly for training, quiz, and simulation components', async () => {
      const trainCompItemId = makeUuid(50);
      const trainViewItemId = makeUuid(51);
      const quizSubItemId = makeUuid(52);
      const quizProgItemId = makeUuid(53);
      const simClassItemId = makeUuid(54);
      const simInterItemId = makeUuid(55);
      const simViewItemId = makeUuid(56);
      const unstartedItemId = makeUuid(57);

      const items = [
        {
          id: trainCompItemId,
          campaignId,
          parentGroupId: null,
          itemType: 'COMPONENT',
          componentType: 'TRAINING_DOCUMENT',
          title: 'Training Completed',
          position: 1,
          isRequired: true,
          availabilityStatus: 'AVAILABLE',
          trainingDocument: {
            id: makeUuid(60),
            title: 'T',
            status: 'AVAILABLE',
            difficultyLevel: 'BEGINNER',
            estimatedReadTimeMinutes: 5,
            contentSummary: 'S',
          },
        },
        {
          id: trainViewItemId,
          campaignId,
          parentGroupId: null,
          itemType: 'COMPONENT',
          componentType: 'TRAINING_DOCUMENT',
          title: 'Training Viewed',
          position: 2,
          isRequired: true,
          availabilityStatus: 'AVAILABLE',
          trainingDocument: {
            id: makeUuid(61),
            title: 'T',
            status: 'AVAILABLE',
            difficultyLevel: 'BEGINNER',
            estimatedReadTimeMinutes: 5,
            contentSummary: 'S',
          },
        },
        {
          id: quizSubItemId,
          campaignId,
          parentGroupId: null,
          itemType: 'COMPONENT',
          componentType: 'QUIZ',
          title: 'Quiz Submitted',
          position: 3,
          isRequired: true,
          availabilityStatus: 'AVAILABLE',
          quiz: {
            id: makeUuid(62),
            title: 'Q',
            status: 'PUBLISHED',
            difficultyLevel: 'BEGINNER',
            passThresholdPercentage: 70,
            _count: { questions: 2 },
          },
        },
        {
          id: quizProgItemId,
          campaignId,
          parentGroupId: null,
          itemType: 'COMPONENT',
          componentType: 'QUIZ',
          title: 'Quiz In Progress',
          position: 4,
          isRequired: true,
          availabilityStatus: 'AVAILABLE',
          quiz: {
            id: makeUuid(63),
            title: 'Q',
            status: 'PUBLISHED',
            difficultyLevel: 'BEGINNER',
            passThresholdPercentage: 70,
            _count: { questions: 2 },
          },
        },
        {
          id: simClassItemId,
          campaignId,
          parentGroupId: null,
          itemType: 'COMPONENT',
          componentType: 'SIMULATED_INBOX',
          title: 'Sim Classified',
          position: 5,
          isRequired: true,
          availabilityStatus: 'AVAILABLE',
          simulation: {
            id: makeUuid(64),
            title: 'S',
            safetyStatus: 'APPROVED',
            simulatedInbox: { status: 'ACTIVE' },
            difficultyLevel: 'BEGINNER',
          },
        },
        {
          id: simInterItemId,
          campaignId,
          parentGroupId: null,
          itemType: 'COMPONENT',
          componentType: 'SIMULATED_INBOX',
          title: 'Sim Interacted',
          position: 6,
          isRequired: true,
          availabilityStatus: 'AVAILABLE',
          simulation: {
            id: makeUuid(65),
            title: 'S',
            safetyStatus: 'APPROVED',
            simulatedInbox: { status: 'ACTIVE' },
            difficultyLevel: 'BEGINNER',
          },
        },
        {
          id: simViewItemId,
          campaignId,
          parentGroupId: null,
          itemType: 'COMPONENT',
          componentType: 'SIMULATED_INBOX',
          title: 'Sim Viewed',
          position: 7,
          isRequired: true,
          availabilityStatus: 'AVAILABLE',
          simulation: {
            id: makeUuid(66),
            title: 'S',
            safetyStatus: 'APPROVED',
            simulatedInbox: { status: 'ACTIVE' },
            difficultyLevel: 'BEGINNER',
          },
        },
        {
          id: unstartedItemId,
          campaignId,
          parentGroupId: null,
          itemType: 'COMPONENT',
          componentType: 'TRAINING_DOCUMENT',
          title: 'Unstarted',
          position: 8,
          isRequired: true,
          availabilityStatus: 'AVAILABLE',
          trainingDocument: {
            id: makeUuid(67),
            title: 'T',
            status: 'AVAILABLE',
            difficultyLevel: 'BEGINNER',
            estimatedReadTimeMinutes: 5,
            contentSummary: 'S',
          },
        },
      ];

      vi.mocked(TraineeCampaignRepository.findAccessibleCampaignAssignment).mockResolvedValueOnce(
        createBaseDetailAssignment(items) as unknown as Awaited<
          ReturnType<typeof TraineeCampaignRepository.findAccessibleCampaignAssignment>
        >,
      );

      vi.mocked(TraineeCampaignRepository.findTrainingInteractionEvents).mockResolvedValueOnce([
        { campaignItemId: trainCompItemId, eventType: 'TRAINING_VIEWED' },
        { campaignItemId: trainCompItemId, eventType: 'TRAINING_COMPLETED' },
        { campaignItemId: trainViewItemId, eventType: 'TRAINING_VIEWED' },
        { campaignItemId: null, eventType: 'TRAINING_VIEWED' },
      ]);

      vi.mocked(TraineeCampaignRepository.findQuizAttempts).mockResolvedValueOnce([
        { campaignItemId: quizSubItemId, status: 'IN_PROGRESS', quizResult: null },
        {
          campaignItemId: quizSubItemId,
          status: 'SUBMITTED',
          quizResult: { id: makeUuid(90), scorePercentage: 85 },
        },
        { campaignItemId: quizProgItemId, status: 'IN_PROGRESS', quizResult: null },
        { campaignItemId: null, status: 'IN_PROGRESS', quizResult: null },
      ]);

      vi.mocked(TraineeCampaignRepository.findSimulationInteractionEvents).mockResolvedValueOnce([
        {
          campaignItemId: simClassItemId,
          eventType: 'SIMULATED_EMAIL_CLASSIFIED',
          targetId: makeUuid(91),
          simulatedEmailId: makeUuid(91),
        },
        {
          campaignItemId: simInterItemId,
          eventType: 'SIMULATED_EMAIL_LINK_CLICKED',
          targetId: makeUuid(92),
          simulatedEmailId: makeUuid(92),
        },
        {
          campaignItemId: simViewItemId,
          eventType: 'SIMULATED_EMAIL_OPENED',
          targetId: makeUuid(93),
          simulatedEmailId: makeUuid(93),
        },
        {
          campaignItemId: null,
          eventType: 'SIMULATED_EMAIL_OPENED',
          targetId: makeUuid(94),
          simulatedEmailId: makeUuid(94),
        },
      ]);

      vi.mocked(TraineeCampaignRepository.findEmailClassificationResponses).mockResolvedValueOnce([
        { campaignItemId: simClassItemId },
      ]);

      const result = await getTraineeCampaignDetail(userId, campaignId);
      const progressMap = new Map(
        result.items.map((i) => [
          i.campaignItemId,
          (i as { progressStatus?: string }).progressStatus,
        ]),
      );

      expect(progressMap.get(trainCompItemId)).toBe('COMPLETED');
      expect(progressMap.get(trainViewItemId)).toBe('VIEWED');
      expect(progressMap.get(quizSubItemId)).toBe('SUBMITTED');
      expect(progressMap.get(quizProgItemId)).toBe('IN_PROGRESS');
      expect(progressMap.get(simClassItemId)).toBe('CLASSIFIED');
      expect(progressMap.get(simInterItemId)).toBe('INTERACTED');
      expect(progressMap.get(simViewItemId)).toBe('VIEWED');
      expect(progressMap.get(unstartedItemId)).toBe('NOT_STARTED');
    });

    it('handles simulation credential submission attempted event as INTERACTED status', async () => {
      const simCredItemId = makeUuid(70);
      const items = [
        {
          id: simCredItemId,
          campaignId,
          parentGroupId: null,
          itemType: 'COMPONENT',
          componentType: 'SIMULATED_INBOX',
          title: 'Sim Credential Submission',
          position: 1,
          isRequired: true,
          availabilityStatus: 'AVAILABLE',
          simulation: {
            id: makeUuid(71),
            title: 'S',
            safetyStatus: 'APPROVED',
            simulatedInbox: { status: 'ACTIVE' },
            difficultyLevel: 'BEGINNER',
          },
        },
      ];

      vi.mocked(TraineeCampaignRepository.findAccessibleCampaignAssignment).mockResolvedValueOnce(
        createBaseDetailAssignment(items) as unknown as Awaited<
          ReturnType<typeof TraineeCampaignRepository.findAccessibleCampaignAssignment>
        >,
      );

      vi.mocked(TraineeCampaignRepository.findSimulationInteractionEvents).mockResolvedValueOnce([
        {
          campaignItemId: simCredItemId,
          eventType: 'CREDENTIAL_SUBMISSION_ATTEMPTED',
          targetId: makeUuid(95),
          simulatedEmailId: makeUuid(95),
        },
      ]);

      const result = await getTraineeCampaignDetail(userId, campaignId);
      const credItem = result.items[0] as { progressStatus?: string };
      expect(credItem.progressStatus).toBe('INTERACTED');
    });

    it('marks simulated inbox as COMPLETED only when all distinct emails are opened', async () => {
      const simItemId = makeUuid(80);
      const email1Id = makeUuid(81);
      const email2Id = makeUuid(82);

      const items = [
        {
          id: simItemId,
          campaignId,
          parentGroupId: null,
          itemType: 'COMPONENT',
          componentType: 'SIMULATED_INBOX',
          title: 'Simulated Inbox Exercise',
          position: 1,
          isRequired: true,
          availabilityStatus: 'AVAILABLE',
          simulation: {
            id: makeUuid(83),
            title: 'Simulation',
            safetyStatus: 'APPROVED',
            simulatedInbox: {
              status: 'ACTIVE',
              emails: [{ id: email1Id }, { id: email2Id }],
            },
            difficultyLevel: 'BEGINNER',
          },
        },
      ];

      vi.mocked(TraineeCampaignRepository.findAccessibleCampaignAssignment).mockResolvedValueOnce(
        createBaseDetailAssignment(items) as unknown as Awaited<
          ReturnType<typeof TraineeCampaignRepository.findAccessibleCampaignAssignment>
        >,
      );

      vi.mocked(TraineeCampaignRepository.findSimulationInteractionEvents).mockResolvedValueOnce([
        {
          campaignItemId: simItemId,
          eventType: 'SIMULATED_EMAIL_OPENED',
          targetId: email1Id,
          simulatedEmailId: email1Id,
        },
      ]);

      const partialResult = await getTraineeCampaignDetail(userId, campaignId);
      const partialItem = partialResult.items[0] as { progressStatus?: string };
      expect(partialItem.progressStatus).toBe('VIEWED');
      expect(partialResult.progressStatus).toBe('IN_PROGRESS');

      vi.mocked(TraineeCampaignRepository.findAccessibleCampaignAssignment).mockResolvedValueOnce(
        createBaseDetailAssignment(items) as unknown as Awaited<
          ReturnType<typeof TraineeCampaignRepository.findAccessibleCampaignAssignment>
        >,
      );

      vi.mocked(TraineeCampaignRepository.findSimulationInteractionEvents).mockResolvedValueOnce([
        {
          campaignItemId: simItemId,
          eventType: 'SIMULATED_EMAIL_OPENED',
          targetId: email1Id,
          simulatedEmailId: email1Id,
        },
        {
          campaignItemId: simItemId,
          eventType: 'SIMULATED_EMAIL_OPENED',
          targetId: email2Id,
          simulatedEmailId: email2Id,
        },
      ]);

      const fullResult = await getTraineeCampaignDetail(userId, campaignId);
      const fullItem = fullResult.items[0] as { progressStatus?: string };
      expect(fullItem.progressStatus).toBe('COMPLETED');
      expect(fullResult.progressStatus).toBe('COMPLETED');
    });

    it('marks quiz as SUBMITTED only when attempt has an authoritative quizResult', async () => {
      const quizItemId = makeUuid(84);
      const items = [
        {
          id: quizItemId,
          campaignId,
          parentGroupId: null,
          itemType: 'COMPONENT',
          componentType: 'QUIZ',
          title: 'Quiz Item',
          position: 1,
          isRequired: true,
          availabilityStatus: 'AVAILABLE',
          quiz: {
            id: makeUuid(85),
            title: 'Quiz',
            passThresholdPercentage: 80,
            difficultyLevel: 'BEGINNER',
            status: 'PUBLISHED',
            _count: { questions: 5 },
          },
        },
      ];

      vi.mocked(TraineeCampaignRepository.findAccessibleCampaignAssignment).mockResolvedValueOnce(
        createBaseDetailAssignment(items) as unknown as Awaited<
          ReturnType<typeof TraineeCampaignRepository.findAccessibleCampaignAssignment>
        >,
      );

      vi.mocked(TraineeCampaignRepository.findQuizAttempts).mockResolvedValueOnce([
        {
          campaignItemId: quizItemId,
          status: 'SUBMITTED',
          quizResult: null,
        },
      ]);

      const uncalculatedResult = await getTraineeCampaignDetail(userId, campaignId);
      const uncalculatedItem = uncalculatedResult.items[0] as { progressStatus?: string };
      expect(uncalculatedItem.progressStatus).toBe('IN_PROGRESS');

      vi.mocked(TraineeCampaignRepository.findAccessibleCampaignAssignment).mockResolvedValueOnce(
        createBaseDetailAssignment(items) as unknown as Awaited<
          ReturnType<typeof TraineeCampaignRepository.findAccessibleCampaignAssignment>
        >,
      );

      vi.mocked(TraineeCampaignRepository.findQuizAttempts).mockResolvedValueOnce([
        {
          campaignItemId: quizItemId,
          status: 'SUBMITTED',
          quizResult: { id: makeUuid(86), scorePercentage: 90 },
        },
      ]);

      const calculatedResult = await getTraineeCampaignDetail(userId, campaignId);
      const calculatedItem = calculatedResult.items[0] as { progressStatus?: string };
      expect(calculatedItem.progressStatus).toBe('SUBMITTED');
    });

    it('evaluates COMPLETE_ALL group progress and campaign progress based on child items', async () => {
      const groupId = makeUuid(87);
      const docItemId = makeUuid(88);
      const quizItemId = makeUuid(89);

      const items = [
        {
          id: groupId,
          campaignId,
          parentGroupId: null,
          itemType: 'GROUP',
          groupType: 'MODULE',
          completionRule: 'COMPLETE_ALL',
          title: 'Module Group',
          position: 1,
          isRequired: true,
          availabilityStatus: 'AVAILABLE',
        },
        {
          id: docItemId,
          campaignId,
          parentGroupId: groupId,
          itemType: 'COMPONENT',
          componentType: 'TRAINING_DOCUMENT',
          title: 'Training Doc',
          position: 1,
          isRequired: true,
          availabilityStatus: 'AVAILABLE',
          trainingDocument: {
            id: makeUuid(91),
            title: 'Doc',
            difficultyLevel: 'BEGINNER',
            status: 'AVAILABLE',
          },
        },
        {
          id: quizItemId,
          campaignId,
          parentGroupId: groupId,
          itemType: 'COMPONENT',
          componentType: 'QUIZ',
          title: 'Module Quiz',
          position: 2,
          isRequired: true,
          availabilityStatus: 'AVAILABLE',
          quiz: {
            id: makeUuid(92),
            title: 'Quiz',
            passThresholdPercentage: 80,
            difficultyLevel: 'BEGINNER',
            status: 'PUBLISHED',
            _count: { questions: 3 },
          },
        },
      ];

      vi.mocked(TraineeCampaignRepository.findAccessibleCampaignAssignment).mockResolvedValueOnce(
        createBaseDetailAssignment(items) as unknown as Awaited<
          ReturnType<typeof TraineeCampaignRepository.findAccessibleCampaignAssignment>
        >,
      );

      const notStartedResult = await getTraineeCampaignDetail(userId, campaignId);
      expect(notStartedResult.progressStatus).toBe('NOT_STARTED');
      expect((notStartedResult.items[0] as { progressStatus?: string }).progressStatus).toBe(
        'NOT_STARTED',
      );

      vi.mocked(TraineeCampaignRepository.findAccessibleCampaignAssignment).mockResolvedValueOnce(
        createBaseDetailAssignment(items) as unknown as Awaited<
          ReturnType<typeof TraineeCampaignRepository.findAccessibleCampaignAssignment>
        >,
      );

      vi.mocked(TraineeCampaignRepository.findTrainingInteractionEvents).mockResolvedValueOnce([
        { campaignItemId: docItemId, eventType: 'TRAINING_COMPLETED' },
      ]);

      const inProgressResult = await getTraineeCampaignDetail(userId, campaignId);
      expect(inProgressResult.progressStatus).toBe('IN_PROGRESS');
      expect((inProgressResult.items[0] as { progressStatus?: string }).progressStatus).toBe(
        'IN_PROGRESS',
      );

      vi.mocked(TraineeCampaignRepository.findAccessibleCampaignAssignment).mockResolvedValueOnce(
        createBaseDetailAssignment(items) as unknown as Awaited<
          ReturnType<typeof TraineeCampaignRepository.findAccessibleCampaignAssignment>
        >,
      );

      vi.mocked(TraineeCampaignRepository.findTrainingInteractionEvents).mockResolvedValueOnce([
        { campaignItemId: docItemId, eventType: 'TRAINING_COMPLETED' },
      ]);
      vi.mocked(TraineeCampaignRepository.findQuizAttempts).mockResolvedValueOnce([
        {
          campaignItemId: quizItemId,
          status: 'SUBMITTED',
          quizResult: { id: makeUuid(93), scorePercentage: 100 },
        },
      ]);

      const completedResult = await getTraineeCampaignDetail(userId, campaignId);
      expect(completedResult.progressStatus).toBe('COMPLETED');
      expect((completedResult.items[0] as { progressStatus?: string }).progressStatus).toBe(
        'COMPLETED',
      );
    });
  });

  describe('listPlatformCampaigns', () => {
    it('returns discoverable platform campaigns with mapped items and pagination', async () => {
      vi.mocked(
        CampaignAssignmentRepository.findPlatformCampaignsForDiscovery,
      ).mockResolvedValueOnce({
        items: [
          {
            id: campaignId,
            name: 'Platform Awareness',
            description: 'Safe summary',
            accentColor: '#10B981',
            campaignType: 'PREMADE_GENERAL',
            difficultyLevel: 'BEGINNER',
            status: 'ACTIVE',
            startDate: new Date('2026-05-16T08:00:00.000Z'),
            endDate: null,
            items: [
              { id: makeUuid(80), availabilityStatus: 'AVAILABLE' },
              { id: makeUuid(81), availabilityStatus: 'LOCKED' },
            ],
            assignment: null,
          },
        ],
        total: 1,
      });

      const result = await listPlatformCampaigns(userId, { page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        campaignId,
        name: 'Platform Awareness',
        campaignType: 'PREMADE_GENERAL',
        status: 'ACTIVE',
        isEnrolled: false,
        assignment: null,
        accessType: null,
        itemCount: 2,
        availableItemCount: 1,
        eligibility: {
          canView: true,
          canProgress: true,
          reason: 'AVAILABLE',
        },
      });
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('maps assignment details and isEnrolled true when trainee is already enrolled', async () => {
      vi.mocked(
        CampaignAssignmentRepository.findPlatformCampaignsForDiscovery,
      ).mockResolvedValueOnce({
        items: [
          {
            id: campaignId,
            name: 'Platform Awareness',
            description: 'Safe summary',
            accentColor: '#10B981',
            campaignType: 'PREMADE_GENERAL',
            difficultyLevel: 'BEGINNER',
            status: 'ACTIVE',
            startDate: new Date('2026-05-16T08:00:00.000Z'),
            endDate: null,
            items: [{ id: makeUuid(80), availabilityStatus: 'AVAILABLE' }],
            assignment: {
              id: assignmentId,
              assignmentStatus: 'ASSIGNED',
              accessType: 'SELF_SELECTED',
              currentCampaignItemId: null,
              assignedAt: new Date('2026-05-16T08:00:00.000Z'),
              dueDate: null,
              startedAt: null,
              completedAt: null,
            },
          },
        ],
        total: 1,
      });

      const result = await listPlatformCampaigns(userId, { page: 1, limit: 10 });

      expect(result.items[0].isEnrolled).toBe(true);
      expect(result.items[0].accessType).toBe('SELF_SELECTED');
      expect(result.items[0].assignment).toMatchObject({
        assignmentId,
        accessType: 'SELF_SELECTED',
        assignmentStatus: 'ASSIGNED',
      });
    });

    it('returns empty pagination structure when total is 0', async () => {
      vi.mocked(
        CampaignAssignmentRepository.findPlatformCampaignsForDiscovery,
      ).mockResolvedValueOnce({
        items: [],
        total: 0,
      });

      const result = await listPlatformCampaigns(userId, { page: 1, limit: 10 });

      expect(result.items).toHaveLength(0);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('computes hasNextPage and hasPreviousPage accurately across multiple pages', async () => {
      const page2CampId = makeUuid(82);
      vi.mocked(
        CampaignAssignmentRepository.findPlatformCampaignsForDiscovery,
      ).mockResolvedValueOnce({
        items: [
          {
            id: page2CampId,
            name: 'Page 2 Campaign',
            description: 'Desc',
            accentColor: '#10B981',
            campaignType: 'PREMADE_GENERAL',
            difficultyLevel: 'BEGINNER',
            status: 'ACTIVE',
            startDate: null,
            endDate: null,
            items: [],
            assignment: null,
          },
        ],
        total: 25,
      });

      const result = await listPlatformCampaigns(userId, { page: 2, limit: 10 });

      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        totalItems: 25,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      });
    });

    it('throws TraineeCampaignForbiddenError when actor is missing', async () => {
      vi.mocked(CampaignAssignmentRepository.findGeneralTraineeActorScope).mockResolvedValueOnce(
        null,
      );

      await expect(listPlatformCampaigns(userId, { page: 1, limit: 10 })).rejects.toThrow(
        'User is not active',
      );
    });

    it('throws TraineeCampaignForbiddenError when user authStatus is not ACTIVE', async () => {
      vi.mocked(CampaignAssignmentRepository.findGeneralTraineeActorScope).mockResolvedValueOnce({
        ...validActorScope,
        authStatus: 'PENDING_INVITE_SETUP',
      });

      await expect(listPlatformCampaigns(userId, { page: 1, limit: 10 })).rejects.toThrow(
        'User is not active',
      );
    });

    it('throws TraineeCampaignForbiddenError when userType is not GENERAL_TRAINEE', async () => {
      vi.mocked(CampaignAssignmentRepository.findGeneralTraineeActorScope).mockResolvedValueOnce({
        ...validActorScope,
        userType: 'ORGANISATION_TRAINEE',
        traineeProfile: {
          id: traineeProfileId,
          traineeStatus: 'ACTIVE',
          generalTraineeProfile: null,
        },
      });

      await expect(listPlatformCampaigns(userId, { page: 1, limit: 10 })).rejects.toThrow(
        'Only general trainees can access this resource',
      );
    });

    it('throws TraineeCampaignForbiddenError when generalTraineeProfile is missing', async () => {
      vi.mocked(CampaignAssignmentRepository.findGeneralTraineeActorScope).mockResolvedValueOnce({
        ...validActorScope,
        traineeProfile: {
          id: traineeProfileId,
          traineeStatus: 'ACTIVE',
          generalTraineeProfile: null,
        },
      });

      await expect(listPlatformCampaigns(userId, { page: 1, limit: 10 })).rejects.toThrow(
        'Only general trainees can access this resource',
      );
    });

    it('throws TraineeCampaignForbiddenError when traineeStatus is INACTIVE', async () => {
      vi.mocked(CampaignAssignmentRepository.findGeneralTraineeActorScope).mockResolvedValueOnce({
        ...validActorScope,
        traineeProfile: {
          id: traineeProfileId,
          traineeStatus: 'INACTIVE',
          generalTraineeProfile: { id: 'g-1', accessSource: 'SELF_SIGNUP' },
        },
      });

      await expect(listPlatformCampaigns(userId, { page: 1, limit: 10 })).rejects.toThrow(
        'Trainee profile is inactive',
      );
    });
  });

  describe('enrolPlatformCampaign', () => {
    const activeCampaignFixture = {
      id: campaignId,
      name: 'Platform Awareness',
      description: 'Premade platform training',
      accentColor: '#10B981',
      campaignType: 'PREMADE_GENERAL',
      difficultyLevel: 'BEGINNER',
      status: 'ACTIVE',
      startDate: new Date('2026-05-16T08:00:00.000Z'),
      endDate: null,
      items: [{ id: makeUuid(90), availabilityStatus: 'AVAILABLE' }],
    };

    it('creates and returns SELF_SELECTED campaign assignment for active general trainee', async () => {
      vi.mocked(
        CampaignAssignmentRepository.enrolGeneralTraineeInPlatformCampaign,
      ).mockResolvedValueOnce({
        success: true,
        isNew: true,
        assignment: {
          id: assignmentId,
          campaignId,
          traineeProfileId,
          assignmentStatus: 'ASSIGNED',
          accessType: 'SELF_SELECTED',
          currentCampaignItemId: null,
          assignedAt: new Date('2026-05-16T08:00:00.000Z'),
          dueDate: null,
          startedAt: null,
          completedAt: null,
        },
        campaign: activeCampaignFixture,
      });

      const result = await enrolPlatformCampaign(userId, campaignId);

      expect(result).toMatchObject({
        campaignId,
        name: 'Platform Awareness',
        campaignType: 'PREMADE_GENERAL',
        status: 'ACTIVE',
        accessType: 'SELF_SELECTED',
        assignment: {
          assignmentId,
          accessType: 'SELF_SELECTED',
          assignmentStatus: 'ASSIGNED',
        },
        itemCount: 1,
        availableItemCount: 1,
        eligibility: {
          canView: true,
          canProgress: true,
          reason: 'AVAILABLE',
        },
      });
    });

    it('returns existing assignment idempotently without error', async () => {
      vi.mocked(
        CampaignAssignmentRepository.enrolGeneralTraineeInPlatformCampaign,
      ).mockResolvedValueOnce({
        success: true,
        isNew: false,
        assignment: {
          id: assignmentId,
          campaignId,
          traineeProfileId,
          assignmentStatus: 'IN_PROGRESS',
          accessType: 'SELF_SELECTED',
          currentCampaignItemId: makeUuid(91),
          assignedAt: new Date('2026-05-16T08:00:00.000Z'),
          dueDate: null,
          startedAt: new Date('2026-05-16T08:30:00.000Z'),
          completedAt: null,
        },
        campaign: activeCampaignFixture,
      });

      const result = await enrolPlatformCampaign(userId, campaignId);

      expect(result.assignment).toMatchObject({
        assignmentId,
        assignmentStatus: 'IN_PROGRESS',
        accessType: 'SELF_SELECTED',
      });
    });

    it('preserves existing ASSIGNED accessType when self-enrol is called', async () => {
      vi.mocked(
        CampaignAssignmentRepository.enrolGeneralTraineeInPlatformCampaign,
      ).mockResolvedValueOnce({
        success: true,
        isNew: false,
        assignment: {
          id: assignmentId,
          campaignId,
          traineeProfileId,
          assignmentStatus: 'ASSIGNED',
          accessType: 'ASSIGNED',
          currentCampaignItemId: null,
          assignedAt: new Date('2026-05-16T08:00:00.000Z'),
          dueDate: null,
          startedAt: null,
          completedAt: null,
        },
        campaign: activeCampaignFixture,
      });

      const result = await enrolPlatformCampaign(userId, campaignId);

      expect(result.accessType).toBe('ASSIGNED');
      expect(result.assignment?.accessType).toBe('ASSIGNED');
    });

    it('throws TraineeCampaignNotFoundError when campaign is not found', async () => {
      vi.mocked(
        CampaignAssignmentRepository.enrolGeneralTraineeInPlatformCampaign,
      ).mockResolvedValueOnce({
        success: false,
        error: 'CAMPAIGN_NOT_FOUND',
        message: 'Platform campaign was not found',
      });

      await expect(enrolPlatformCampaign(userId, campaignId)).rejects.toThrow(
        TraineeCampaignNotFoundError,
      );
    });

    it('throws TraineeCampaignForbiddenError when trainee is not eligible', async () => {
      vi.mocked(
        CampaignAssignmentRepository.enrolGeneralTraineeInPlatformCampaign,
      ).mockResolvedValueOnce({
        success: false,
        error: 'TRAINEE_NOT_ELIGIBLE',
        message: 'Trainee is not an active general trainee',
      });

      await expect(enrolPlatformCampaign(userId, campaignId)).rejects.toThrow(
        TraineeCampaignForbiddenError,
      );
    });

    it('throws CampaignEligibilityDenialError when campaign is inactive', async () => {
      vi.mocked(
        CampaignAssignmentRepository.enrolGeneralTraineeInPlatformCampaign,
      ).mockResolvedValueOnce({
        success: false,
        error: 'CAMPAIGN_INACTIVE',
        message: 'Campaign is not active',
      });

      await expect(enrolPlatformCampaign(userId, campaignId)).rejects.toThrow(
        CampaignEligibilityDenialError,
      );
    });

    it('throws TraineeCampaignNotFoundError for unknown repository failure', async () => {
      vi.mocked(
        CampaignAssignmentRepository.enrolGeneralTraineeInPlatformCampaign,
      ).mockResolvedValueOnce({
        success: false,
        error: 'UNKNOWN_FAILURE' as unknown as 'CAMPAIGN_NOT_FOUND',
        message: 'Unexpected failure',
      });

      await expect(enrolPlatformCampaign(userId, campaignId)).rejects.toThrow(
        TraineeCampaignNotFoundError,
      );
    });
  });
});

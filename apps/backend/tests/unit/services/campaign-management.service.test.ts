import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as CampaignManagementService from '../../../src/services/campaign-management.service.js';
import * as CampaignManagementRepository from '../../../src/repositories/campaign-management.repository.js';
import * as CampaignStatisticsRepository from '../../../src/repositories/campaign-statistics.repository.js';
import * as OrganisationScopeRepository from '../../../src/repositories/organisation-scope.repository.js';
import { getCampaignStatisticsResponseSchema } from '@insightful-phish/shared';

vi.mock('../../../src/repositories/campaign-management.repository.js');
vi.mock('../../../src/repositories/campaign-statistics.repository.js');
vi.mock('../../../src/repositories/organisation-scope.repository.js');

describe('CampaignManagementService Unit Tests', () => {
  const adminActor: CampaignManagementService.UserActorContext = {
    userId: 'user-admin-1',
    userType: 'ORGANISATION_ADMIN',
  };

  const platformActor: CampaignManagementService.UserActorContext = {
    userId: 'user-ip-1',
    userType: 'IP_ADMIN',
  };

  const orgId = 'org-123';

  function mockAdminScope(permissionKeys: string[]) {
    vi.mocked(OrganisationScopeRepository.findOrganisationAdminActorScope).mockResolvedValue({
      id: 'admin-prof-1',
      userId: adminActor.userId,
      organisationId: orgId,
      adminStatus: 'ACTIVE',
      organisation: { id: orgId, name: 'Test Org', status: 'ACTIVE' },
      permissionGrants: permissionKeys.map((key) => ({
        organisationPermission: { key },
      })),
    } as unknown as Awaited<
      ReturnType<typeof OrganisationScopeRepository.findOrganisationAdminActorScope>
    >);
  }

  function makeItem(
    id: string,
    itemType: 'COMPONENT' | 'GROUP',
    componentType: 'TRAINING_DOCUMENT' | 'QUIZ' | 'SIMULATED_INBOX' | null,
    isRequired = true,
    extra: { docId?: string; quizId?: string; emailIds?: string[] } = {},
  ): CampaignStatisticsRepository.CampaignItemFact {
    return {
      id,
      itemType,
      componentType,
      isRequired,
      trainingDocumentId: extra.docId ?? null,
      quizId: extra.quizId ?? null,
      simulationId: componentType === 'SIMULATED_INBOX' ? 'sim-ref' : null,
      simulatedInboxEmailIds: extra.emailIds ?? [],
    };
  }

  function makeAssignment(
    assignmentId: string,
    traineeProfileId: string,
    firstName: string,
    lastName: string,
    email: string,
    traineeStatus: 'ACTIVE' | 'DISABLED' | 'INACTIVE' = 'ACTIVE',
    assignmentStatus: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' = 'IN_PROGRESS',
    accessType: 'ASSIGNED' | 'SELF_SELECTED' = 'ASSIGNED',
  ): CampaignStatisticsRepository.CampaignStatisticsAssignmentEntity {
    return {
      assignmentId,
      traineeProfileId,
      firstName,
      lastName,
      email,
      traineeStatus,
      assignmentStatus,
      accessType,
      assignedAt: new Date('2026-08-01T10:00:00.000Z'),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects draft creation if endDate is before startDate', async () => {
    mockAdminScope(['MANAGE_CAMPAIGNS']);

    await expect(
      CampaignManagementService.createOrganisationCampaignDraft(adminActor, orgId, {
        name: 'Invalid Date Campaign',
        accentColor: '#123456',
        startDate: '2026-06-10T10:00:00Z',
        endDate: '2026-06-01T10:00:00Z',
        items: [],
      }),
    ).rejects.toThrowError(CampaignManagementService.CampaignManagementServiceError);
  });

  it('rejects platform campaign draft if dates are provided', async () => {
    vi.mocked(OrganisationScopeRepository.findActiveIpAdminScope).mockResolvedValue({
      id: 'ip-admin-1',
      userId: platformActor.userId,
      adminStatus: 'ACTIVE',
      platformAdminRole: 'SUPER_ADMIN',
    });

    await expect(
      CampaignManagementService.createPlatformCampaignDraft(platformActor, {
        name: 'Platform Campaign with Date',
        accentColor: '#123456',
        startDate: '2026-06-01T10:00:00Z',
        items: [],
      }),
    ).rejects.toThrowError(CampaignManagementService.CampaignManagementServiceError);
  });

  it('allows organisation admin with VIEW_CAMPAIGNS to fetch campaign list', async () => {
    mockAdminScope(['VIEW_CAMPAIGNS']);

    vi.mocked(CampaignManagementRepository.findCampaigns).mockResolvedValue({
      items: [
        {
          id: 'camp-1',
          organisationId: orgId,
          name: 'Security 101',
          description: 'Basic security',
          accentColor: '#0055FF',
          campaignType: 'ORGANISATION_CUSTOM',
          status: 'DRAFT',
          itemCount: 2,
          startDate: null,
          endDate: null,
          createdBy: { id: 'u1', displayName: 'Admin User', email: 'admin@example.com' },
          createdAt: new Date(),
          updatedAt: new Date(),
          sourceFacts: [],
        },
      ],
      total: 1,
    });

    const res = await CampaignManagementService.getOrganisationCampaigns(adminActor, orgId, {
      page: 1,
      limit: 10,
    });

    expect(res.items).toHaveLength(1);
    expect(res.items[0].allowedActions).toEqual(['VIEW']);
  });

  describe('getOrganisationCampaignStatistics', () => {
    const campaignId = '22222222-2222-4222-8222-222222222222';

    it('throws 404 ORGANISATION_NOT_FOUND when admin actor is not found', async () => {
      vi.mocked(OrganisationScopeRepository.findOrganisationAdminActorScope).mockResolvedValue(
        null,
      );

      await expect(
        CampaignManagementService.getOrganisationCampaignStatistics(adminActor, orgId, campaignId, {
          page: 1,
          limit: 20,
        }),
      ).rejects.toThrow(CampaignManagementService.CampaignManagementServiceError);
    });

    it('throws 403 FORBIDDEN when admin lacks view permissions', async () => {
      mockAdminScope(['VIEW_ORGANISATION_TRAINEES']);

      await expect(
        CampaignManagementService.getOrganisationCampaignStatistics(adminActor, orgId, campaignId, {
          page: 1,
          limit: 20,
        }),
      ).rejects.toThrow(CampaignManagementService.CampaignManagementServiceError);
    });

    it('throws 404 CAMPAIGN_NOT_FOUND when campaign does not exist in organisation', async () => {
      mockAdminScope(['VIEW_CAMPAIGNS']);
      vi.mocked(CampaignStatisticsRepository.findCampaignWithItems).mockResolvedValue(null);

      await expect(
        CampaignManagementService.getOrganisationCampaignStatistics(adminActor, orgId, campaignId, {
          page: 1,
          limit: 20,
        }),
      ).rejects.toThrow(CampaignManagementService.CampaignManagementServiceError);
    });

    it('returns empty cohort response when no assignments exist', async () => {
      mockAdminScope(['VIEW_CAMPAIGNS']);
      vi.mocked(CampaignStatisticsRepository.findCampaignWithItems).mockResolvedValue({
        id: campaignId,
        name: 'Empty Cohort Campaign',
        description: null,
        campaignType: 'ORGANISATION_CUSTOM',
        status: 'ACTIVE',
        startDate: null,
        endDate: null,
        items: [],
      });
      vi.mocked(CampaignStatisticsRepository.findCampaignCohortAssignments).mockResolvedValue([]);

      const result = await CampaignManagementService.getOrganisationCampaignStatistics(
        adminActor,
        orgId,
        campaignId,
        { page: 1, limit: 20 },
      );

      expect(result.summary.assignedTraineeCount).toBe(0);
      expect(result.trainees).toEqual([]);
      expect(getCampaignStatisticsResponseSchema.safeParse(result).success).toBe(true);
    });

    it('excludes GROUP items from consumable denominator and includes optional items', async () => {
      mockAdminScope(['VIEW_CAMPAIGNS']);

      vi.mocked(CampaignStatisticsRepository.findCampaignWithItems).mockResolvedValue({
        id: campaignId,
        name: 'Mixed Items Campaign',
        description: null,
        campaignType: 'ORGANISATION_CUSTOM',
        status: 'ACTIVE',
        startDate: null,
        endDate: null,
        items: [
          makeItem('grp-1', 'GROUP', null, true),
          makeItem('c-doc-1', 'COMPONENT', 'TRAINING_DOCUMENT', true, { docId: 'doc-1' }),
          makeItem('c-quiz-opt', 'COMPONENT', 'QUIZ', false, { quizId: 'quiz-1' }),
        ],
      });

      vi.mocked(CampaignStatisticsRepository.findCampaignCohortAssignments).mockResolvedValue([
        makeAssignment(
          '55555555-0001-4555-8555-555555555555',
          '11111111-1111-4111-8111-111111111111',
          'Alice',
          'Ndlovu',
          'alice@example.com',
          'ACTIVE',
          'ASSIGNED',
        ),
      ]);

      vi.mocked(CampaignStatisticsRepository.findCampaignProgressFacts).mockResolvedValue({
        trainingEvents: [],
        quizAttempts: [],
        simulatedEmailEvents: [],
      });

      const result = await CampaignManagementService.getOrganisationCampaignStatistics(
        adminActor,
        orgId,
        campaignId,
        { page: 1, limit: 20 },
      );

      expect(result.campaign.itemCount).toBe(2);
      expect(result.campaign.quizCount).toBe(1);
      expect(result.trainees[0].progress.totalItemCount).toBe(2);
      expect(result.trainees[0].totalQuizCount).toBe(1);
    });

    it('requires authoritative quiz result for quiz completion (differentiating resultless vs score of 0)', async () => {
      mockAdminScope(['VIEW_CAMPAIGNS']);

      vi.mocked(CampaignStatisticsRepository.findCampaignWithItems).mockResolvedValue({
        id: campaignId,
        name: 'Quiz Test Campaign',
        description: null,
        campaignType: 'ORGANISATION_CUSTOM',
        status: 'ACTIVE',
        startDate: null,
        endDate: null,
        items: [makeItem('c-quiz-main', 'COMPONENT', 'QUIZ', true, { quizId: 'quiz-1' })],
      });

      const traineeBob = '11111111-1111-4111-8111-111111111111';
      const traineeCharlie = '22222222-2222-4222-8222-222222222222';

      vi.mocked(CampaignStatisticsRepository.findCampaignCohortAssignments).mockResolvedValue([
        makeAssignment(
          '55555555-0001-4555-8555-555555555551',
          traineeBob,
          'Bob',
          'Smith',
          'bob@example.com',
          'ACTIVE',
          'IN_PROGRESS',
        ),
        makeAssignment(
          '55555555-0002-4555-8555-555555555552',
          traineeCharlie,
          'Charlie',
          'Mokoena',
          'charlie@example.com',
          'ACTIVE',
          'COMPLETED',
        ),
      ]);

      vi.mocked(CampaignStatisticsRepository.findCampaignProgressFacts).mockResolvedValue({
        trainingEvents: [],
        quizAttempts: [
          {
            traineeProfileId: traineeBob,
            campaignAssignmentId: '55555555-0001-4555-8555-555555555551',
            campaignItemId: 'c-quiz-main',
            quizId: 'quiz-1',
            status: 'SUBMITTED',
            hasResult: false,
            scorePercentage: null,
          },
          {
            traineeProfileId: traineeCharlie,
            campaignAssignmentId: '55555555-0002-4555-8555-555555555552',
            campaignItemId: 'c-quiz-main',
            quizId: 'quiz-1',
            status: 'SUBMITTED',
            hasResult: true,
            scorePercentage: 0,
          },
        ],
        simulatedEmailEvents: [],
      });

      const result = await CampaignManagementService.getOrganisationCampaignStatistics(
        adminActor,
        orgId,
        campaignId,
        { page: 1, limit: 10 },
      );

      const bobRow = result.trainees.find((t) => t.traineeProfileId === traineeBob)!;
      expect(bobRow.progress.completedItemCount).toBe(0);
      expect(bobRow.completedQuizCount).toBe(0);
      expect(bobRow.averageQuizScorePercentage).toBeNull();

      const charlieRow = result.trainees.find((t) => t.traineeProfileId === traineeCharlie)!;
      expect(charlieRow.progress.completedItemCount).toBe(1);
      expect(charlieRow.completedQuizCount).toBe(1);
      expect(charlieRow.averageQuizScorePercentage).toBe(0);

      expect(result.summary.completedTraineeCount).toBe(1);
      expect(result.summary.averageQuizScorePercentage).toBe(0);
    });

    it('prevents cross-campaign activity bleed when content is reused across multiple campaigns', async () => {
      mockAdminScope(['VIEW_CAMPAIGNS']);

      const campaign1Id = '11111111-1111-4111-8111-111111111111';
      const sharedDocId = 'doc-shared-1';
      const sharedQuizId = 'quiz-shared-1';

      vi.mocked(CampaignStatisticsRepository.findCampaignWithItems).mockResolvedValue({
        id: campaign1Id,
        name: 'Campaign 1',
        description: null,
        campaignType: 'ORGANISATION_CUSTOM',
        status: 'ACTIVE',
        startDate: null,
        endDate: null,
        items: [
          makeItem('c1-item-doc', 'COMPONENT', 'TRAINING_DOCUMENT', true, { docId: sharedDocId }),
          makeItem('c1-item-quiz', 'COMPONENT', 'QUIZ', true, { quizId: sharedQuizId }),
        ],
      });

      const traineeId = '33333333-3333-4333-8333-333333333333';
      const assignment1Id = '55555555-0001-4555-8555-555555555551';
      const assignment2Id = '55555555-0002-4555-8555-555555555552';

      vi.mocked(CampaignStatisticsRepository.findCampaignCohortAssignments).mockResolvedValue([
        makeAssignment(
          assignment1Id,
          traineeId,
          'Alice',
          'Ndlovu',
          'alice@example.com',
          'ACTIVE',
          'ASSIGNED',
        ),
      ]);

      vi.mocked(CampaignStatisticsRepository.findCampaignProgressFacts).mockImplementation(
        async (input) => {
          if (input.assignmentIds.includes(assignment2Id)) {
            return {
              trainingEvents: [
                {
                  traineeProfileId: traineeId,
                  campaignAssignmentId: assignment2Id,
                  campaignItemId: 'c2-item-doc',
                  trainingDocumentId: sharedDocId,
                  eventType: 'TRAINING_COMPLETED',
                },
              ],
              quizAttempts: [
                {
                  traineeProfileId: traineeId,
                  campaignAssignmentId: assignment2Id,
                  campaignItemId: 'c2-item-quiz',
                  quizId: sharedQuizId,
                  status: 'SUBMITTED',
                  hasResult: true,
                  scorePercentage: 95,
                },
              ],
              simulatedEmailEvents: [],
            };
          }
          return {
            trainingEvents: [],
            quizAttempts: [],
            simulatedEmailEvents: [],
          };
        },
      );

      const result = await CampaignManagementService.getOrganisationCampaignStatistics(
        adminActor,
        orgId,
        campaign1Id,
        { page: 1, limit: 10 },
      );

      expect(result.summary.startedTraineeCount).toBe(0);
      expect(result.summary.completedTraineeCount).toBe(0);
      expect(result.summary.overallProgressPercentage).toBe(0);
      expect(result.summary.averageQuizScorePercentage).toBeNull();
      expect(result.trainees[0].progress.completedItemCount).toBe(0);
      expect(result.trainees[0].completedQuizCount).toBe(0);
      expect(result.trainees[0].averageQuizScorePercentage).toBeNull();
    });

    it('correctly calculates started, completed, scores, unassign actions, and pagination across full cohort', async () => {
      mockAdminScope(['VIEW_CAMPAIGNS', 'ASSIGN_CAMPAIGNS']);

      const items: CampaignStatisticsRepository.CampaignItemFact[] = [
        makeItem('i-doc', 'COMPONENT', 'TRAINING_DOCUMENT', true, { docId: 'doc-1' }),
        makeItem('i-quiz-a', 'COMPONENT', 'QUIZ', true, { quizId: 'quiz-1' }),
        makeItem('i-quiz-b', 'COMPONENT', 'QUIZ', true, { quizId: 'quiz-2' }),
        makeItem('i-sim', 'COMPONENT', 'SIMULATED_INBOX', true, { emailIds: ['em-1', 'em-2'] }),
      ];

      vi.mocked(CampaignStatisticsRepository.findCampaignWithItems).mockResolvedValue({
        id: campaignId,
        name: 'Full Campaign',
        description: 'Comprehensive Test',
        campaignType: 'ORGANISATION_CUSTOM',
        status: 'ACTIVE',
        startDate: new Date('2026-09-01T00:00:00.000Z'),
        endDate: new Date('2026-09-30T23:59:59.000Z'),
        items,
      });

      const t1 = '11111111-1111-4111-8111-111111111111';
      const t2 = '22222222-2222-4222-8222-222222222222';
      const t3 = '33333333-3333-4333-8333-333333333333';
      const t4 = '44444444-4444-4444-8444-444444444444';

      vi.mocked(CampaignStatisticsRepository.findCampaignCohortAssignments).mockResolvedValue([
        makeAssignment(
          '55555555-0001-4555-8555-555555555555',
          t1,
          'Alice',
          'Ndlovu',
          'alice@example.com',
          'ACTIVE',
          'IN_PROGRESS',
          'ASSIGNED',
        ),
        makeAssignment(
          '55555555-0002-4555-8555-555555555555',
          t2,
          'Bob',
          'Khumalo',
          'bob@example.com',
          'ACTIVE',
          'COMPLETED',
          'SELF_SELECTED',
        ),
        makeAssignment(
          '55555555-0003-4555-8555-555555555555',
          t3,
          'Charlie',
          'Smith',
          'charlie@example.com',
          'INACTIVE',
          'ASSIGNED',
          'ASSIGNED',
        ),
        makeAssignment(
          '55555555-0004-4555-8555-555555555555',
          t4,
          'Diana',
          'Zuma',
          'diana@example.com',
          'DISABLED',
          'IN_PROGRESS',
          'ASSIGNED',
        ),
      ]);

      vi.mocked(CampaignStatisticsRepository.findCampaignProgressFacts).mockResolvedValue({
        trainingEvents: [
          {
            traineeProfileId: t1,
            campaignAssignmentId: '55555555-0001-4555-8555-555555555555',
            campaignItemId: 'i-doc',
            trainingDocumentId: 'doc-1',
            eventType: 'TRAINING_VIEWED',
          },
          {
            traineeProfileId: t2,
            campaignAssignmentId: '55555555-0002-4555-8555-555555555555',
            campaignItemId: 'i-doc',
            trainingDocumentId: 'doc-1',
            eventType: 'TRAINING_COMPLETED',
          },
          {
            traineeProfileId: t4,
            campaignAssignmentId: '55555555-0004-4555-8555-555555555555',
            campaignItemId: 'i-doc',
            trainingDocumentId: 'doc-1',
            eventType: 'TRAINING_COMPLETED',
          },
        ],
        quizAttempts: [
          {
            traineeProfileId: t1,
            campaignAssignmentId: '55555555-0001-4555-8555-555555555555',
            campaignItemId: 'i-quiz-a',
            quizId: 'quiz-1',
            status: 'SUBMITTED',
            hasResult: true,
            scorePercentage: 80,
          },
          {
            traineeProfileId: t1,
            campaignAssignmentId: '55555555-0001-4555-8555-555555555555',
            campaignItemId: 'i-quiz-b',
            quizId: 'quiz-2',
            status: 'IN_PROGRESS',
            hasResult: false,
            scorePercentage: null,
          },
          {
            traineeProfileId: t2,
            campaignAssignmentId: '55555555-0002-4555-8555-555555555555',
            campaignItemId: 'i-quiz-a',
            quizId: 'quiz-1',
            status: 'SUBMITTED',
            hasResult: true,
            scorePercentage: 100,
          },
          {
            traineeProfileId: t2,
            campaignAssignmentId: '55555555-0002-4555-8555-555555555555',
            campaignItemId: 'i-quiz-b',
            quizId: 'quiz-2',
            status: 'SUBMITTED',
            hasResult: true,
            scorePercentage: 90,
          },
          {
            traineeProfileId: t4,
            campaignAssignmentId: '55555555-0004-4555-8555-555555555555',
            campaignItemId: 'i-quiz-a',
            quizId: 'quiz-1',
            status: 'SUBMITTED',
            hasResult: true,
            scorePercentage: 70,
          },
        ],
        simulatedEmailEvents: [
          {
            traineeProfileId: t1,
            campaignAssignmentId: '55555555-0001-4555-8555-555555555555',
            campaignItemId: 'i-sim',
            simulatedEmailId: 'em-1',
            targetId: 'em-1',
          },
          {
            traineeProfileId: t2,
            campaignAssignmentId: '55555555-0002-4555-8555-555555555555',
            campaignItemId: 'i-sim',
            simulatedEmailId: 'em-1',
            targetId: 'em-1',
          },
          {
            traineeProfileId: t2,
            campaignAssignmentId: '55555555-0002-4555-8555-555555555555',
            campaignItemId: 'i-sim',
            simulatedEmailId: 'em-2',
            targetId: 'em-2',
          },
        ],
      });

      const page1 = await CampaignManagementService.getOrganisationCampaignStatistics(
        adminActor,
        orgId,
        campaignId,
        { page: 1, limit: 2 },
      );

      expect(page1.summary).toEqual({
        assignedTraineeCount: 4,
        startedTraineeCount: 3,
        completedTraineeCount: 1,
        overallProgressPercentage: 44,
        averageQuizScorePercentage: 82,
      });

      expect(page1.trainees).toHaveLength(2);
      expect(page1.trainees[0].displayName).toBe('Alice Ndlovu');
      expect(page1.trainees[0].allowedActions.canUnassign).toBe(true);
      expect(page1.trainees[1].displayName).toBe('Bob Khumalo');
      expect(page1.trainees[1].allowedActions.canUnassign).toBe(false);

      const page2 = await CampaignManagementService.getOrganisationCampaignStatistics(
        adminActor,
        orgId,
        campaignId,
        { page: 2, limit: 2 },
      );

      expect(page2.summary).toEqual(page1.summary);
      expect(page2.trainees).toHaveLength(2);
      expect(page2.trainees[0].displayName).toBe('Charlie Smith');
      expect(page2.trainees[1].displayName).toBe('Diana Zuma');
      expect(page2.trainees[1].traineeStatus).toBe('DISABLED');
    });
  });
});

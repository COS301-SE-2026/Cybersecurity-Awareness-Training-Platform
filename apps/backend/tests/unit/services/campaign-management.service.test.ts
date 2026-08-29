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
      vi.mocked(CampaignStatisticsRepository.findCampaignWithConsumableItems).mockResolvedValue(
        null,
      );

      await expect(
        CampaignManagementService.getOrganisationCampaignStatistics(adminActor, orgId, campaignId, {
          page: 1,
          limit: 20,
        }),
      ).rejects.toThrow(CampaignManagementService.CampaignManagementServiceError);
    });

    it('returns empty cohort response when no assignments exist', async () => {
      mockAdminScope(['VIEW_CAMPAIGNS']);
      vi.mocked(CampaignStatisticsRepository.findCampaignWithConsumableItems).mockResolvedValue({
        id: campaignId,
        name: 'Empty Cohort Campaign',
        description: null,
        campaignType: 'ORGANISATION_CUSTOM',
        status: 'ACTIVE',
        startDate: null,
        endDate: null,
        consumableItems: [],
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

    it('correctly calculates started, completed, scores, unassign actions, and pagination across full cohort', async () => {
      mockAdminScope(['VIEW_CAMPAIGNS', 'ASSIGN_CAMPAIGNS']);

      const consumableItems: CampaignStatisticsRepository.CampaignConsumableItemSummary[] = [
        {
          id: 'item-doc-1',
          componentType: 'TRAINING_DOCUMENT',
          trainingDocumentId: 'doc-1',
          quizId: null,
          simulationId: null,
          simulatedInboxEmailIds: [],
        },
        {
          id: 'item-quiz-1',
          componentType: 'QUIZ',
          trainingDocumentId: null,
          quizId: 'quiz-1',
          simulationId: null,
          simulatedInboxEmailIds: [],
        },
        {
          id: 'item-quiz-2',
          componentType: 'QUIZ',
          trainingDocumentId: null,
          quizId: 'quiz-2',
          simulationId: null,
          simulatedInboxEmailIds: [],
        },
        {
          id: 'item-sim-1',
          componentType: 'SIMULATED_INBOX',
          trainingDocumentId: null,
          quizId: null,
          simulationId: 'sim-1',
          simulatedInboxEmailIds: ['email-1', 'email-2'],
        },
      ];

      vi.mocked(CampaignStatisticsRepository.findCampaignWithConsumableItems).mockResolvedValue({
        id: campaignId,
        name: 'Full Campaign',
        description: 'Comprehensive Test',
        campaignType: 'ORGANISATION_CUSTOM',
        status: 'ACTIVE',
        startDate: new Date('2026-09-01T00:00:00.000Z'),
        endDate: new Date('2026-09-30T23:59:59.000Z'),
        consumableItems,
      });

      const trainee1Id = '11111111-1111-4111-8111-111111111111';
      const trainee2Id = '22222222-2222-4222-8222-222222222222';
      const trainee3Id = '33333333-3333-4333-8333-333333333333';
      const trainee4Id = '44444444-4444-4444-8444-444444444444';

      vi.mocked(CampaignStatisticsRepository.findCampaignCohortAssignments).mockResolvedValue([
        {
          assignmentId: '55555555-0001-4555-8555-555555555555',
          traineeProfileId: trainee1Id,
          firstName: 'Alice',
          lastName: 'Ndlovu',
          email: 'alice@example.com',
          traineeStatus: 'ACTIVE',
          assignmentStatus: 'IN_PROGRESS',
          accessType: 'ASSIGNED',
          assignedAt: new Date('2026-08-01T10:00:00.000Z'),
        },
        {
          assignmentId: '55555555-0002-4555-8555-555555555555',
          traineeProfileId: trainee2Id,
          firstName: 'Bob',
          lastName: 'Khumalo',
          email: 'bob@example.com',
          traineeStatus: 'ACTIVE',
          assignmentStatus: 'COMPLETED',
          accessType: 'SELF_SELECTED',
          assignedAt: new Date('2026-08-02T10:00:00.000Z'),
        },
        {
          assignmentId: '55555555-0003-4555-8555-555555555555',
          traineeProfileId: trainee3Id,
          firstName: 'Charlie',
          lastName: 'Smith',
          email: 'charlie@example.com',
          traineeStatus: 'INACTIVE',
          assignmentStatus: 'ASSIGNED',
          accessType: 'ASSIGNED',
          assignedAt: new Date('2026-08-03T10:00:00.000Z'),
        },
        {
          assignmentId: '55555555-0004-4555-8555-555555555555',
          traineeProfileId: trainee4Id,
          firstName: 'Diana',
          lastName: 'Zuma',
          email: 'diana@example.com',
          traineeStatus: 'DISABLED',
          assignmentStatus: 'IN_PROGRESS',
          accessType: 'ASSIGNED',
          assignedAt: new Date('2026-08-04T10:00:00.000Z'),
        },
      ]);

      vi.mocked(CampaignStatisticsRepository.findCampaignProgressFacts).mockResolvedValue({
        trainingEvents: [
          {
            traineeProfileId: trainee1Id,
            campaignAssignmentId: '55555555-0001-4555-8555-555555555555',
            campaignItemId: 'item-doc-1',
            trainingDocumentId: 'doc-1',
            eventType: 'TRAINING_VIEWED',
          },
          {
            traineeProfileId: trainee2Id,
            campaignAssignmentId: '55555555-0002-4555-8555-555555555555',
            campaignItemId: 'item-doc-1',
            trainingDocumentId: 'doc-1',
            eventType: 'TRAINING_COMPLETED',
          },
          {
            traineeProfileId: trainee4Id,
            campaignAssignmentId: '55555555-0004-4555-8555-555555555555',
            campaignItemId: 'item-doc-1',
            trainingDocumentId: 'doc-1',
            eventType: 'TRAINING_COMPLETED',
          },
        ],
        quizAttempts: [
          {
            traineeProfileId: trainee1Id,
            campaignAssignmentId: '55555555-0001-4555-8555-555555555555',
            campaignItemId: 'item-quiz-1',
            quizId: 'quiz-1',
            status: 'SUBMITTED',
            scorePercentage: 80,
          },
          {
            traineeProfileId: trainee1Id,
            campaignAssignmentId: '55555555-0001-4555-8555-555555555555',
            campaignItemId: 'item-quiz-2',
            quizId: 'quiz-2',
            status: 'IN_PROGRESS',
            scorePercentage: null,
          },
          {
            traineeProfileId: trainee2Id,
            campaignAssignmentId: '55555555-0002-4555-8555-555555555555',
            campaignItemId: 'item-quiz-1',
            quizId: 'quiz-1',
            status: 'SUBMITTED',
            scorePercentage: 100,
          },
          {
            traineeProfileId: trainee2Id,
            campaignAssignmentId: '55555555-0002-4555-8555-555555555555',
            campaignItemId: 'item-quiz-2',
            quizId: 'quiz-2',
            status: 'SUBMITTED',
            scorePercentage: 90,
          },
          {
            traineeProfileId: trainee4Id,
            campaignAssignmentId: '55555555-0004-4555-8555-555555555555',
            campaignItemId: 'item-quiz-1',
            quizId: 'quiz-1',
            status: 'SUBMITTED',
            scorePercentage: 70,
          },
        ],
        simulatedEmailEvents: [
          {
            traineeProfileId: trainee1Id,
            campaignAssignmentId: '55555555-0001-4555-8555-555555555555',
            campaignItemId: 'item-sim-1',
            simulatedEmailId: 'email-1',
            targetId: 'email-1',
          },
          {
            traineeProfileId: trainee2Id,
            campaignAssignmentId: '55555555-0002-4555-8555-555555555555',
            campaignItemId: 'item-sim-1',
            simulatedEmailId: 'email-1',
            targetId: 'email-1',
          },
          {
            traineeProfileId: trainee2Id,
            campaignAssignmentId: '55555555-0002-4555-8555-555555555555',
            campaignItemId: 'item-sim-1',
            simulatedEmailId: 'email-2',
            targetId: 'email-2',
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

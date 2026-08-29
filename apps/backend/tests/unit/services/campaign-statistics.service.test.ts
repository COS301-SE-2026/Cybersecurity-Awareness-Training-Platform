import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CampaignManagementServiceError,
  getOrganisationCampaignStatistics,
  type UserActorContext,
} from '../../../src/services/campaign-statistics.service.js';
import * as CampaignStatisticsRepository from '../../../src/repositories/campaign-statistics.repository.js';
import * as OrganisationScopeRepository from '../../../src/repositories/organisation-scope.repository.js';
import { getCampaignStatisticsResponseSchema } from '@insightful-phish/shared';

vi.mock('../../../src/repositories/campaign-statistics.repository.js');
vi.mock('../../../src/repositories/organisation-scope.repository.js');

describe('CampaignStatisticsService', () => {
  const organisationId = '11111111-1111-4111-8111-111111111111';
  const campaignId = '22222222-2222-4222-8222-222222222222';
  const adminActor: UserActorContext = {
    userId: '33333333-3333-4333-8333-333333333333',
    userType: 'ORGANISATION_ADMIN',
  };

  const mockAdminScope = {
    id: 'admin-scope-1',
    userId: adminActor.userId,
    organisationId,
    adminStatus: 'ACTIVE',
    organisation: { id: organisationId, name: 'Cyber Org', status: 'ACTIVE' },
    permissionGrants: [
      { organisationPermission: { key: 'VIEW_CAMPAIGNS' } },
      { organisationPermission: { key: 'ASSIGN_CAMPAIGNS' } },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws 404 ORGANISATION_NOT_FOUND if actor is not an active admin in the organisation', async () => {
    vi.mocked(OrganisationScopeRepository.findOrganisationAdminActorScope).mockResolvedValue(null);

    await expect(
      getOrganisationCampaignStatistics(adminActor, organisationId, campaignId, {
        page: 1,
        limit: 20,
      }),
    ).rejects.toThrow(CampaignManagementServiceError);

    try {
      await getOrganisationCampaignStatistics(adminActor, organisationId, campaignId, {
        page: 1,
        limit: 20,
      });
    } catch (err) {
      expect((err as CampaignManagementServiceError).statusCode).toBe(404);
      expect((err as CampaignManagementServiceError).error).toBe('ORGANISATION_NOT_FOUND');
    }
  });

  it('throws 403 FORBIDDEN if actor lacks VIEW_CAMPAIGNS and MANAGE_CAMPAIGNS permissions', async () => {
    vi.mocked(OrganisationScopeRepository.findOrganisationAdminActorScope).mockResolvedValue({
      ...mockAdminScope,
      permissionGrants: [{ organisationPermission: { key: 'VIEW_ORGANISATION_TRAINEES' } }],
    } as unknown as Awaited<
      ReturnType<typeof OrganisationScopeRepository.findOrganisationAdminActorScope>
    >);

    await expect(
      getOrganisationCampaignStatistics(adminActor, organisationId, campaignId, {
        page: 1,
        limit: 20,
      }),
    ).rejects.toThrow(CampaignManagementServiceError);

    try {
      await getOrganisationCampaignStatistics(adminActor, organisationId, campaignId, {
        page: 1,
        limit: 20,
      });
    } catch (err) {
      expect((err as CampaignManagementServiceError).statusCode).toBe(403);
      expect((err as CampaignManagementServiceError).error).toBe('FORBIDDEN');
    }
  });

  it('allows access if actor has MANAGE_CAMPAIGNS permission without explicit VIEW_CAMPAIGNS', async () => {
    vi.mocked(OrganisationScopeRepository.findOrganisationAdminActorScope).mockResolvedValue({
      ...mockAdminScope,
      permissionGrants: [{ organisationPermission: { key: 'MANAGE_CAMPAIGNS' } }],
    } as unknown as Awaited<
      ReturnType<typeof OrganisationScopeRepository.findOrganisationAdminActorScope>
    >);

    vi.mocked(CampaignStatisticsRepository.findCampaignWithConsumableItems).mockResolvedValue({
      id: campaignId,
      name: 'Security 101',
      description: 'Intro to security',
      campaignType: 'ORGANISATION_CUSTOM',
      status: 'ACTIVE',
      startDate: new Date('2026-09-01T00:00:00.000Z'),
      endDate: new Date('2026-09-30T23:59:59.000Z'),
      consumableItems: [],
    });

    vi.mocked(CampaignStatisticsRepository.findCampaignCohortAssignments).mockResolvedValue([]);

    const result = await getOrganisationCampaignStatistics(adminActor, organisationId, campaignId, {
      page: 1,
      limit: 20,
    });

    expect(result.campaign.name).toBe('Security 101');
    expect(result.summary.assignedTraineeCount).toBe(0);
  });

  it('throws 404 CAMPAIGN_NOT_FOUND if campaign is not found or belongs to another organisation', async () => {
    vi.mocked(OrganisationScopeRepository.findOrganisationAdminActorScope).mockResolvedValue(
      mockAdminScope as unknown as Awaited<
        ReturnType<typeof OrganisationScopeRepository.findOrganisationAdminActorScope>
      >,
    );

    vi.mocked(CampaignStatisticsRepository.findCampaignWithConsumableItems).mockResolvedValue(null);

    await expect(
      getOrganisationCampaignStatistics(adminActor, organisationId, campaignId, {
        page: 1,
        limit: 20,
      }),
    ).rejects.toThrow(CampaignManagementServiceError);

    try {
      await getOrganisationCampaignStatistics(adminActor, organisationId, campaignId, {
        page: 1,
        limit: 20,
      });
    } catch (err) {
      expect((err as CampaignManagementServiceError).statusCode).toBe(404);
      expect((err as CampaignManagementServiceError).error).toBe('CAMPAIGN_NOT_FOUND');
    }
  });

  it('returns empty cohort response with null percentages when no trainees are assigned', async () => {
    vi.mocked(OrganisationScopeRepository.findOrganisationAdminActorScope).mockResolvedValue(
      mockAdminScope as unknown as Awaited<
        ReturnType<typeof OrganisationScopeRepository.findOrganisationAdminActorScope>
      >,
    );

    vi.mocked(CampaignStatisticsRepository.findCampaignWithConsumableItems).mockResolvedValue({
      id: campaignId,
      name: 'Empty Cohort Campaign',
      description: null,
      campaignType: 'ORGANISATION_CUSTOM',
      status: 'ACTIVE',
      startDate: null,
      endDate: null,
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

    vi.mocked(CampaignStatisticsRepository.findCampaignCohortAssignments).mockResolvedValue([]);

    const result = await getOrganisationCampaignStatistics(adminActor, organisationId, campaignId, {
      page: 1,
      limit: 20,
    });

    expect(result.summary).toEqual({
      assignedTraineeCount: 0,
      startedTraineeCount: 0,
      completedTraineeCount: 0,
      overallProgressPercentage: null,
      averageQuizScorePercentage: null,
    });
    expect(result.trainees).toEqual([]);
    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    });
    expect(getCampaignStatisticsResponseSchema.safeParse(result).success).toBe(true);
  });

  it('accurately calculates started, item completions, percentages, quiz averages, unassign permissions, and full-cohort summary across multi-component items', async () => {
    vi.mocked(OrganisationScopeRepository.findOrganisationAdminActorScope).mockResolvedValue(
      mockAdminScope as unknown as Awaited<
        ReturnType<typeof OrganisationScopeRepository.findOrganisationAdminActorScope>
      >,
    );

    // 4 consumable items: 1 Training Document, 2 Quizzes, 1 Simulation Inbox (with 2 emails)
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
      name: 'Comprehensive Phishing Campaign',
      description: 'Full multi-component training',
      campaignType: 'ORGANISATION_CUSTOM',
      status: 'ACTIVE',
      startDate: new Date('2026-09-01T00:00:00.000Z'),
      endDate: new Date('2026-09-30T23:59:59.000Z'),
      consumableItems,
    });

    const trainee1ProfileId = '11111111-aaaa-4111-8111-111111111111';
    const trainee2ProfileId = '22222222-bbbb-4222-8222-222222222222';
    const trainee3ProfileId = '33333333-cccc-4333-8333-333333333333';
    const trainee4DisabledProfileId = '44444444-dddd-4444-8444-444444444444';

    const cohortAssignments: CampaignStatisticsRepository.CampaignStatisticsAssignmentEntity[] = [
      {
        assignmentId: '55555555-0001-4555-8555-555555555555',
        traineeProfileId: trainee1ProfileId,
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
        traineeProfileId: trainee2ProfileId,
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
        traineeProfileId: trainee3ProfileId,
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
        traineeProfileId: trainee4DisabledProfileId,
        firstName: 'Diana',
        lastName: 'Zuma',
        email: 'diana@example.com',
        traineeStatus: 'DISABLED',
        assignmentStatus: 'IN_PROGRESS',
        accessType: 'ASSIGNED',
        assignedAt: new Date('2026-08-04T10:00:00.000Z'),
      },
    ];

    vi.mocked(CampaignStatisticsRepository.findCampaignCohortAssignments).mockResolvedValue(
      cohortAssignments,
    );

    // Progress Facts:
    // Trainee 1 (Alice):
    // - Training doc: TRAINING_VIEWED only (started, but item incomplete)
    // - Quiz 1: SUBMITTED with 80% (item complete)
    // - Quiz 2: IN_PROGRESS attempt (item incomplete)
    // - Simulation: email-1 opened (started, but only 1 of 2 emails opened, item incomplete)
    // Completed items: 1/4 (25%), isStarted: true, Completed Quiz: 1/2, Trainee Avg Quiz: 80%
    //
    // Trainee 2 (Bob):
    // - Training doc: TRAINING_COMPLETED (item complete)
    // - Quiz 1: SUBMITTED with 100% (item complete)
    // - Quiz 2: SUBMITTED with 90% (item complete)
    // - Simulation: email-1 and email-2 opened (item complete)
    // Completed items: 4/4 (100%), isStarted: true, isCompleted: true, Completed Quiz: 2/2, Trainee Avg Quiz: 95%
    //
    // Trainee 3 (Charlie):
    // - No events/attempts
    // Completed items: 0/4 (0%), isStarted: false, isCompleted: false, Completed Quiz: 0/2, Trainee Avg Quiz: null
    //
    // Trainee 4 (Diana - Disabled):
    // - Training doc: TRAINING_COMPLETED (item complete)
    // - Quiz 1: SUBMITTED with 70% (item complete)
    // Completed items: 2/4 (50%), isStarted: true, isCompleted: false, Completed Quiz: 1/2, Trainee Avg Quiz: 70%

    vi.mocked(CampaignStatisticsRepository.findCampaignProgressFacts).mockResolvedValue({
      trainingEvents: [
        {
          traineeProfileId: trainee1ProfileId,
          campaignAssignmentId: '55555555-0001-4555-8555-555555555555',
          campaignItemId: 'item-doc-1',
          trainingDocumentId: 'doc-1',
          eventType: 'TRAINING_VIEWED',
        },
        {
          traineeProfileId: trainee2ProfileId,
          campaignAssignmentId: '55555555-0002-4555-8555-555555555555',
          campaignItemId: 'item-doc-1',
          trainingDocumentId: 'doc-1',
          eventType: 'TRAINING_COMPLETED',
        },
        {
          traineeProfileId: trainee4DisabledProfileId,
          campaignAssignmentId: '55555555-0004-4555-8555-555555555555',
          campaignItemId: 'item-doc-1',
          trainingDocumentId: 'doc-1',
          eventType: 'TRAINING_COMPLETED',
        },
      ],
      quizAttempts: [
        {
          traineeProfileId: trainee1ProfileId,
          campaignAssignmentId: '55555555-0001-4555-8555-555555555555',
          campaignItemId: 'item-quiz-1',
          quizId: 'quiz-1',
          status: 'SUBMITTED',
          scorePercentage: 80,
        },
        {
          traineeProfileId: trainee1ProfileId,
          campaignAssignmentId: '55555555-0001-4555-8555-555555555555',
          campaignItemId: 'item-quiz-2',
          quizId: 'quiz-2',
          status: 'IN_PROGRESS',
          scorePercentage: null,
        },
        {
          traineeProfileId: trainee2ProfileId,
          campaignAssignmentId: '55555555-0002-4555-8555-555555555555',
          campaignItemId: 'item-quiz-1',
          quizId: 'quiz-1',
          status: 'SUBMITTED',
          scorePercentage: 100,
        },
        {
          traineeProfileId: trainee2ProfileId,
          campaignAssignmentId: '55555555-0002-4555-8555-555555555555',
          campaignItemId: 'item-quiz-2',
          quizId: 'quiz-2',
          status: 'SUBMITTED',
          scorePercentage: 90,
        },
        {
          traineeProfileId: trainee4DisabledProfileId,
          campaignAssignmentId: '55555555-0004-4555-8555-555555555555',
          campaignItemId: 'item-quiz-1',
          quizId: 'quiz-1',
          status: 'SUBMITTED',
          scorePercentage: 70,
        },
      ],
      simulatedEmailEvents: [
        {
          traineeProfileId: trainee1ProfileId,
          campaignAssignmentId: '55555555-0001-4555-8555-555555555555',
          campaignItemId: 'item-sim-1',
          simulatedEmailId: 'email-1',
          targetId: 'email-1',
        },
        {
          traineeProfileId: trainee2ProfileId,
          campaignAssignmentId: '55555555-0002-4555-8555-555555555555',
          campaignItemId: 'item-sim-1',
          simulatedEmailId: 'email-1',
          targetId: 'email-1',
        },
        {
          traineeProfileId: trainee2ProfileId,
          campaignAssignmentId: '55555555-0002-4555-8555-555555555555',
          campaignItemId: 'item-sim-1',
          simulatedEmailId: 'email-2',
          targetId: 'email-2',
        },
      ],
    });

    const result = await getOrganisationCampaignStatistics(adminActor, organisationId, campaignId, {
      page: 1,
      limit: 2,
    });

    // Summary calculations across full cohort of 4 trainees:
    // assignedTraineeCount = 4
    // startedTraineeCount = 3 (Alice, Bob, Diana)
    // completedTraineeCount = 1 (Bob)
    // Trainee progress percentages: [25, 100, 0, 50]
    // arithmetic mean: (25 + 100 + 0 + 50) / 4 = 175 / 4 = 43.75 -> rounded: 44%
    // Trainee average quiz scores: Alice=80, Bob=95 (from (100+90)/2), Charlie=null, Diana=70
    // Contributing quiz scores: [80, 95, 70] -> mean: (80 + 95 + 70) / 3 = 245 / 3 = 81.666 -> rounded: 82%
    expect(result.summary).toEqual({
      assignedTraineeCount: 4,
      startedTraineeCount: 3,
      completedTraineeCount: 1,
      overallProgressPercentage: 44,
      averageQuizScorePercentage: 82,
    });

    // Pagination: page 1, limit 2
    expect(result.pagination).toEqual({
      page: 1,
      limit: 2,
      total: 4,
      totalPages: 2,
    });

    expect(result.trainees).toHaveLength(2);

    const aliceRow = result.trainees[0];
    expect(aliceRow.displayName).toBe('Alice Ndlovu');
    expect(aliceRow.progress).toEqual({
      completedItemCount: 1,
      totalItemCount: 4,
      progressPercentage: 25,
    });
    expect(aliceRow.completedQuizCount).toBe(1);
    expect(aliceRow.totalQuizCount).toBe(2);
    expect(aliceRow.averageQuizScorePercentage).toBe(80);
    expect(aliceRow.allowedActions.canUnassign).toBe(true); // ASSIGNED accessType + ASSIGN_CAMPAIGNS

    const bobRow = result.trainees[1];
    expect(bobRow.displayName).toBe('Bob Khumalo');
    expect(bobRow.progress).toEqual({
      completedItemCount: 4,
      totalItemCount: 4,
      progressPercentage: 100,
    });
    expect(bobRow.completedQuizCount).toBe(2);
    expect(bobRow.totalQuizCount).toBe(2);
    expect(bobRow.averageQuizScorePercentage).toBe(95);
    expect(bobRow.allowedActions.canUnassign).toBe(false); // SELF_SELECTED cannot be unassigned

    expect(getCampaignStatisticsResponseSchema.safeParse(result).success).toBe(true);

    // Now test page 2
    const page2Result = await getOrganisationCampaignStatistics(
      adminActor,
      organisationId,
      campaignId,
      {
        page: 2,
        limit: 2,
      },
    );

    // Summary must remain identical
    expect(page2Result.summary).toEqual(result.summary);
    expect(page2Result.pagination).toEqual({
      page: 2,
      limit: 2,
      total: 4,
      totalPages: 2,
    });
    expect(page2Result.trainees).toHaveLength(2);

    const charlieRow = page2Result.trainees[0];
    expect(charlieRow.displayName).toBe('Charlie Smith');
    expect(charlieRow.progress).toEqual({
      completedItemCount: 0,
      totalItemCount: 4,
      progressPercentage: 0,
    });
    expect(charlieRow.completedQuizCount).toBe(0);
    expect(charlieRow.averageQuizScorePercentage).toBeNull();

    const dianaRow = page2Result.trainees[1];
    expect(dianaRow.displayName).toBe('Diana Zuma');
    expect(dianaRow.traineeStatus).toBe('DISABLED');
    expect(dianaRow.progress).toEqual({
      completedItemCount: 2,
      totalItemCount: 4,
      progressPercentage: 50,
    });
    expect(dianaRow.completedQuizCount).toBe(1);
    expect(dianaRow.averageQuizScorePercentage).toBe(70);

    expect(getCampaignStatisticsResponseSchema.safeParse(page2Result).success).toBe(true);
  });
});

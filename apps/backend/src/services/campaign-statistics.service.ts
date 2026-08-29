import type {
  CampaignStatisticsQueryDto,
  CampaignStatisticsTraineeRowDto,
  GetCampaignStatisticsResponseDto,
} from '@insightful-phish/shared';
import {
  calculateCampaignAverageQuizScore,
  calculateCampaignOverallProgress,
  calculateItemProgressPercentage,
  calculateTraineeAverageQuizScore,
  getCampaignStatisticsResponseSchema,
} from '@insightful-phish/shared';

import * as CampaignStatisticsRepository from '../repositories/campaign-statistics.repository.js';
import * as OrganisationScopeRepository from '../repositories/organisation-scope.repository.js';

export type UserActorContext = {
  userId: string;
  userType: string;
};

export class CampaignManagementServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly error: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'CampaignManagementServiceError';
  }
}

async function validateOrganisationAdminActor(
  actor: UserActorContext,
  organisationId: string,
  requiredPermissionKey?: 'VIEW_CAMPAIGNS' | 'MANAGE_CAMPAIGNS',
) {
  const adminScope = await OrganisationScopeRepository.findOrganisationAdminActorScope({
    userId: actor.userId,
    organisationId,
  });

  if (!adminScope) {
    throw new CampaignManagementServiceError(
      404,
      'ORGANISATION_NOT_FOUND',
      'Organisation context not found or user is not an active admin',
    );
  }

  if (requiredPermissionKey) {
    const hasPermission = adminScope.permissionGrants.some((grant) => {
      const key = grant.organisationPermission.key;
      if (requiredPermissionKey === 'VIEW_CAMPAIGNS') {
        return key === 'VIEW_CAMPAIGNS' || key === 'MANAGE_CAMPAIGNS';
      }
      return key === requiredPermissionKey;
    });

    if (!hasPermission) {
      throw new CampaignManagementServiceError(
        403,
        'FORBIDDEN',
        `Missing required permission: ${requiredPermissionKey}`,
      );
    }
  }

  return adminScope;
}

/**
 * Calculates authoritative campaign-level and trainee-level progress statistics
 * for an organisation campaign without creating denormalised state or parallel counters.
 */
export async function getOrganisationCampaignStatistics(
  actor: UserActorContext,
  organisationId: string,
  campaignId: string,
  query: CampaignStatisticsQueryDto,
): Promise<GetCampaignStatisticsResponseDto> {
  const adminScope = await validateOrganisationAdminActor(actor, organisationId, 'VIEW_CAMPAIGNS');

  const hasAssignPermission = adminScope.permissionGrants.some(
    (grant) => grant.organisationPermission.key === 'ASSIGN_CAMPAIGNS',
  );

  const campaign = await CampaignStatisticsRepository.findCampaignWithConsumableItems(
    organisationId,
    campaignId,
  );

  if (!campaign) {
    throw new CampaignManagementServiceError(
      404,
      'CAMPAIGN_NOT_FOUND',
      'Campaign was not found in this organisation',
    );
  }

  const consumableItems = campaign.consumableItems;
  const itemCount = consumableItems.length;
  const quizCount = consumableItems.filter((i) => i.componentType === 'QUIZ').length;

  const cohortAssignments = await CampaignStatisticsRepository.findCampaignCohortAssignments(
    organisationId,
    campaignId,
  );

  if (cohortAssignments.length === 0) {
    return getCampaignStatisticsResponseSchema.parse({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        campaignType: campaign.campaignType,
        status: campaign.status,
        startDate: campaign.startDate ? campaign.startDate.toISOString() : null,
        endDate: campaign.endDate ? campaign.endDate.toISOString() : null,
        itemCount,
        quizCount,
      },
      summary: {
        assignedTraineeCount: 0,
        startedTraineeCount: 0,
        completedTraineeCount: 0,
        overallProgressPercentage: null,
        averageQuizScorePercentage: null,
      },
      trainees: [],
      pagination: {
        page: query.page,
        limit: query.limit,
        total: 0,
        totalPages: 0,
      },
    });
  }

  const traineeProfileIds = cohortAssignments.map((a) => a.traineeProfileId);
  const assignmentIds = cohortAssignments.map((a) => a.assignmentId);

  const progressFacts = await CampaignStatisticsRepository.findCampaignProgressFacts({
    traineeProfileIds,
    assignmentIds,
    consumableItems,
  });

  const trainingEventsByTrainee = new Map<
    string,
    CampaignStatisticsRepository.TrainingProgressFact[]
  >();
  for (const event of progressFacts.trainingEvents) {
    const list = trainingEventsByTrainee.get(event.traineeProfileId) ?? [];
    list.push(event);
    trainingEventsByTrainee.set(event.traineeProfileId, list);
  }

  const quizAttemptsByTrainee = new Map<string, CampaignStatisticsRepository.QuizProgressFact[]>();
  for (const attempt of progressFacts.quizAttempts) {
    const list = quizAttemptsByTrainee.get(attempt.traineeProfileId) ?? [];
    list.push(attempt);
    quizAttemptsByTrainee.set(attempt.traineeProfileId, list);
  }

  const simulationOpenedEmailsByTrainee = new Map<string, Set<string>>();
  for (const emailEvent of progressFacts.simulatedEmailEvents) {
    let set = simulationOpenedEmailsByTrainee.get(emailEvent.traineeProfileId);
    if (!set) {
      set = new Set<string>();
      simulationOpenedEmailsByTrainee.set(emailEvent.traineeProfileId, set);
    }
    if (emailEvent.simulatedEmailId) {
      set.add(emailEvent.simulatedEmailId);
    }
    if (emailEvent.targetId) {
      set.add(emailEvent.targetId);
    }
  }

  const allTraineeRows: CampaignStatisticsTraineeRowDto[] = [];
  const allTraineeProgressPercentages: number[] = [];
  const contributingTraineeQuizAverages: number[] = [];

  let startedTraineeCount = 0;
  let completedTraineeCount = 0;

  for (const assignment of cohortAssignments) {
    const traineeId = assignment.traineeProfileId;
    const tTrainingEvents = trainingEventsByTrainee.get(traineeId) ?? [];
    const tQuizAttempts = quizAttemptsByTrainee.get(traineeId) ?? [];
    const tOpenedEmails = simulationOpenedEmailsByTrainee.get(traineeId) ?? new Set<string>();

    const hasTrainingActivity = tTrainingEvents.some(
      (e) => e.eventType === 'TRAINING_VIEWED' || e.eventType === 'TRAINING_COMPLETED',
    );
    const hasQuizActivity = tQuizAttempts.some(
      (a) => a.status === 'IN_PROGRESS' || a.status === 'SUBMITTED',
    );
    const hasSimulationActivity = tOpenedEmails.size > 0;

    const isStarted = hasTrainingActivity || hasQuizActivity || hasSimulationActivity;
    if (isStarted) {
      startedTraineeCount++;
    }

    let completedItemCount = 0;
    let completedQuizCount = 0;

    for (const item of consumableItems) {
      if (item.componentType === 'TRAINING_DOCUMENT') {
        const hasCompletedTraining = tTrainingEvents.some(
          (e) =>
            e.eventType === 'TRAINING_COMPLETED' &&
            (e.campaignItemId === item.id ||
              (item.trainingDocumentId && e.trainingDocumentId === item.trainingDocumentId)),
        );
        if (hasCompletedTraining) {
          completedItemCount++;
        }
      } else if (item.componentType === 'QUIZ') {
        const hasSubmittedQuiz = tQuizAttempts.some(
          (a) =>
            a.status === 'SUBMITTED' &&
            (a.campaignItemId === item.id || (item.quizId && a.quizId === item.quizId)),
        );
        if (hasSubmittedQuiz) {
          completedItemCount++;
          completedQuizCount++;
        }
      } else if (item.componentType === 'SIMULATED_INBOX') {
        const requiredEmailIds = item.simulatedInboxEmailIds;
        if (
          requiredEmailIds.length > 0 &&
          requiredEmailIds.every((emailId) => tOpenedEmails.has(emailId))
        ) {
          completedItemCount++;
        }
      }
    }

    const progressPercentage = calculateItemProgressPercentage(completedItemCount, itemCount);
    allTraineeProgressPercentages.push(progressPercentage);

    const isTraineeCompleted = itemCount > 0 && completedItemCount === itemCount;
    if (isTraineeCompleted) {
      completedTraineeCount++;
    }

    const submittedQuizScores = tQuizAttempts
      .filter(
        (a) =>
          a.status === 'SUBMITTED' &&
          typeof a.scorePercentage === 'number' &&
          consumableItems.some(
            (i) =>
              i.componentType === 'QUIZ' &&
              (a.campaignItemId === i.id || (i.quizId && a.quizId === i.quizId)),
          ),
      )
      .map((a) => a.scorePercentage as number);

    const averageQuizScorePercentage = calculateTraineeAverageQuizScore(submittedQuizScores);
    if (averageQuizScorePercentage !== null) {
      contributingTraineeQuizAverages.push(averageQuizScorePercentage);
    }

    allTraineeRows.push({
      assignmentId: assignment.assignmentId,
      traineeProfileId: assignment.traineeProfileId,
      displayName: `${assignment.firstName} ${assignment.lastName}`.trim(),
      email: assignment.email,
      traineeStatus: assignment.traineeStatus,
      assignmentStatus: assignment.assignmentStatus,
      accessType: assignment.accessType,
      assignedAt: assignment.assignedAt.toISOString(),
      progress: {
        completedItemCount,
        totalItemCount: itemCount,
        progressPercentage,
      },
      completedQuizCount,
      totalQuizCount: quizCount,
      averageQuizScorePercentage,
      allowedActions: {
        canUnassign: hasAssignPermission && assignment.accessType === 'ASSIGNED',
      },
    });
  }

  const overallProgressPercentage = calculateCampaignOverallProgress(allTraineeProgressPercentages);
  const campaignAverageQuizScorePercentage = calculateCampaignAverageQuizScore(
    contributingTraineeQuizAverages,
  );

  const total = cohortAssignments.length;
  const totalPages = total > 0 ? Math.ceil(total / query.limit) : 0;
  const skip = (query.page - 1) * query.limit;
  const paginatedTrainees = allTraineeRows.slice(skip, skip + query.limit);

  return getCampaignStatisticsResponseSchema.parse({
    campaign: {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      campaignType: campaign.campaignType,
      status: campaign.status,
      startDate: campaign.startDate ? campaign.startDate.toISOString() : null,
      endDate: campaign.endDate ? campaign.endDate.toISOString() : null,
      itemCount,
      quizCount,
    },
    summary: {
      assignedTraineeCount: total,
      startedTraineeCount,
      completedTraineeCount,
      overallProgressPercentage,
      averageQuizScorePercentage: campaignAverageQuizScorePercentage,
    },
    trainees: paginatedTrainees,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
    },
  });
}

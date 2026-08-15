import type {
  AssignmentStatusDto,
  CampaignAccessTypeDto,
  CampaignComponentTypeDto,
  CampaignStatusDto,
  CampaignTypeDto,
  DifficultyLevelDto,
  GetPlatformCampaignsResponseDto,
  GetTraineeCampaignDetailResponseDto,
  GetTraineeCampaignsResponseDto,
  ListPlatformCampaignsQueryDto,
  PlatformCampaignSummaryDto,
  SupportedTraineeCampaignComponentTypeDto,
  TraineeCampaignAssignmentSummaryDto,
  TraineeCampaignChildItemSummaryDto,
  TraineeCampaignComponentItemSummaryDto,
  TraineeCampaignGroupItemSummaryDto,
  TraineeCampaignItemSummaryDto,
  TraineeCampaignProgressStatusDto,
  TraineeCampaignSummaryDto,
} from '@insightful-phish/shared';
import {
  getPlatformCampaignsResponseSchema,
  getTraineeCampaignActivityApiPath,
  getTraineeCampaignDetailResponseSchema,
  getTraineeCampaignsResponseSchema,
  SUPPORTED_TRAINEE_CAMPAIGN_COMPONENT_TYPES,
  traineeCampaignSummarySchema,
} from '@insightful-phish/shared';
import * as CampaignAssignmentRepository from '../repositories/campaign-assignment.repository.js';
import * as TraineeCampaignRepository from '../repositories/trainee-campaign.repository.js';
import {
  defaultCampaignEligibilityService,
  type CampaignEligibilityResult,
} from './campaign-eligibility.service.js';

type ActiveTraineeProfile = NonNullable<
  Awaited<ReturnType<typeof TraineeCampaignRepository.findActiveTraineeProfileByUserId>>
>;
type CampaignAssignmentSummary = Awaited<
  ReturnType<typeof TraineeCampaignRepository.findAccessibleCampaignAssignments>
>[number];
type CampaignAssignmentDetail = NonNullable<
  Awaited<ReturnType<typeof TraineeCampaignRepository.findAccessibleCampaignAssignment>>
>;
type CampaignItemRecord = CampaignAssignmentDetail['campaign']['items'][number];

type TraineeCampaignSummaryWithCountsDto = TraineeCampaignSummaryDto & {
  itemCount: number;
  availableItemCount: number;
  eligibility: CampaignEligibilityResult;
};

type GetTraineeCampaignsResponseWithCountsDto = GetTraineeCampaignsResponseDto & {
  campaigns: TraineeCampaignSummaryWithCountsDto[];
};

export class TraineeCampaignNotFoundError extends Error {
  constructor(message = 'Trainee campaign not found') {
    super(message);
    this.name = 'TraineeCampaignNotFoundError';
  }
}

export class TraineeCampaignForbiddenError extends Error {
  public readonly statusCode = 403;
  public readonly errorCode = 'FORBIDDEN';
  constructor(message = 'Only active general trainees can access this resource') {
    super(message);
    this.name = 'TraineeCampaignForbiddenError';
  }
}

function isSupportedComponentType(
  componentType: CampaignComponentTypeDto | null,
): componentType is SupportedTraineeCampaignComponentTypeDto {
  return SUPPORTED_TRAINEE_CAMPAIGN_COMPONENT_TYPES.includes(
    componentType as SupportedTraineeCampaignComponentTypeDto,
  );
}

async function resolveActiveTraineeProfile(userId: string): Promise<ActiveTraineeProfile> {
  const traineeProfile = await TraineeCampaignRepository.findActiveTraineeProfileByUserId(userId);

  if (!traineeProfile) {
    throw new TraineeCampaignNotFoundError();
  }

  return traineeProfile;
}

function toIsoString(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function toAssignmentSummary(assignment: {
  id: string;
  assignmentStatus: string;
  accessType: string;
  currentCampaignItemId: string | null;
  assignedAt: Date;
  dueDate?: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
}): TraineeCampaignAssignmentSummaryDto {
  return {
    assignmentId: assignment.id,
    assignmentStatus: assignment.assignmentStatus as AssignmentStatusDto,
    accessType: assignment.accessType as CampaignAccessTypeDto,
    currentCampaignItemId: assignment.currentCampaignItemId,
    assignedAt: assignment.assignedAt.toISOString(),
    dueDate: toIsoString(assignment.dueDate),
    startedAt: toIsoString(assignment.startedAt),
    completedAt: toIsoString(assignment.completedAt),
  };
}

function toCampaignSummary(
  assignment: CampaignAssignmentSummary,
): TraineeCampaignSummaryWithCountsDto {
  const itemCount = assignment.campaign.items.length;
  const availableItemCount = assignment.campaign.items.filter(
    (item) => item.availabilityStatus === 'AVAILABLE',
  ).length;
  const eligibility = defaultCampaignEligibilityService.evaluateCampaignEligibility(
    assignment.campaign,
  );

  return {
    campaignId: assignment.campaign.id,
    name: assignment.campaign.name,
    description: assignment.campaign.description,
    accentColor: assignment.campaign.accentColor,
    campaignType: assignment.campaign.campaignType,
    difficultyLevel: assignment.campaign.difficultyLevel,
    status: assignment.campaign.status,
    startDate: toIsoString(assignment.campaign.startDate),
    endDate: toIsoString(assignment.campaign.endDate),
    assignment: toAssignmentSummary(assignment),
    accessType: assignment.accessType,
    itemCount,
    availableItemCount,
    eligibility,
  };
}

function setProgressStatus(
  progressByItemId: Map<string, TraineeCampaignProgressStatusDto>,
  campaignItemId: string | null,
  progressStatus: TraineeCampaignProgressStatusDto,
) {
  if (!campaignItemId) {
    return;
  }

  progressByItemId.set(campaignItemId, progressStatus);
}

function deriveTrainingProgressStatus(
  events: Awaited<ReturnType<typeof TraineeCampaignRepository.findTrainingInteractionEvents>>,
) {
  const progressByItemId = new Map<string, TraineeCampaignProgressStatusDto>();

  for (const event of events) {
    if (event.eventType === 'TRAINING_COMPLETED') {
      setProgressStatus(progressByItemId, event.campaignItemId, 'COMPLETED');
      continue;
    }

    if (!progressByItemId.has(event.campaignItemId ?? '')) {
      setProgressStatus(progressByItemId, event.campaignItemId, 'VIEWED');
    }
  }

  return progressByItemId;
}

function deriveQuizProgressStatus(
  attempts: Awaited<ReturnType<typeof TraineeCampaignRepository.findQuizAttempts>>,
) {
  const progressByItemId = new Map<string, TraineeCampaignProgressStatusDto>();

  for (const attempt of attempts) {
    if (attempt.status === 'SUBMITTED') {
      setProgressStatus(progressByItemId, attempt.campaignItemId, 'SUBMITTED');
      continue;
    }

    if (!progressByItemId.has(attempt.campaignItemId ?? '')) {
      setProgressStatus(progressByItemId, attempt.campaignItemId, 'IN_PROGRESS');
    }
  }

  return progressByItemId;
}

function deriveSimulationProgressStatus(input: {
  events: Awaited<ReturnType<typeof TraineeCampaignRepository.findSimulationInteractionEvents>>;
  classificationResponses: Awaited<
    ReturnType<typeof TraineeCampaignRepository.findEmailClassificationResponses>
  >;
}) {
  const progressByItemId = new Map<string, TraineeCampaignProgressStatusDto>();

  for (const response of input.classificationResponses) {
    setProgressStatus(progressByItemId, response.campaignItemId, 'CLASSIFIED');
  }

  for (const event of input.events) {
    if (event.eventType === 'SIMULATED_EMAIL_CLASSIFIED') {
      setProgressStatus(progressByItemId, event.campaignItemId, 'CLASSIFIED');
      continue;
    }

    if (progressByItemId.get(event.campaignItemId ?? '') === 'CLASSIFIED') {
      continue;
    }

    if (
      event.eventType === 'SIMULATED_EMAIL_LINK_CLICKED' ||
      event.eventType === 'CREDENTIAL_SUBMISSION_ATTEMPTED'
    ) {
      setProgressStatus(progressByItemId, event.campaignItemId, 'INTERACTED');
      continue;
    }

    if (!progressByItemId.has(event.campaignItemId ?? '')) {
      setProgressStatus(progressByItemId, event.campaignItemId, 'VIEWED');
    }
  }

  return progressByItemId;
}

async function getProgressByItemId(input: {
  traineeProfileId: string;
  campaignAssignmentId: string;
  items: CampaignItemRecord[];
}) {
  const componentItems = input.items.filter((item) => item.itemType === 'COMPONENT');
  const trainingItemIds = componentItems
    .filter((item) => item.componentType === 'TRAINING_DOCUMENT')
    .map((item) => item.id);
  const quizItemIds = componentItems
    .filter((item) => item.componentType === 'QUIZ')
    .map((item) => item.id);
  const simulationItemIds = componentItems
    .filter((item) => item.componentType === 'SIMULATED_INBOX')
    .map((item) => item.id);

  const [trainingEvents, quizAttempts, simulationEvents, classificationResponses] =
    await Promise.all([
      TraineeCampaignRepository.findTrainingInteractionEvents({
        traineeProfileId: input.traineeProfileId,
        campaignAssignmentId: input.campaignAssignmentId,
        campaignItemIds: trainingItemIds,
      }),
      TraineeCampaignRepository.findQuizAttempts({
        traineeProfileId: input.traineeProfileId,
        campaignItemIds: quizItemIds,
      }),
      TraineeCampaignRepository.findSimulationInteractionEvents({
        traineeProfileId: input.traineeProfileId,
        campaignAssignmentId: input.campaignAssignmentId,
        campaignItemIds: simulationItemIds,
      }),
      TraineeCampaignRepository.findEmailClassificationResponses({
        traineeProfileId: input.traineeProfileId,
        campaignItemIds: simulationItemIds,
      }),
    ]);

  return new Map<string, TraineeCampaignProgressStatusDto>([
    ...deriveTrainingProgressStatus(trainingEvents),
    ...deriveQuizProgressStatus(quizAttempts),
    ...deriveSimulationProgressStatus({ events: simulationEvents, classificationResponses }),
  ]);
}

function isComponentOpenable(item: CampaignItemRecord) {
  if (
    item.itemType !== 'COMPONENT' ||
    !isSupportedComponentType(item.componentType) ||
    item.availabilityStatus !== 'AVAILABLE'
  ) {
    return false;
  }

  if (item.componentType === 'TRAINING_DOCUMENT') {
    return item.trainingDocument?.status === 'AVAILABLE';
  }

  if (item.componentType === 'QUIZ') {
    return item.quiz?.status === 'PUBLISHED';
  }

  return (
    item.simulation?.safetyStatus === 'APPROVED' &&
    item.simulation.simulatedInbox?.status === 'ACTIVE'
  );
}

function toComponentItemSummary(input: {
  item: CampaignItemRecord & { itemType: 'COMPONENT' };
  campaignEligibility: CampaignEligibilityResult;
  progressByItemId: Map<string, TraineeCampaignProgressStatusDto>;
}): TraineeCampaignComponentItemSummaryDto {
  const { item, campaignEligibility, progressByItemId } = input;

  if (!isSupportedComponentType(item.componentType)) {
    throw new TraineeCampaignNotFoundError();
  }

  const itemEligibility = defaultCampaignEligibilityService.evaluateItemEligibility(
    campaignEligibility,
    item.componentType,
  );

  return {
    campaignItemId: item.id,
    campaignId: item.campaignId,
    parentGroupId: item.parentGroupId,
    itemType: 'COMPONENT',
    componentType: item.componentType,
    groupType: null,
    completionRule: null,
    title: item.title,
    description: item.description,
    position: item.position,
    isRequired: item.isRequired,
    availabilityStatus: item.availabilityStatus,
    isOpenable: isComponentOpenable(item) && itemEligibility.canView,
    activityApiPath: getTraineeCampaignActivityApiPath(item.componentType, item.id),
    progressStatus: progressByItemId.get(item.id) ?? 'NOT_STARTED',
    eligibility: itemEligibility,
    trainingDocument: item.trainingDocument
      ? {
          id: item.trainingDocument.id,
          title: item.trainingDocument.title,
          contentSummary: item.trainingDocument.contentSummary,
          estimatedReadTimeMinutes: item.trainingDocument.estimatedReadTimeMinutes,
          difficultyLevel: item.trainingDocument.difficultyLevel,
          status: item.trainingDocument.status,
        }
      : null,
    quiz: item.quiz
      ? {
          id: item.quiz.id,
          title: item.quiz.title,
          description: item.quiz.description,
          passThresholdPercentage: item.quiz.passThresholdPercentage,
          difficultyLevel: item.quiz.difficultyLevel,
          status: item.quiz.status,
          questionCount: item.quiz._count.questions,
        }
      : null,
    simulation: item.simulation
      ? {
          id: item.simulation.id,
          title: item.simulation.title,
          description: item.simulation.description,
          difficultyLevel: item.simulation.difficultyLevel,
        }
      : null,
  };
}

function sortByPosition(items: CampaignItemRecord[]) {
  return [...items].sort((left, right) => left.position - right.position);
}

function toCampaignItemTree(input: {
  items: CampaignItemRecord[];
  parentGroupId: string | null;
  campaignEligibility: CampaignEligibilityResult;
  progressByItemId: Map<string, TraineeCampaignProgressStatusDto>;
}): TraineeCampaignItemSummaryDto[] {
  return sortByPosition(input.items.filter((item) => item.parentGroupId === input.parentGroupId))
    .filter(
      (item) =>
        item.itemType === 'GROUP' ||
        (item.componentType !== null && isSupportedComponentType(item.componentType)),
    )
    .map((item) => {
      if (item.itemType === 'COMPONENT') {
        return toComponentItemSummary({
          item: item as CampaignItemRecord & { itemType: 'COMPONENT' },
          campaignEligibility: input.campaignEligibility,
          progressByItemId: input.progressByItemId,
        });
      }

      const children: TraineeCampaignChildItemSummaryDto[] = sortByPosition(
        input.items.filter((c) => c.parentGroupId === item.id && c.itemType === 'COMPONENT'),
      )
        .filter((c) => c.componentType !== null && isSupportedComponentType(c.componentType))
        .map((c) => ({
          ...toComponentItemSummary({
            item: c as CampaignItemRecord & { itemType: 'COMPONENT' },
            campaignEligibility: input.campaignEligibility,
            progressByItemId: input.progressByItemId,
          }),
          parentGroupId: item.id,
        }));

      return {
        campaignItemId: item.id,
        campaignId: item.campaignId,
        parentGroupId: item.parentGroupId,
        itemType: 'GROUP',
        componentType: null,
        groupType: item.groupType ?? 'SECTION',
        completionRule: item.completionRule ?? 'COMPLETE_ALL',
        title: item.title,
        description: item.description,
        position: item.position,
        isRequired: item.isRequired,
        availabilityStatus: item.availabilityStatus,
        isOpenable: false,
        activityApiPath: null,
        progressStatus: null,
        eligibility: {
          canView: input.campaignEligibility.canView,
          canProgress: input.campaignEligibility.canProgress,
          reason: input.campaignEligibility.reason,
        },
        children,
      } satisfies TraineeCampaignGroupItemSummaryDto;
    });
}

export async function getTraineeCampaigns(
  userId: string,
): Promise<GetTraineeCampaignsResponseWithCountsDto> {
  const traineeProfile = await resolveActiveTraineeProfile(userId);
  const assignments = await TraineeCampaignRepository.findAccessibleCampaignAssignments(
    traineeProfile.id,
  );

  const parsed = getTraineeCampaignsResponseSchema.parse({
    campaigns: assignments.map(toCampaignSummary),
  });

  return parsed as GetTraineeCampaignsResponseWithCountsDto;
}

export async function getTraineeCampaignDetail(
  userId: string,
  campaignId: string,
): Promise<GetTraineeCampaignDetailResponseDto> {
  const traineeProfile = await resolveActiveTraineeProfile(userId);
  const assignment = await TraineeCampaignRepository.findAccessibleCampaignAssignment({
    traineeProfileId: traineeProfile.id,
    campaignId,
  });

  if (!assignment) {
    throw new TraineeCampaignNotFoundError();
  }

  const campaignEligibility = defaultCampaignEligibilityService.evaluateCampaignEligibility(
    assignment.campaign,
  );
  if (!campaignEligibility.canView) {
    throw new TraineeCampaignNotFoundError();
  }

  const progressByItemId = await getProgressByItemId({
    traineeProfileId: traineeProfile.id,
    campaignAssignmentId: assignment.id,
    items: assignment.campaign.items,
  });

  return getTraineeCampaignDetailResponseSchema.parse({
    ...toCampaignSummary(assignment),
    items: toCampaignItemTree({
      items: assignment.campaign.items,
      parentGroupId: null,
      campaignEligibility,
      progressByItemId,
    }),
  });
}

async function resolveActiveGeneralTrainee(userId: string) {
  const actor = await CampaignAssignmentRepository.findGeneralTraineeActorScope(userId);
  if (!actor || actor.authStatus !== 'ACTIVE') {
    throw new TraineeCampaignForbiddenError('User is not active');
  }
  if (actor.userType !== 'GENERAL_TRAINEE' || !actor.traineeProfile?.generalTraineeProfile) {
    throw new TraineeCampaignForbiddenError('Only general trainees can access this resource');
  }
  if (actor.traineeProfile.traineeStatus !== 'ACTIVE') {
    throw new TraineeCampaignForbiddenError('Trainee profile is inactive');
  }
  return {
    traineeProfileId: actor.traineeProfile.id,
    userId: actor.id,
  };
}

export async function listPlatformCampaigns(
  userId: string,
  query: ListPlatformCampaignsQueryDto,
): Promise<GetPlatformCampaignsResponseDto> {
  const trainee = await resolveActiveGeneralTrainee(userId);

  const { items, total } = await CampaignAssignmentRepository.findPlatformCampaignsForDiscovery({
    page: query.page,
    limit: query.limit,
    search: query.search,
    traineeProfileId: trainee.traineeProfileId,
  });

  const campaignItems: PlatformCampaignSummaryDto[] = items.map((item) => {
    const eligibility = defaultCampaignEligibilityService.evaluateCampaignEligibility({
      campaignType: item.campaignType as CampaignTypeDto,
      status: item.status as CampaignStatusDto,
      startDate: item.startDate,
      endDate: item.endDate,
    });

    const assignment = item.assignment ? toAssignmentSummary(item.assignment) : null;

    return {
      campaignId: item.id,
      name: item.name,
      description: item.description,
      accentColor: item.accentColor,
      campaignType: 'PREMADE_GENERAL' as const,
      difficultyLevel: item.difficultyLevel as DifficultyLevelDto,
      status: 'ACTIVE' as const,
      startDate: toIsoString(item.startDate),
      endDate: toIsoString(item.endDate),
      assignment,
      accessType: assignment?.accessType ?? null,
      isEnrolled: Boolean(assignment),
      progressStatus: null,
      itemCount: item.items.length,
      availableItemCount: item.items.filter((i) => i.availabilityStatus === 'AVAILABLE').length,
      eligibility,
    };
  });

  const totalPages = total > 0 ? Math.ceil(total / query.limit) : 0;
  const pagination = {
    page: query.page,
    limit: query.limit,
    totalItems: total,
    totalPages,
    hasNextPage: query.page < totalPages,
    hasPreviousPage: query.page > 1,
  };

  return getPlatformCampaignsResponseSchema.parse({
    items: campaignItems,
    pagination,
  });
}

export async function enrolPlatformCampaign(
  userId: string,
  campaignId: string,
): Promise<TraineeCampaignSummaryDto> {
  const trainee = await resolveActiveGeneralTrainee(userId);

  const result = await CampaignAssignmentRepository.enrolGeneralTraineeInPlatformCampaign({
    traineeProfileId: trainee.traineeProfileId,
    campaignId,
  });

  if (!result.success) {
    if (result.error === 'CAMPAIGN_NOT_FOUND') {
      throw new TraineeCampaignNotFoundError('Campaign was not found');
    }
    if (result.error === 'TRAINEE_NOT_ELIGIBLE') {
      throw new TraineeCampaignForbiddenError('Trainee is not eligible for self-enrolment');
    }
    if (result.error === 'CAMPAIGN_INACTIVE') {
      const eligibility = defaultCampaignEligibilityService.evaluateCampaignEligibility({
        campaignType: 'PREMADE_GENERAL',
        status: 'ARCHIVED',
        startDate: null,
        endDate: null,
      });
      defaultCampaignEligibilityService.assertCanProgress(eligibility);
    }
    throw new TraineeCampaignNotFoundError('Campaign was not found');
  }

  const campaignEligibility = defaultCampaignEligibilityService.evaluateCampaignEligibility({
    campaignType: result.campaign.campaignType as CampaignTypeDto,
    status: result.campaign.status as CampaignStatusDto,
    startDate: result.campaign.startDate,
    endDate: result.campaign.endDate,
  });

  defaultCampaignEligibilityService.assertCanProgress(campaignEligibility);

  const assignmentSummary = toAssignmentSummary(result.assignment);
  const itemCount = result.campaign.items.length;
  const availableItemCount = result.campaign.items.filter(
    (item) => item.availabilityStatus === 'AVAILABLE',
  ).length;

  return traineeCampaignSummarySchema.parse({
    campaignId: result.campaign.id,
    name: result.campaign.name,
    description: result.campaign.description,
    accentColor: result.campaign.accentColor,
    campaignType: 'PREMADE_GENERAL' as const,
    difficultyLevel: result.campaign.difficultyLevel as DifficultyLevelDto,
    status: 'ACTIVE' as const,
    startDate: toIsoString(result.campaign.startDate),
    endDate: toIsoString(result.campaign.endDate),
    assignment: assignmentSummary,
    accessType: assignmentSummary.accessType,
    itemCount,
    availableItemCount,
    eligibility: campaignEligibility,
  });
}

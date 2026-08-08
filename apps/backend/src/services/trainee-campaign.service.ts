import type {
  CampaignComponentTypeDto,
  GetTraineeCampaignDetailResponseDto,
  GetTraineeCampaignsResponseDto,
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
  getTraineeCampaignActivityApiPath,
  SUPPORTED_TRAINEE_CAMPAIGN_COMPONENT_TYPES,
} from '@insightful-phish/shared';
import * as TraineeCampaignRepository from '../repositories/trainee-campaign.repository.js';

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
};

type GetTraineeCampaignsResponseWithCountsDto = GetTraineeCampaignsResponseDto & {
  campaigns: TraineeCampaignSummaryWithCountsDto[];
};

export class TraineeCampaignNotFoundError extends Error {
  constructor(message = 'Campaign was not found') {
    super(message);
    this.name = 'TraineeCampaignNotFoundError';
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

function toIsoString(value: Date | null) {
  return value?.toISOString() ?? null;
}

function toAssignmentSummary(
  assignment: Pick<
    CampaignAssignmentSummary,
    | 'id'
    | 'assignmentStatus'
    | 'accessType'
    | 'currentCampaignItemId'
    | 'assignedAt'
    | 'dueDate'
    | 'startedAt'
    | 'completedAt'
  >,
): TraineeCampaignAssignmentSummaryDto {
  return {
    assignmentId: assignment.id,
    assignmentStatus: assignment.assignmentStatus,
    accessType: assignment.accessType,
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
  progressByItemId: Map<string, TraineeCampaignProgressStatusDto>;
}): TraineeCampaignComponentItemSummaryDto {
  const { item, progressByItemId } = input;

  if (!isSupportedComponentType(item.componentType)) {
    throw new TraineeCampaignNotFoundError();
  }

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
    isOpenable: isComponentOpenable(item),
    activityApiPath: getTraineeCampaignActivityApiPath(item.componentType, item.id),
    progressStatus: progressByItemId.get(item.id) ?? 'NOT_STARTED',
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
          progressByItemId: input.progressByItemId,
        });
      }

      const children = toCampaignItemTree({
        items: input.items,
        parentGroupId: item.id,
        progressByItemId: input.progressByItemId,
      }).map(
        (child): TraineeCampaignChildItemSummaryDto => ({
          ...child,
          parentGroupId: item.id,
        }),
      );

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

  return {
    campaigns: assignments.map(toCampaignSummary),
  };
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

  const progressByItemId = await getProgressByItemId({
    traineeProfileId: traineeProfile.id,
    campaignAssignmentId: assignment.id,
    items: assignment.campaign.items,
  });

  return {
    ...toCampaignSummary(assignment),
    items: toCampaignItemTree({
      items: assignment.campaign.items,
      parentGroupId: null,
      progressByItemId,
    }),
  };
}

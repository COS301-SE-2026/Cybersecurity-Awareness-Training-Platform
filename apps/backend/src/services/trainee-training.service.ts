import type {
  GetTrainingDocumentResponseDto,
  RecordTrainingInteractionResponseDto,
  TrainingInteractionEventTypeDto,
} from '@insightful-phish/shared';
import * as TraineeTrainingRepository from '../repositories/trainee-training.repository.js';

type TrainingCampaignItem = NonNullable<
  Awaited<ReturnType<typeof TraineeTrainingRepository.findTrainingCampaignItemById>>
>;
type CampaignAssignment = NonNullable<
  Awaited<ReturnType<typeof TraineeTrainingRepository.findAccessibleCampaignAssignment>>
>;

export class TrainingDocumentAccessNotFoundError extends Error {
  constructor(message = 'Training document was not found') {
    super(message);
    this.name = 'TrainingDocumentAccessNotFoundError';
  }
}

async function resolveTrainingDocumentAccess(userId: string, campaignItemId: string) {
  const traineeProfile = await TraineeTrainingRepository.findActiveTraineeProfileByUserId(userId);

  if (!traineeProfile) {
    throw new TrainingDocumentAccessNotFoundError();
  }

  const campaignItem = await TraineeTrainingRepository.findTrainingCampaignItemById(campaignItemId);

  if (!isAccessibleTrainingDocumentItem(campaignItem)) {
    throw new TrainingDocumentAccessNotFoundError();
  }

  const campaignAssignment = await TraineeTrainingRepository.findAccessibleCampaignAssignment({
    campaignId: campaignItem.campaignId,
    traineeProfileId: traineeProfile.id,
  });

  if (!campaignAssignment) {
    throw new TrainingDocumentAccessNotFoundError();
  }

  return {
    traineeProfileId: traineeProfile.id,
    campaignAssignment,
    campaignItem,
    trainingDocument: campaignItem.trainingDocument,
  };
}

function isAccessibleTrainingDocumentItem(
  campaignItem: TrainingCampaignItem | null,
): campaignItem is TrainingCampaignItem & {
  trainingDocument: NonNullable<TrainingCampaignItem['trainingDocument']>;
} {
  return Boolean(
    campaignItem &&
    campaignItem.campaign.status === 'ACTIVE' &&
    campaignItem.itemType === 'COMPONENT' &&
    campaignItem.componentType === 'TRAINING_DOCUMENT' &&
    campaignItem.availabilityStatus === 'AVAILABLE' &&
    campaignItem.trainingDocument &&
    campaignItem.trainingDocument.status === 'AVAILABLE',
  );
}

function toTrainingDocumentResponse(input: {
  campaignItem: TrainingCampaignItem & {
    trainingDocument: NonNullable<TrainingCampaignItem['trainingDocument']>;
  };
  campaignAssignment: CampaignAssignment;
}): GetTrainingDocumentResponseDto {
  const { campaignItem, campaignAssignment } = input;
  const { trainingDocument } = campaignItem;

  return {
    campaignItemId: campaignItem.id,
    campaignAssignmentId: campaignAssignment.id,
    trainingDocument: {
      id: trainingDocument.id,
      title: trainingDocument.title,
      contentType: trainingDocument.contentType,
      contentRef: trainingDocument.contentRef,
      contentSummary: trainingDocument.contentSummary,
      estimatedReadTimeMinutes: trainingDocument.estimatedReadTimeMinutes,
      difficultyLevel: trainingDocument.difficultyLevel,
      status: trainingDocument.status,
    },
    campaignItem: {
      title: campaignItem.title,
      description: campaignItem.description,
      position: campaignItem.position,
      isRequired: campaignItem.isRequired,
      availabilityStatus: campaignItem.availabilityStatus,
    },
  };
}

export async function getTrainingDocumentForCampaignItem(
  userId: string,
  campaignItemId: string,
): Promise<GetTrainingDocumentResponseDto> {
  const access = await resolveTrainingDocumentAccess(userId, campaignItemId);

  return toTrainingDocumentResponse({
    campaignItem: access.campaignItem,
    campaignAssignment: access.campaignAssignment,
  });
}

export async function recordTrainingInteraction(input: {
  userId: string;
  campaignItemId: string;
  eventType: TrainingInteractionEventTypeDto;
}): Promise<RecordTrainingInteractionResponseDto> {
  const access = await resolveTrainingDocumentAccess(input.userId, input.campaignItemId);

  const eventInput = {
    traineeProfileId: access.traineeProfileId,
    campaignAssignmentId: access.campaignAssignment.id,
    campaignItemId: access.campaignItem.id,
    trainingDocumentId: access.trainingDocument.id,
    eventType: input.eventType,
  };

  const event =
    input.eventType === 'TRAINING_COMPLETED'
      ? ((await TraineeTrainingRepository.findExistingTrainingCompletedEvent(eventInput)) ??
        (await TraineeTrainingRepository.createTrainingInteractionEvent(eventInput)))
      : await TraineeTrainingRepository.createTrainingInteractionEvent(eventInput);

  return {
    success: true,
    campaignItemId: access.campaignItem.id,
    trainingDocumentId: access.trainingDocument.id,
    event: {
      id: event.id,
      eventType: input.eventType,
      occurredAt: event.occurredAt.toISOString(),
    },
  };
}

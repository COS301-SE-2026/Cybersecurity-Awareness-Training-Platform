import type { z } from 'zod';
import type { SuccessResponseDto } from './common.js';
import type {
  CampaignAccessTypeDto,
  CampaignComponentTypeDto,
  CampaignGroupTypeDto,
  CampaignItemAvailabilityStatusDto,
  CampaignItemTypeDto,
  CampaignStatusDto,
  CampaignTypeDto,
  AssignmentStatusDto,
  CompletionRuleDto,
} from './entities.js';
import type { QuizStatusDto } from './quizzes.js';
import type { DifficultyLevelDto, TrainingDocumentStatusDto } from './training.js';
import type {
  getTraineeCampaignRequestParamsSchema,
  listTraineeCampaignsRequestSchema,
  traineeCampaignItemRequestParamsSchema,
} from './validation/campaigns.schemas.js';

export type GetTraineeCampaignRequestParamsDto = z.infer<
  typeof getTraineeCampaignRequestParamsSchema
>;

export type TraineeCampaignItemRequestParamsDto = z.infer<
  typeof traineeCampaignItemRequestParamsSchema
>;

export type ListTraineeCampaignsRequestDto = z.infer<typeof listTraineeCampaignsRequestSchema>;

export type TraineeCampaignProgressStatusDto =
  | 'NOT_STARTED'
  | 'VIEWED'
  | 'INTERACTED'
  | 'CLASSIFIED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'SUBMITTED';

export const SUPPORTED_TRAINEE_CAMPAIGN_COMPONENT_TYPES = [
  'SIMULATED_INBOX',
  'TRAINING_DOCUMENT',
  'QUIZ',
] as const satisfies readonly CampaignComponentTypeDto[];

export type SupportedTraineeCampaignComponentTypeDto =
  (typeof SUPPORTED_TRAINEE_CAMPAIGN_COMPONENT_TYPES)[number];

export function getTraineeCampaignActivityApiPath(
  componentType: SupportedTraineeCampaignComponentTypeDto,
  campaignItemId: string,
): string {
  const encodedCampaignItemId = encodeURIComponent(campaignItemId);

  switch (componentType) {
    case 'SIMULATED_INBOX':
      return `/trainee/campaign-items/${encodedCampaignItemId}/simulated-inbox`;
    case 'TRAINING_DOCUMENT':
      return `/trainee/campaign-items/${encodedCampaignItemId}/training-document`;
    case 'QUIZ':
      return `/trainee/campaign-items/${encodedCampaignItemId}/quiz`;
  }
}

export interface CampaignTrainingDocumentSummaryDto {
  id: string;
  title: string;
  contentSummary?: string | null;
  estimatedReadTimeMinutes?: number | null;
  difficultyLevel: DifficultyLevelDto;
  status: TrainingDocumentStatusDto;
}

export interface CampaignQuizSummaryDto {
  id: string;
  title: string;
  description?: string | null;
  passThresholdPercentage: number;
  difficultyLevel: DifficultyLevelDto;
  status: QuizStatusDto;
  questionCount?: number;
}

export interface CampaignSimulationSummaryDto {
  id: string;
  title: string;
  description?: string | null;
  difficultyLevel: DifficultyLevelDto;
}

export interface TraineeCampaignAssignmentSummaryDto {
  assignmentId: string;
  assignmentStatus: AssignmentStatusDto;
  accessType: CampaignAccessTypeDto;
  currentCampaignItemId?: string | null;
  assignedAt: string;
  dueDate?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface TraineeCampaignSummaryDto {
  campaignId: string;
  name: string;
  description?: string | null;
  accentColor?: string | null;
  campaignType: CampaignTypeDto;
  difficultyLevel: DifficultyLevelDto;
  status: CampaignStatusDto;
  startDate?: string | null;
  endDate?: string | null;
  assignment?: TraineeCampaignAssignmentSummaryDto | null;
  accessType?: CampaignAccessTypeDto | null;
  progressStatus?: TraineeCampaignProgressStatusDto | null;
}

interface TraineeCampaignItemSummaryBaseDto {
  campaignItemId: string;
  campaignId: string;
  parentGroupId?: string | null;
  itemType: CampaignItemTypeDto;
  title: string;
  description?: string | null;
  position: number;
  isRequired: boolean;
  availabilityStatus: CampaignItemAvailabilityStatusDto;
  isOpenable: boolean;
  progressStatus?: TraineeCampaignProgressStatusDto | null;
}

export interface TraineeCampaignComponentItemSummaryDto extends TraineeCampaignItemSummaryBaseDto {
  itemType: 'COMPONENT';
  componentType: SupportedTraineeCampaignComponentTypeDto;
  groupType?: null;
  completionRule?: null;
  activityApiPath: string;
  trainingDocument?: CampaignTrainingDocumentSummaryDto | null;
  quiz?: CampaignQuizSummaryDto | null;
  simulation?: CampaignSimulationSummaryDto | null;
}

export interface TraineeCampaignGroupItemSummaryDto extends TraineeCampaignItemSummaryBaseDto {
  itemType: 'GROUP';
  componentType?: null;
  groupType: CampaignGroupTypeDto;
  completionRule: CompletionRuleDto;
  isOpenable: false;
  activityApiPath?: null;
  children: TraineeCampaignChildItemSummaryDto[];
}

export type TraineeCampaignItemSummaryDto =
  | TraineeCampaignComponentItemSummaryDto
  | TraineeCampaignGroupItemSummaryDto;

export type TraineeCampaignChildItemSummaryDto = TraineeCampaignItemSummaryDto & {
  parentGroupId: string;
};

export type TraineeCampaignItemDto = TraineeCampaignItemSummaryDto;

export interface GetTraineeCampaignsResponseDto {
  campaigns: TraineeCampaignSummaryDto[];
}

export interface GetTraineeCampaignDetailResponseDto extends TraineeCampaignSummaryDto {
  items: TraineeCampaignItemSummaryDto[];
}

export type GetTraineeCampaignResponseDto = GetTraineeCampaignDetailResponseDto;

export interface TraineeCampaignActionResponseDto extends SuccessResponseDto {
  campaignId?: string;
  campaignItemId?: string;
}

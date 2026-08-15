import type { z } from 'zod';
import type { SuccessResponseDto } from './common.js';
import type {
  AssignmentStatusDto,
  CampaignAccessTypeDto,
  CampaignComponentTypeDto,
} from './entities.js';
import type { QuizStatusDto } from './quizzes.js';
import type { DifficultyLevelDto, TrainingDocumentStatusDto } from './training.js';
import type {
  campaignCatalogueItemSchema,
  campaignCatalogueQuerySchema,
  campaignDetailComponentItemSchema,
  campaignDetailGroupItemSchema,
  campaignDetailItemSchema,
  campaignDetailResponseSchema,
  campaignDraftComponentItemSchema,
  campaignDraftGroupItemSchema,
  campaignDraftItemSchema,
  campaignLifecycleActionResponseSchema,
  campaignListQuerySchema,
  campaignListRowSchema,
  campaignMutationPreconditionSchema,
  createCampaignDraftRequestSchema,
  enrolPlatformCampaignParamsSchema,
  enrolPlatformCampaignResponseSchema,
  getCampaignCatalogueResponseSchema,
  getCampaignsResponseSchema,
  getPlatformCampaignsResponseSchema,
  getTraineeCampaignDetailResponseSchema,
  getTraineeCampaignRequestParamsSchema,
  getTraineeCampaignsResponseSchema,
  listPlatformCampaignsQuerySchema,
  listTraineeCampaignsRequestSchema,
  platformCampaignSummarySchema,
  quizCatalogueItemSchema,
  simulatedInboxCatalogueItemSchema,
  traineeCampaignComponentItemSummarySchema,
  traineeCampaignGroupItemSummarySchema,
  traineeCampaignItemRequestParamsSchema,
  traineeCampaignItemSummarySchema,
  traineeCampaignSummarySchema,
  trainingDocumentCatalogueItemSchema,
  updateCampaignDraftRequestSchema,
} from './validation/campaigns.schemas.js';

export type GetTraineeCampaignRequestParamsDto = z.infer<
  typeof getTraineeCampaignRequestParamsSchema
>;

export type ListPlatformCampaignsQueryDto = z.infer<typeof listPlatformCampaignsQuerySchema>;
export type EnrolPlatformCampaignParamsDto = z.infer<typeof enrolPlatformCampaignParamsSchema>;
export type PlatformCampaignSummaryDto = z.infer<typeof platformCampaignSummarySchema>;
export type GetPlatformCampaignsResponseDto = z.infer<typeof getPlatformCampaignsResponseSchema>;
export type EnrolPlatformCampaignResponseDto = z.infer<typeof enrolPlatformCampaignResponseSchema>;

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

export type CampaignAllowedActionDto =
  | 'VIEW'
  | 'EDIT'
  | 'ACTIVATE'
  | 'ARCHIVE'
  | 'REACTIVATE'
  | 'ASSIGN';

export type CampaignEligibilityReasonDto =
  | 'AVAILABLE'
  | 'NOT_STARTED'
  | 'EXPIRED'
  | 'CAMPAIGN_INACTIVE'
  | 'COMPLETED';

export interface CampaignEligibilityDto {
  canView: boolean;
  canProgress: boolean;
  reason: CampaignEligibilityReasonDto;
}

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

export type TraineeCampaignSummaryDto = z.infer<typeof traineeCampaignSummarySchema>;

export type TraineeCampaignComponentItemSummaryDto = z.infer<
  typeof traineeCampaignComponentItemSummarySchema
>;

export type TraineeCampaignGroupItemSummaryDto = z.infer<
  typeof traineeCampaignGroupItemSummarySchema
>;

export type TraineeCampaignItemSummaryDto = z.infer<typeof traineeCampaignItemSummarySchema>;

export type TraineeCampaignChildItemSummaryDto = TraineeCampaignComponentItemSummaryDto & {
  parentGroupId: string;
};

export type TraineeCampaignItemDto = TraineeCampaignItemSummaryDto;

export type GetTraineeCampaignsResponseDto = z.infer<typeof getTraineeCampaignsResponseSchema>;

export type GetTraineeCampaignDetailResponseDto = z.infer<
  typeof getTraineeCampaignDetailResponseSchema
>;

export type GetTraineeCampaignResponseDto = GetTraineeCampaignDetailResponseDto;

export interface TraineeCampaignActionResponseDto extends SuccessResponseDto {
  campaignId?: string;
  campaignItemId?: string;
}

export type CampaignCatalogueQueryDto = z.infer<typeof campaignCatalogueQuerySchema>;
export type CampaignListQueryDto = z.infer<typeof campaignListQuerySchema>;
export type CreateCampaignDraftRequestDto = z.infer<typeof createCampaignDraftRequestSchema>;
export type UpdateCampaignDraftRequestDto = z.infer<typeof updateCampaignDraftRequestSchema>;
export type CampaignMutationPreconditionDto = z.infer<typeof campaignMutationPreconditionSchema>;

export type CampaignDraftComponentItemInputDto = z.infer<typeof campaignDraftComponentItemSchema>;
export type CampaignDraftGroupItemInputDto = z.infer<typeof campaignDraftGroupItemSchema>;
export type CampaignDraftItemInputDto = z.infer<typeof campaignDraftItemSchema>;

export type TrainingDocumentCatalogueItemDto = z.infer<typeof trainingDocumentCatalogueItemSchema>;
export type QuizCatalogueItemDto = z.infer<typeof quizCatalogueItemSchema>;
export type SimulatedInboxCatalogueItemDto = z.infer<typeof simulatedInboxCatalogueItemSchema>;
export type CampaignCatalogueItemDto = z.infer<typeof campaignCatalogueItemSchema>;
export type GetCampaignCatalogueResponseDto = z.infer<typeof getCampaignCatalogueResponseSchema>;

export type CampaignListRowDto = z.infer<typeof campaignListRowSchema>;
export type GetCampaignsResponseDto = z.infer<typeof getCampaignsResponseSchema>;

export type CampaignDetailComponentItemDto = z.infer<typeof campaignDetailComponentItemSchema>;
export type CampaignDetailGroupItemDto = z.infer<typeof campaignDetailGroupItemSchema>;
export type CampaignDetailItemDto = z.infer<typeof campaignDetailItemSchema>;
export type CampaignDetailResponseDto = z.infer<typeof campaignDetailResponseSchema>;
export type CampaignLifecycleActionResponseDto = z.infer<
  typeof campaignLifecycleActionResponseSchema
>;

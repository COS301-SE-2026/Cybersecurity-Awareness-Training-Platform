import type { z } from 'zod';
import type {
  assignableCampaignOptionSchema,
  campaignAssignmentCandidateOptionSchema,
  campaignAssignmentOptionsQuerySchema,
  campaignAssignmentReadRowSchema,
  campaignAssignmentResultRowSchema,
  campaignAssignmentsReadQuerySchema,
  campaignAssignmentSummarySchema,
  createCampaignAssignmentsResponseSchema,
  createCampaignAssignmentsSchema,
  deleteCampaignAssignmentResponseSchema,
  deletedProgressCountsSchema,
  getAssignableCampaignsResponseSchema,
  getCampaignAssignmentCandidatesResponseSchema,
  getCampaignAssignmentsResponseSchema,
  organisationAndAssignmentIdParamsSchema,
  organisationAndCampaignIdParamsSchema,
  organisationAndTraineeProfileIdParamsSchema,
  paginationMetaSchema,
} from './validation/campaign-assignment.schemas.js';

export type CampaignAssignmentOptionsQueryDto = z.infer<
  typeof campaignAssignmentOptionsQuerySchema
>;

export type OrganisationAndCampaignIdParamsDto = z.infer<
  typeof organisationAndCampaignIdParamsSchema
>;

export type OrganisationAndTraineeProfileIdParamsDto = z.infer<
  typeof organisationAndTraineeProfileIdParamsSchema
>;

export type OrganisationAndAssignmentIdParamsDto = z.infer<
  typeof organisationAndAssignmentIdParamsSchema
>;

export type DeletedProgressCountsDto = z.infer<typeof deletedProgressCountsSchema>;

export type DeleteCampaignAssignmentResponseDto = z.infer<
  typeof deleteCampaignAssignmentResponseSchema
>;

export type PaginationMetaDto = z.infer<typeof paginationMetaSchema>;

export type AssignableCampaignOptionDto = z.infer<typeof assignableCampaignOptionSchema>;

export type GetAssignableCampaignsResponseDto = z.infer<
  typeof getAssignableCampaignsResponseSchema
>;

export type CampaignAssignmentCandidateOptionDto = z.infer<
  typeof campaignAssignmentCandidateOptionSchema
>;

export type GetCampaignAssignmentCandidatesResponseDto = z.infer<
  typeof getCampaignAssignmentCandidatesResponseSchema
>;

export type CreateCampaignAssignmentsRequestDto = z.infer<typeof createCampaignAssignmentsSchema>;

export type CampaignAssignmentResultRowDto = z.infer<typeof campaignAssignmentResultRowSchema>;

export type CampaignAssignmentSummaryDto = z.infer<typeof campaignAssignmentSummarySchema>;

export type CreateCampaignAssignmentsResponseDto = z.infer<
  typeof createCampaignAssignmentsResponseSchema
>;

export type CampaignAssignmentsReadQueryDto = z.infer<typeof campaignAssignmentsReadQuerySchema>;

export type CampaignAssignmentReadRowDto = z.infer<typeof campaignAssignmentReadRowSchema>;

export type GetCampaignAssignmentsResponseDto = z.infer<
  typeof getCampaignAssignmentsResponseSchema
>;

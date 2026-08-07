import type { z } from 'zod';
import type {
  assignableCampaignOptionSchema,
  campaignAssignmentCandidateOptionSchema,
  campaignAssignmentOptionsQuerySchema,
  getAssignableCampaignsResponseSchema,
  getCampaignAssignmentCandidatesResponseSchema,
  paginationMetaSchema,
} from './validation/campaign-assignment.schemas.js';

export type CampaignAssignmentOptionsQueryDto = z.infer<
  typeof campaignAssignmentOptionsQuerySchema
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

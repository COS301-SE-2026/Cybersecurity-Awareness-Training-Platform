import type {
  CampaignCatalogueQueryDto,
  CampaignDetailResponseDto,
  CampaignLifecycleActionResponseDto,
  CampaignListQueryDto,
  CampaignMutationPreconditionDto,
  CreateCampaignDraftRequestDto,
  GetCampaignCatalogueResponseDto,
  GetCampaignsResponseDto,
  UpdateCampaignDraftRequestDto,
} from '@insightful-phish/shared';
import type { CampaignManagementContext } from './campaignManagement.types';

export type CampaignManagementErrorCode =
  | 'CAMPAIGN_CHANGED'
  | 'CAMPAIGN_IMMUTABLE'
  | 'LIFECYCLE_CONFLICT'
  | 'EMPTY_CAMPAIGN'
  | 'UNAVAILABLE_CAMPAIGN_CONTENT';

export class CampaignManagementClientError extends Error {
  readonly code: CampaignManagementErrorCode;

  constructor(code: CampaignManagementErrorCode) {
    super(code);
    this.name = 'CampaignManagementClientError';
    this.code = code;
  }
}

export interface CampaignManagementClient {
  listCampaigns(
    context: CampaignManagementContext,
    query: CampaignListQueryDto,
  ): Promise<GetCampaignsResponseDto>;
  getCampaignCatalogue(
    context: CampaignManagementContext,
    query: CampaignCatalogueQueryDto,
  ): Promise<GetCampaignCatalogueResponseDto>;
  getCampaignDetail(
    context: CampaignManagementContext,
    campaignId: string,
  ): Promise<CampaignDetailResponseDto>;
  createCampaignDraft(
    context: CampaignManagementContext,
    request: CreateCampaignDraftRequestDto,
  ): Promise<CampaignDetailResponseDto>;
  updateCampaignDraft(
    context: CampaignManagementContext,
    campaignId: string,
    request: UpdateCampaignDraftRequestDto,
  ): Promise<CampaignDetailResponseDto>;
  activateCampaign(
    context: CampaignManagementContext,
    campaignId: string,
    request: CampaignMutationPreconditionDto,
  ): Promise<CampaignLifecycleActionResponseDto>;
}

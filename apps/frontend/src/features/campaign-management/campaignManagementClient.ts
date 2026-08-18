import type {
  CampaignCatalogueQueryDto,
  CampaignDetailResponseDto,
  CampaignListQueryDto,
  CreateCampaignDraftRequestDto,
  GetCampaignCatalogueResponseDto,
  GetCampaignsResponseDto,
  UpdateCampaignDraftRequestDto,
} from '@insightful-phish/shared';
import type { CampaignManagementContext } from './campaignManagement.types';

export type CampaignManagementErrorCode = 'CAMPAIGN_CHANGED' | 'CAMPAIGN_IMMUTABLE';

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
}

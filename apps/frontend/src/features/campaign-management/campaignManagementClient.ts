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
  | 'UNAVAILABLE_CAMPAIGN_CONTENT'
  | (string & Record<never, never>);

export class CampaignManagementClientError extends Error {
  readonly code: CampaignManagementErrorCode;
  readonly status: number | undefined;
  readonly details?: unknown;

  constructor(
    code: CampaignManagementErrorCode,
    options: Readonly<{
      message?: string;
      status?: number;
      details?: unknown;
    }> = {},
  ) {
    super(options.message ?? code);
    this.name = 'CampaignManagementClientError';
    this.code = code;
    this.status = options.status;
    this.details = options.details;
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
  archiveCampaign(
    context: CampaignManagementContext,
    campaignId: string,
    request: CampaignMutationPreconditionDto,
  ): Promise<CampaignLifecycleActionResponseDto>;
  reactivateCampaign(
    context: CampaignManagementContext,
    campaignId: string,
    request: CampaignMutationPreconditionDto,
  ): Promise<CampaignLifecycleActionResponseDto>;
}

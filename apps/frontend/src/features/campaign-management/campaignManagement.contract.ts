/**
 *Temporary file that is what issue 460 will eventually returns so integrations is easier
 */

export type CampaignAllowedActionDto =
  | 'VIEW'
  | 'EDIT'
  | 'ACTIVATE'
  | 'ARCHIVE'
  | 'REACTIVATE'
  | 'ASSIGN';

export type CampaignTypeDto = 'PREMADE_GENERAL' | 'ORGANISATION_CUSTOM';

export type CampaignStatusDto = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';

export type CampaignListStatusFilterDto = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export type CampaignListQueryDto = {
  page: number;
  limit: number;
  search?: string;
  status?: CampaignListStatusFilterDto;
};

export type CampaignListCreatorDto = {
  id: string;
  displayName: string;
  email?: string;
};

export type CampaignListRowDto = {
  id: string;
  name: string;
  description?: string | null;
  accentColor?: string | null;
  campaignType: CampaignTypeDto;
  status: CampaignStatusDto;
  itemCount: number;
  startDate?: string | null;
  endDate?: string | null;
  createdBy?: CampaignListCreatorDto | null;
  createdAt: string;
  updatedAt: string;
  allowedActions: CampaignAllowedActionDto[];
};

export type PaginationMetadataDto = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type GetCampaignsResponseDto = {
  items: CampaignListRowDto[];
  pagination: PaginationMetadataDto;
};

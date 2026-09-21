import type {
  CampaignDraftAdaptiveItemInputDto,
  CampaignDraftComponentItemInputDto,
  CampaignDraftGroupItemInputDto,
} from '@insightful-phish/shared';

export type CampaignManagementContext =
  | {
      kind: 'organisation';
      organisationId: string;
    }
  | {
      kind: 'platform';
    };

export type CampaignDraftComponentItemState = {
  itemType: 'COMPONENT';
  campaignItemId?: string;
  componentType: CampaignDraftComponentItemInputDto['componentType'];
  contentId: string;
  title: string;
  description: string | null;
  isRequired: boolean;
  sourceAvailable: boolean;
  maxAttempts?: number;
  scorePolicy?: 'BEST' | 'LATEST' | 'AVERAGE';
};

export type CampaignDraftAdaptiveItemState = {
  itemType: 'ADAPTIVE';
  campaignItemId?: string;
  componentType: CampaignDraftAdaptiveItemInputDto['componentType'];
  alternatives: CampaignDraftAdaptiveItemInputDto['alternatives'];
  title: string;
  description: string | null;
  isRequired: boolean;
  sourceAvailable: boolean;
  maxAttempts?: number;
  scorePolicy?: 'BEST' | 'LATEST' | 'AVERAGE';
};

export type CampaignDraftConsumableItemState =
  | CampaignDraftComponentItemState
  | CampaignDraftAdaptiveItemState;

export type CampaignDraftGroupItemState = {
  itemType: 'GROUP';
  campaignItemId?: string;
  clientId?: string;
  title: string;
  description: string | null;
  groupType: CampaignDraftGroupItemInputDto['groupType'];
  completionRule: CampaignDraftGroupItemInputDto['completionRule'];
  isRequired: boolean;
  children: readonly CampaignDraftConsumableItemState[];
};

export type CampaignDraftItemState = CampaignDraftConsumableItemState | CampaignDraftGroupItemState;

export type CampaignDraftFormState = {
  name: string;
  description: string;
  accentColor: string;
  startDate: string;
  endDate: string;
  items: readonly CampaignDraftItemState[];
};

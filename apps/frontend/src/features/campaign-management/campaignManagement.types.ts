import type {
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
};

export type CampaignDraftGroupItemState = {
  itemType: 'GROUP';
  campaignItemId: string;
  title: string;
  description: string | null;
  groupType: CampaignDraftGroupItemInputDto['groupType'];
  completionRule: CampaignDraftGroupItemInputDto['completionRule'];
  isRequired: boolean;
  children: readonly CampaignDraftComponentItemState[];
};

export type CampaignDraftItemState = CampaignDraftComponentItemState | CampaignDraftGroupItemState;

export type CampaignDraftFormState = {
  name: string;
  description: string;
  accentColor: string;
  startDate: string;
  endDate: string;
  items: readonly CampaignDraftItemState[];
};

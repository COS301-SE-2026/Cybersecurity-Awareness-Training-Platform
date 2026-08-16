export type CampaignManagementContext =
  | {
      kind: 'organisation';
      organisationId: string;
    }
  | {
      kind: 'platform';
    };

export type CampaignDraftFormState = {
  name: string;
  description: string;
  accentColor: string;
  startDate: string;
  endDate: string;
};

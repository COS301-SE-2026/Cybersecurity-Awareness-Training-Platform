export type CampaignManagementContext =
  | {
      kind: 'organisation';
      organisationId: string;
    }
  | {
      kind: 'platform';
    };

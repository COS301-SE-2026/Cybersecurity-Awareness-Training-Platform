ALTER TABLE "Campaign" ADD CONSTRAINT "campaign_ownership_type_check"
CHECK (
  ("campaignType" = 'PREMADE_GENERAL' AND "organisationId" IS NULL) OR
  ("campaignType" = 'ORGANISATION_CUSTOM' AND "organisationId" IS NOT NULL)
);

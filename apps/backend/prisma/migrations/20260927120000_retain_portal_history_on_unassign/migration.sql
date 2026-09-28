ALTER TABLE "ManagedPortalLink"
ADD COLUMN "historicalCampaignAssignmentId" TEXT,
ADD COLUMN "campaignId" TEXT;

UPDATE "ManagedPortalLink" mpl
SET "historicalCampaignAssignmentId" = mpl."campaignAssignmentId",
    "campaignId" = ca."campaignId"
FROM "CampaignAssignment" ca
WHERE ca."id" = mpl."campaignAssignmentId";

ALTER TABLE "ManagedPortalLink" DROP CONSTRAINT "ManagedPortalLink_source_context_check";
ALTER TABLE "ManagedPortalLink"
ADD CONSTRAINT "ManagedPortalLink_source_context_check" CHECK (
  (
    "phishingSimulationMessageId" IS NULL
    AND "historicalCampaignAssignmentId" IS NOT NULL
    AND "campaignId" IS NOT NULL
    AND "campaignItemId" IS NOT NULL
    AND "simulatedEmailId" IS NOT NULL
    AND ("campaignAssignmentId" IS NOT NULL OR "revokedAt" IS NOT NULL)
  ) OR (
    "phishingSimulationMessageId" IS NOT NULL
    AND "historicalCampaignAssignmentId" IS NULL
    AND "campaignId" IS NULL
    AND "campaignAssignmentId" IS NULL
    AND "campaignItemId" IS NULL
    AND "simulatedEmailId" IS NULL
  )
);

ALTER TABLE "ManagedPortalLink"
ADD CONSTRAINT "ManagedPortalLink_campaignId_fkey"
FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ManagedPortalLink" DROP CONSTRAINT "ManagedPortalLink_campaignAssignmentId_fkey";
ALTER TABLE "ManagedPortalLink"
ADD CONSTRAINT "ManagedPortalLink_campaignAssignmentId_fkey"
FOREIGN KEY ("campaignAssignmentId") REFERENCES "CampaignAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP INDEX "ManagedPortalLink_occurrence_key";
CREATE UNIQUE INDEX "ManagedPortalLink_occurrence_key"
ON "ManagedPortalLink"("historicalCampaignAssignmentId", "campaignItemId", "simulatedEmailId");
CREATE INDEX "ManagedPortalLink_historicalCampaignAssignmentId_idx"
ON "ManagedPortalLink"("historicalCampaignAssignmentId");
CREATE INDEX "ManagedPortalLink_campaignId_idx" ON "ManagedPortalLink"("campaignId");

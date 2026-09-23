CREATE TYPE "AdaptiveEvidenceStatus" AS ENUM ('SUFFICIENT', 'INSUFFICIENT');
CREATE TYPE "AdaptiveResolutionBasis" AS ENUM ('EVIDENCE', 'FALLBACK');

CREATE TABLE "AdaptiveCampaignResolution" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "campaignAssignmentId" TEXT NOT NULL,
    "campaignItemId" TEXT NOT NULL,
    "selectedAlternativeId" TEXT,
    "selectedDifficulty" "DifficultyLevel" NOT NULL,
    "selectedContentId" TEXT NOT NULL,
    "evidenceStatus" "AdaptiveEvidenceStatus" NOT NULL,
    "resolutionBasis" "AdaptiveResolutionBasis" NOT NULL,
    "resolvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdaptiveCampaignResolution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdaptiveCampaignResolution_campaignAssignmentId_campaignItemId_key"
ON "AdaptiveCampaignResolution"("campaignAssignmentId", "campaignItemId");

CREATE INDEX "AdaptiveCampaignResolution_campaignId_idx"
ON "AdaptiveCampaignResolution"("campaignId");

CREATE INDEX "AdaptiveCampaignResolution_campaignItemId_idx"
ON "AdaptiveCampaignResolution"("campaignItemId");

CREATE INDEX "AdaptiveCampaignResolution_selectedAlternativeId_idx"
ON "AdaptiveCampaignResolution"("selectedAlternativeId");

ALTER TABLE "AdaptiveCampaignResolution"
ADD CONSTRAINT "AdaptiveCampaignResolution_campaignId_fkey"
FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdaptiveCampaignResolution"
ADD CONSTRAINT "AdaptiveCampaignResolution_campaignAssignmentId_fkey"
FOREIGN KEY ("campaignAssignmentId") REFERENCES "CampaignAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdaptiveCampaignResolution"
ADD CONSTRAINT "AdaptiveCampaignResolution_campaignItemId_fkey"
FOREIGN KEY ("campaignItemId") REFERENCES "CampaignItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdaptiveCampaignResolution"
ADD CONSTRAINT "AdaptiveCampaignResolution_selectedAlternativeId_fkey"
FOREIGN KEY ("selectedAlternativeId") REFERENCES "CampaignAdaptiveAlternative"("id") ON DELETE SET NULL ON UPDATE CASCADE;

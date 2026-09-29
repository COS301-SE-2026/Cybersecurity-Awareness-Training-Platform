-- AlterTable
ALTER TABLE "PhishingSimulationMessage" ADD COLUMN     "publicOrigin" TEXT;

-- RenameIndex
ALTER INDEX "AdaptiveCampaignResolution_campaignAssignmentId_campaignItemId_" RENAME TO "AdaptiveCampaignResolution_campaignAssignmentId_campaignIte_key";

-- CreateEnum
CREATE TYPE "PhishingSimulationStopReason" AS ENUM ('CAMPAIGN_INACTIVE', 'NO_ELIGIBLE_RECIPIENTS', 'NO_VALID_SEND_WINDOW');

-- CreateEnum
CREATE TYPE "PortalTemplateId" AS ENUM ('GENERIC_ACCOUNT_LOGIN_V1', 'GENERIC_DOCUMENT_ACCESS_V1', 'GENERIC_BANKING_LOGIN_V1');

-- AlterTable
ALTER TABLE "PhishingSimulation" ADD COLUMN     "stopReason" "PhishingSimulationStopReason";

-- CreateTable
CREATE TABLE "PhishingSimulationRecipient" (
    "id" TEXT NOT NULL,
    "phishingSimulationId" TEXT NOT NULL,
    "campaignAssignmentId" TEXT NOT NULL,
    "traineeProfileId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "recipientFirstName" TEXT NOT NULL,
    "recipientLastName" TEXT NOT NULL,
    "snapshottedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhishingSimulationRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhishingSimulationMessage" (
    "id" TEXT NOT NULL,
    "phishingSimulationId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "poolEmailId" TEXT NOT NULL,
    "providerProfileId" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "portalTemplateId" "PortalTemplateId",

    CONSTRAINT "PhishingSimulationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PhishingSimulationRecipient_phishingSimulationId_campaignAs_key" ON "PhishingSimulationRecipient"("phishingSimulationId", "campaignAssignmentId");

-- CreateIndex
CREATE INDEX "PhishingSimulationMessage_phishingSimulationId_idx" ON "PhishingSimulationMessage"("phishingSimulationId");

-- CreateIndex
CREATE INDEX "PhishingSimulationMessage_scheduledFor_idx" ON "PhishingSimulationMessage"("scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "PhishingSimulationMessage_recipientId_poolEmailId_key" ON "PhishingSimulationMessage"("recipientId", "poolEmailId");

-- CreateIndex
CREATE INDEX "PhishingSimulation_status_startAt_idx" ON "PhishingSimulation"("status", "startAt");

-- AddForeignKey
ALTER TABLE "PhishingSimulationRecipient" ADD CONSTRAINT "PhishingSimulationRecipient_phishingSimulationId_fkey" FOREIGN KEY ("phishingSimulationId") REFERENCES "PhishingSimulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhishingSimulationMessage" ADD CONSTRAINT "PhishingSimulationMessage_phishingSimulationId_fkey" FOREIGN KEY ("phishingSimulationId") REFERENCES "PhishingSimulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhishingSimulationMessage" ADD CONSTRAINT "PhishingSimulationMessage_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "PhishingSimulationRecipient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

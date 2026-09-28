/*
  Warnings:

  - A unique constraint covering the columns `[emailDeliveryLogId]` on the table `PhishingSimulationMessage` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[trackingTokenHash]` on the table `PhishingSimulationMessage` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PhishingSimulationMessageDispatchStatus" AS ENUM ('PENDING', 'QUEUED', 'SUBMITTED', 'FAILED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "EmailDeliveryType" ADD VALUE 'PHISHING_SIMULATION_MESSAGE';

-- AlterEnum
ALTER TYPE "PhishingSimulationStopReason" ADD VALUE 'ADMIN_STOPPED';

-- AlterTable
ALTER TABLE "PhishingSimulationMessage" ADD COLUMN     "actualFromAddress" TEXT,
ADD COLUMN     "actualFromName" TEXT,
ADD COLUMN     "actualReplyTo" TEXT,
ADD COLUMN     "dispatchStatus" "PhishingSimulationMessageDispatchStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "emailDeliveryLogId" TEXT,
ADD COLUMN     "trackingTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "trackingTokenHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PhishingSimulationMessage_emailDeliveryLogId_key" ON "PhishingSimulationMessage"("emailDeliveryLogId");

-- CreateIndex
CREATE UNIQUE INDEX "PhishingSimulationMessage_trackingTokenHash_key" ON "PhishingSimulationMessage"("trackingTokenHash");

-- AddForeignKey
ALTER TABLE "PhishingSimulationMessage" ADD CONSTRAINT "PhishingSimulationMessage_emailDeliveryLogId_fkey" FOREIGN KEY ("emailDeliveryLogId") REFERENCES "EmailDeliveryLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

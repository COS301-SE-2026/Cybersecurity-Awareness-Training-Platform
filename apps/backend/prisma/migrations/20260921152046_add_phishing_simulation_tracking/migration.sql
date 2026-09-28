-- CreateEnum
CREATE TYPE "PhishingSimulationTrackingEventType" AS ENUM ('LINK_CLICKED');

-- CreateTable
CREATE TABLE "PhishingSimulationTrackingEvent" (
    "id" TEXT NOT NULL,
    "phishingSimulationId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "eventType" "PhishingSimulationTrackingEventType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhishingSimulationTrackingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PhishingSimulationTrackingEvent_messageId_eventType_idx" ON "PhishingSimulationTrackingEvent"("messageId", "eventType");

-- CreateIndex
CREATE INDEX "PhishingSimulationTrackingEvent_phishingSimulationId_occurr_idx" ON "PhishingSimulationTrackingEvent"("phishingSimulationId", "occurredAt");

-- AddForeignKey
ALTER TABLE "PhishingSimulationTrackingEvent" ADD CONSTRAINT "PhishingSimulationTrackingEvent_phishingSimulationId_fkey" FOREIGN KEY ("phishingSimulationId") REFERENCES "PhishingSimulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhishingSimulationTrackingEvent" ADD CONSTRAINT "PhishingSimulationTrackingEvent_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "PhishingSimulationMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "Weekday" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "PhishingSimulationStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'STOPPED');

-- CreateTable
CREATE TABLE "PhishingSimulation" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "status" "PhishingSimulationStatus" NOT NULL DEFAULT 'DRAFT',
    "name" TEXT,
    "emailCount" INTEGER,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "sendFrom" TEXT,
    "sendUntil" TEXT,
    "weekdays" "Weekday"[] NOT NULL DEFAULT ARRAY[]::"Weekday"[],
    "providerProfileIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhishingSimulation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PhishingSimulation_organisationId_idx" ON "PhishingSimulation"("organisationId");

-- CreateIndex
CREATE INDEX "PhishingSimulation_campaignId_idx" ON "PhishingSimulation"("campaignId");

-- AddForeignKey
ALTER TABLE "PhishingSimulation" ADD CONSTRAINT "PhishingSimulation_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhishingSimulation" ADD CONSTRAINT "PhishingSimulation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

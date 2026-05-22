-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM ('ORGANISATION_ASSIGNED', 'PREMADE_GENERAL');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LearningPathContextType" AS ENUM ('ORGANISATION', 'PREMADE_GENERAL');

-- CreateEnum
CREATE TYPE "LearningPathStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SimulationType" AS ENUM ('PHISHING_EMAIL');

-- CreateEnum
CREATE TYPE "SafetyStatus" AS ENUM ('DRAFT', 'APPROVED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "InboxSummaryStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "TrainingContentType" AS ENUM ('MARKDOWN', 'HTML', 'URL');

-- CreateEnum
CREATE TYPE "ReadableStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TrainingProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT,
    "name" TEXT NOT NULL,
    "campaignType" "CampaignType" NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignAssignment" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "membershipId" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignmentStatus" "AssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningPath" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contextType" "LearningPathContextType" NOT NULL,
    "status" "LearningPathStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningPath_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Simulation" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "simulationType" "SimulationType" NOT NULL,
    "objective" TEXT,
    "safetyStatus" "SafetyStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Simulation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulatedInbox" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "summaryStatus" "InboxSummaryStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SimulatedInbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulatedEmail" (
    "id" TEXT NOT NULL,
    "inboxId" TEXT NOT NULL,
    "simulationId" TEXT,
    "trainingDocumentId" TEXT,
    "senderLabel" TEXT NOT NULL,
    "senderEmail" TEXT,
    "subject" TEXT NOT NULL,
    "preview" TEXT,
    "body" TEXT NOT NULL,
    "isSimulated" BOOLEAN NOT NULL DEFAULT true,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SimulatedEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingModule" (
    "id" TEXT NOT NULL,
    "learningPathId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "difficulty" "DifficultyLevel" NOT NULL DEFAULT 'BEGINNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingDocument" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contentType" "TrainingContentType" NOT NULL,
    "contentRef" TEXT NOT NULL,
    "readableStatus" "ReadableStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trainingDocumentId" TEXT NOT NULL,
    "status" "TrainingProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Campaign_organisationId_idx" ON "Campaign"("organisationId");

-- CreateIndex
CREATE INDEX "Campaign_campaignType_idx" ON "Campaign"("campaignType");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX "CampaignAssignment_campaignId_idx" ON "CampaignAssignment"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignAssignment_userId_idx" ON "CampaignAssignment"("userId");

-- CreateIndex
CREATE INDEX "CampaignAssignment_membershipId_idx" ON "CampaignAssignment"("membershipId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignAssignment_campaignId_userId_key" ON "CampaignAssignment"("campaignId", "userId");

-- CreateIndex
CREATE INDEX "LearningPath_campaignId_idx" ON "LearningPath"("campaignId");

-- CreateIndex
CREATE INDEX "LearningPath_status_idx" ON "LearningPath"("status");

-- CreateIndex
CREATE INDEX "Simulation_campaignId_idx" ON "Simulation"("campaignId");

-- CreateIndex
CREATE INDEX "Simulation_simulationType_idx" ON "Simulation"("simulationType");

-- CreateIndex
CREATE INDEX "Simulation_safetyStatus_idx" ON "Simulation"("safetyStatus");

-- CreateIndex
CREATE UNIQUE INDEX "SimulatedInbox_ownerUserId_key" ON "SimulatedInbox"("ownerUserId");

-- CreateIndex
CREATE INDEX "SimulatedEmail_inboxId_idx" ON "SimulatedEmail"("inboxId");

-- CreateIndex
CREATE INDEX "SimulatedEmail_simulationId_idx" ON "SimulatedEmail"("simulationId");

-- CreateIndex
CREATE INDEX "SimulatedEmail_trainingDocumentId_idx" ON "SimulatedEmail"("trainingDocumentId");

-- CreateIndex
CREATE INDEX "SimulatedEmail_receivedAt_idx" ON "SimulatedEmail"("receivedAt");

-- CreateIndex
CREATE INDEX "TrainingModule_learningPathId_idx" ON "TrainingModule"("learningPathId");

-- CreateIndex
CREATE INDEX "TrainingDocument_moduleId_idx" ON "TrainingDocument"("moduleId");

-- CreateIndex
CREATE INDEX "TrainingDocument_readableStatus_idx" ON "TrainingDocument"("readableStatus");

-- CreateIndex
CREATE INDEX "TrainingProgress_userId_idx" ON "TrainingProgress"("userId");

-- CreateIndex
CREATE INDEX "TrainingProgress_trainingDocumentId_idx" ON "TrainingProgress"("trainingDocumentId");

-- CreateIndex
CREATE INDEX "TrainingProgress_status_idx" ON "TrainingProgress"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingProgress_userId_trainingDocumentId_key" ON "TrainingProgress"("userId", "trainingDocumentId");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignAssignment" ADD CONSTRAINT "CampaignAssignment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignAssignment" ADD CONSTRAINT "CampaignAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignAssignment" ADD CONSTRAINT "CampaignAssignment_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "OrganisationMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningPath" ADD CONSTRAINT "LearningPath_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Simulation" ADD CONSTRAINT "Simulation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulatedInbox" ADD CONSTRAINT "SimulatedInbox_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulatedEmail" ADD CONSTRAINT "SimulatedEmail_inboxId_fkey" FOREIGN KEY ("inboxId") REFERENCES "SimulatedInbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulatedEmail" ADD CONSTRAINT "SimulatedEmail_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "Simulation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulatedEmail" ADD CONSTRAINT "SimulatedEmail_trainingDocumentId_fkey" FOREIGN KEY ("trainingDocumentId") REFERENCES "TrainingDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingModule" ADD CONSTRAINT "TrainingModule_learningPathId_fkey" FOREIGN KEY ("learningPathId") REFERENCES "LearningPath"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingDocument" ADD CONSTRAINT "TrainingDocument_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "TrainingModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingProgress" ADD CONSTRAINT "TrainingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingProgress" ADD CONSTRAINT "TrainingProgress_trainingDocumentId_fkey" FOREIGN KEY ("trainingDocumentId") REFERENCES "TrainingDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

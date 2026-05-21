/*
  Warnings:

  - The values [ORGANISATION_ASSIGNED] on the enum `CampaignType` will be removed. If these variants are still used in the database, this will fail.
  - The values [EMAIL_OPENED,EMAIL_LINK_CLICKED] on the enum `InteractionEventType` will be removed. If these variants are still used in the database, this will fail.
  - The values [PHISHING_EMAIL] on the enum `SimulationType` will be removed. If these variants are still used in the database, this will fail.
  - The values [COMPANY_ADMIN,COMPANY_LEARNER] on the enum `UserType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `feedback` on the `AnswerOption` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `AnswerOption` table. All the data in the column will be lost.
  - You are about to drop the column `selectedOptionId` on the `AttemptAnswer` table. All the data in the column will be lost.
  - You are about to drop the column `membershipId` on the `CampaignAssignment` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `CampaignAssignment` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `InteractionEvent` table. All the data in the column will be lost.
  - You are about to drop the column `contextStatus` on the `Organisation` table. All the data in the column will be lost.
  - You are about to drop the column `trainingDocumentId` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the column `trainingProgressId` on the `QuizAttempt` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `QuizAttempt` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `QuizQuestion` table. All the data in the column will be lost.
  - You are about to drop the column `isRead` on the `SimulatedEmail` table. All the data in the column will be lost.
  - You are about to drop the column `recommendedTrainingDocumentId` on the `SimulatedEmail` table. All the data in the column will be lost.
  - You are about to drop the column `simulationId` on the `SimulatedEmail` table. All the data in the column will be lost.
  - You are about to drop the column `ownerUserId` on the `SimulatedInbox` table. All the data in the column will be lost.
  - You are about to drop the column `campaignId` on the `Simulation` table. All the data in the column will be lost.
  - You are about to drop the column `moduleId` on the `TrainingDocument` table. All the data in the column will be lost.
  - You are about to drop the `CompanyContext` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Department` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FeedbackItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GeneralLearningAccess` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LearningPath` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OrganisationMembership` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TrainingModule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TrainingProgress` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[questionId,position]` on the table `AnswerOption` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[campaignId,learnerProfileId]` on the table `CampaignAssignment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[quizId,position]` on the table `QuizQuestion` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[simulationId]` on the table `SimulatedInbox` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `position` to the `AnswerOption` table without a default value. This is not possible if the table is not empty.
  - Added the required column `learnerProfileId` to the `CampaignAssignment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `learnerProfileId` to the `InteractionEvent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `learnerProfileId` to the `QuizAttempt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `position` to the `QuizQuestion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expectedClassification` to the `SimulatedEmail` table without a default value. This is not possible if the table is not empty.
  - Added the required column `simulationId` to the `SimulatedInbox` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `SimulatedInbox` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Simulation` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LearnerStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "OrganisationUserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AdminStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "GeneralLearnerAccessSource" AS ENUM ('SELF_SIGNUP', 'INVITE', 'SEED', 'ADMIN_CREATED');

-- CreateEnum
CREATE TYPE "OrganisationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OrganisationContextType" AS ENUM ('LOGO', 'BRAND_GUIDELINES', 'SECURITY_POLICY', 'STAFF_STRUCTURE', 'INTERNAL_TERMINOLOGY', 'APPROVED_DOMAINS', 'EMAIL_SIGNATURE_FORMAT', 'OTHER');

-- CreateEnum
CREATE TYPE "OrganisationContextProcessingStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'READY', 'NEEDS_REVIEW', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CampaignItemType" AS ENUM ('COMPONENT', 'GROUP');

-- CreateEnum
CREATE TYPE "CampaignComponentType" AS ENUM ('TRAINING_DOCUMENT', 'QUIZ', 'SIMULATED_INBOX');

-- CreateEnum
CREATE TYPE "CampaignGroupType" AS ENUM ('SECTION', 'MODULE', 'REVISION_SET', 'ASSESSMENT_SET', 'SIMULATION_SET');

-- CreateEnum
CREATE TYPE "CompletionRule" AS ENUM ('COMPLETE_ALL', 'COMPLETE_ANY', 'COMPLETE_REQUIRED_ONLY');

-- CreateEnum
CREATE TYPE "CampaignItemAvailabilityStatus" AS ENUM ('AVAILABLE', 'LOCKED', 'UNAVAILABLE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CampaignAccessType" AS ENUM ('ASSIGNED', 'SELF_SELECTED');

-- CreateEnum
CREATE TYPE "CampaignPrerequisiteRequirementType" AS ENUM ('COMPLETION_REQUIRED');

-- CreateEnum
CREATE TYPE "EmailClassification" AS ENUM ('SAFE', 'SUSPICIOUS', 'PHISHING');

-- CreateEnum
CREATE TYPE "EmailRedFlagType" AS ENUM ('SENDER', 'LINK', 'LANGUAGE', 'ATTACHMENT', 'REQUEST', 'DOMAIN', 'OTHER');

-- CreateEnum
CREATE TYPE "RedFlagSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AssignmentStatus" ADD VALUE 'AVAILABLE';
ALTER TYPE "AssignmentStatus" ADD VALUE 'EXPIRED';

-- AlterEnum
ALTER TYPE "CampaignStatus" ADD VALUE 'ARCHIVED';

-- AlterEnum
BEGIN;
CREATE TYPE "CampaignType_new" AS ENUM ('PREMADE_GENERAL', 'ORGANISATION_CUSTOM');
ALTER TABLE "Campaign" ALTER COLUMN "campaignType" TYPE "CampaignType_new" USING ("campaignType"::text::"CampaignType_new");
ALTER TYPE "CampaignType" RENAME TO "CampaignType_old";
ALTER TYPE "CampaignType_new" RENAME TO "CampaignType";
DROP TYPE "public"."CampaignType_old";
COMMIT;

-- AlterEnum
ALTER TYPE "DifficultyLevel" ADD VALUE 'ADAPTIVE';

-- AlterEnum
BEGIN;
CREATE TYPE "InteractionEventType_new" AS ENUM ('CAMPAIGN_STARTED', 'CAMPAIGN_ITEM_STARTED', 'CAMPAIGN_ITEM_COMPLETED', 'TRAINING_VIEWED', 'TRAINING_COMPLETED', 'QUIZ_STARTED', 'QUIZ_ANSWER_SUBMITTED', 'QUIZ_COMPLETED', 'SIMULATED_EMAIL_OPENED', 'SIMULATED_EMAIL_LINK_CLICKED', 'SIMULATED_EMAIL_CLASSIFIED', 'CREDENTIAL_SUBMISSION_ATTEMPTED');
ALTER TABLE "InteractionEvent" ALTER COLUMN "eventType" TYPE "InteractionEventType_new" USING ("eventType"::text::"InteractionEventType_new");
ALTER TYPE "InteractionEventType" RENAME TO "InteractionEventType_old";
ALTER TYPE "InteractionEventType_new" RENAME TO "InteractionEventType";
DROP TYPE "public"."InteractionEventType_old";
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InteractionTargetType" ADD VALUE 'CAMPAIGN';
ALTER TYPE "InteractionTargetType" ADD VALUE 'CAMPAIGN_ITEM';
ALTER TYPE "InteractionTargetType" ADD VALUE 'CAMPAIGN_COMPONENT';
ALTER TYPE "InteractionTargetType" ADD VALUE 'EMAIL_CLASSIFICATION_RESPONSE';

-- AlterEnum
ALTER TYPE "QuestionType" ADD VALUE 'MULTIPLE_CHOICE';

-- AlterEnum
BEGIN;
CREATE TYPE "SimulationType_new" AS ENUM ('SIMULATED_INBOX');
ALTER TABLE "Simulation" ALTER COLUMN "simulationType" TYPE "SimulationType_new" USING ("simulationType"::text::"SimulationType_new");
ALTER TYPE "SimulationType" RENAME TO "SimulationType_old";
ALTER TYPE "SimulationType_new" RENAME TO "SimulationType";
DROP TYPE "public"."SimulationType_old";
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TrainingContentType" ADD VALUE 'PDF';
ALTER TYPE "TrainingContentType" ADD VALUE 'INTERACTIVE';

-- AlterEnum
ALTER TYPE "TrainingDocumentStatus" ADD VALUE 'DRAFT';

-- AlterEnum
BEGIN;
CREATE TYPE "UserType_new" AS ENUM ('IP_ADMIN', 'ORGANISATION_ADMIN', 'ORGANISATION_LEARNER', 'GENERAL_LEARNER');
ALTER TABLE "User" ALTER COLUMN "userType" TYPE "UserType_new" USING ("userType"::text::"UserType_new");
ALTER TYPE "UserType" RENAME TO "UserType_old";
ALTER TYPE "UserType_new" RENAME TO "UserType";
DROP TYPE "public"."UserType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "AttemptAnswer" DROP CONSTRAINT "AttemptAnswer_selectedOptionId_fkey";

-- DropForeignKey
ALTER TABLE "CampaignAssignment" DROP CONSTRAINT "CampaignAssignment_membershipId_fkey";

-- DropForeignKey
ALTER TABLE "CampaignAssignment" DROP CONSTRAINT "CampaignAssignment_userId_fkey";

-- DropForeignKey
ALTER TABLE "CompanyContext" DROP CONSTRAINT "CompanyContext_organisationId_fkey";

-- DropForeignKey
ALTER TABLE "Department" DROP CONSTRAINT "Department_organisationId_fkey";

-- DropForeignKey
ALTER TABLE "FeedbackItem" DROP CONSTRAINT "FeedbackItem_attemptAnswerId_fkey";

-- DropForeignKey
ALTER TABLE "FeedbackItem" DROP CONSTRAINT "FeedbackItem_questionId_fkey";

-- DropForeignKey
ALTER TABLE "FeedbackItem" DROP CONSTRAINT "FeedbackItem_quizResultId_fkey";

-- DropForeignKey
ALTER TABLE "GeneralLearningAccess" DROP CONSTRAINT "GeneralLearningAccess_userId_fkey";

-- DropForeignKey
ALTER TABLE "InteractionEvent" DROP CONSTRAINT "InteractionEvent_userId_fkey";

-- DropForeignKey
ALTER TABLE "LearningPath" DROP CONSTRAINT "LearningPath_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "OrganisationMembership" DROP CONSTRAINT "OrganisationMembership_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "OrganisationMembership" DROP CONSTRAINT "OrganisationMembership_organisationId_fkey";

-- DropForeignKey
ALTER TABLE "OrganisationMembership" DROP CONSTRAINT "OrganisationMembership_userId_fkey";

-- DropForeignKey
ALTER TABLE "Quiz" DROP CONSTRAINT "Quiz_trainingDocumentId_fkey";

-- DropForeignKey
ALTER TABLE "QuizAttempt" DROP CONSTRAINT "QuizAttempt_trainingProgressId_fkey";

-- DropForeignKey
ALTER TABLE "QuizAttempt" DROP CONSTRAINT "QuizAttempt_userId_fkey";

-- DropForeignKey
ALTER TABLE "SimulatedEmail" DROP CONSTRAINT "SimulatedEmail_recommendedTrainingDocumentId_fkey";

-- DropForeignKey
ALTER TABLE "SimulatedEmail" DROP CONSTRAINT "SimulatedEmail_simulationId_fkey";

-- DropForeignKey
ALTER TABLE "SimulatedInbox" DROP CONSTRAINT "SimulatedInbox_ownerUserId_fkey";

-- DropForeignKey
ALTER TABLE "Simulation" DROP CONSTRAINT "Simulation_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "TrainingDocument" DROP CONSTRAINT "TrainingDocument_moduleId_fkey";

-- DropForeignKey
ALTER TABLE "TrainingModule" DROP CONSTRAINT "TrainingModule_learningPathId_fkey";

-- DropForeignKey
ALTER TABLE "TrainingProgress" DROP CONSTRAINT "TrainingProgress_campaignAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "TrainingProgress" DROP CONSTRAINT "TrainingProgress_trainingDocumentId_fkey";

-- DropForeignKey
ALTER TABLE "TrainingProgress" DROP CONSTRAINT "TrainingProgress_userId_fkey";

-- DropIndex
DROP INDEX "AnswerOption_questionId_order_key";

-- DropIndex
DROP INDEX "AttemptAnswer_selectedOptionId_idx";

-- DropIndex
DROP INDEX "CampaignAssignment_campaignId_userId_key";

-- DropIndex
DROP INDEX "CampaignAssignment_membershipId_idx";

-- DropIndex
DROP INDEX "CampaignAssignment_userId_idx";

-- DropIndex
DROP INDEX "InteractionEvent_userId_idx";

-- DropIndex
DROP INDEX "Quiz_trainingDocumentId_idx";

-- DropIndex
DROP INDEX "QuizAttempt_trainingProgressId_idx";

-- DropIndex
DROP INDEX "QuizAttempt_userId_idx";

-- DropIndex
DROP INDEX "QuizQuestion_quizId_order_key";

-- DropIndex
DROP INDEX "SimulatedEmail_recommendedTrainingDocumentId_idx";

-- DropIndex
DROP INDEX "SimulatedEmail_simulationId_idx";

-- DropIndex
DROP INDEX "SimulatedInbox_ownerUserId_key";

-- DropIndex
DROP INDEX "Simulation_campaignId_idx";

-- DropIndex
DROP INDEX "TrainingDocument_moduleId_idx";

-- AlterTable
ALTER TABLE "AnswerOption" DROP COLUMN "feedback",
DROP COLUMN "order",
ADD COLUMN     "feedbackText" TEXT,
ADD COLUMN     "position" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "AttemptAnswer" DROP COLUMN "selectedOptionId",
ADD COLUMN     "awardedPoints" INTEGER,
ADD COLUMN     "feedbackShown" TEXT,
ADD COLUMN     "isCorrect" BOOLEAN,
ADD COLUMN     "responseSummary" TEXT,
ADD COLUMN     "typedResponse" TEXT;

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "createdByUserId" TEXT,
ADD COLUMN     "difficultyLevel" "DifficultyLevel" NOT NULL DEFAULT 'BEGINNER';

-- AlterTable
ALTER TABLE "CampaignAssignment" DROP COLUMN "membershipId",
DROP COLUMN "userId",
ADD COLUMN     "accessType" "CampaignAccessType" NOT NULL DEFAULT 'ASSIGNED',
ADD COLUMN     "assignedByUserId" TEXT,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "currentCampaignItemId" TEXT,
ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "learnerProfileId" TEXT NOT NULL,
ADD COLUMN     "startedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "InteractionEvent" DROP COLUMN "userId",
ADD COLUMN     "campaignAssignmentId" TEXT,
ADD COLUMN     "campaignItemId" TEXT,
ADD COLUMN     "emailClassificationResponseId" TEXT,
ADD COLUMN     "learnerProfileId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Organisation" DROP COLUMN "contextStatus",
ADD COLUMN     "status" "OrganisationStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Quiz" DROP COLUMN "trainingDocumentId",
ADD COLUMN     "createdByUserId" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "difficultyLevel" "DifficultyLevel" NOT NULL DEFAULT 'BEGINNER';

-- AlterTable
ALTER TABLE "QuizAttempt" DROP COLUMN "trainingProgressId",
DROP COLUMN "userId",
ADD COLUMN     "campaignItemId" TEXT,
ADD COLUMN     "learnerProfileId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "QuizQuestion" DROP COLUMN "order",
ADD COLUMN     "maxSelections" INTEGER,
ADD COLUMN     "minSelections" INTEGER,
ADD COLUMN     "position" INTEGER NOT NULL,
ADD COLUMN     "shuffleOptions" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SimulatedEmail" DROP COLUMN "isRead",
DROP COLUMN "recommendedTrainingDocumentId",
DROP COLUMN "simulationId",
ADD COLUMN     "difficultyLevel" "DifficultyLevel" NOT NULL DEFAULT 'BEGINNER',
ADD COLUMN     "expectedClassification" "EmailClassification" NOT NULL,
ADD COLUMN     "hasAttachment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "simulatedLinkTarget" TEXT;

-- AlterTable
ALTER TABLE "SimulatedInbox" DROP COLUMN "ownerUserId",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "simulationId" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Simulation" DROP COLUMN "campaignId",
ADD COLUMN     "createdByUserId" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "difficultyLevel" "DifficultyLevel" NOT NULL DEFAULT 'BEGINNER',
ADD COLUMN     "title" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TrainingDocument" DROP COLUMN "moduleId",
ADD COLUMN     "contentSummary" TEXT,
ADD COLUMN     "createdByUserId" TEXT,
ADD COLUMN     "difficultyLevel" "DifficultyLevel" NOT NULL DEFAULT 'BEGINNER',
ADD COLUMN     "estimatedReadTimeMinutes" INTEGER,
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- DropTable
DROP TABLE "CompanyContext";

-- DropTable
DROP TABLE "Department";

-- DropTable
DROP TABLE "FeedbackItem";

-- DropTable
DROP TABLE "GeneralLearningAccess";

-- DropTable
DROP TABLE "LearningPath";

-- DropTable
DROP TABLE "OrganisationMembership";

-- DropTable
DROP TABLE "TrainingModule";

-- DropTable
DROP TABLE "TrainingProgress";

-- DropEnum
DROP TYPE "ContextStatus";

-- DropEnum
DROP TYPE "FeedbackType";

-- DropEnum
DROP TYPE "GeneralLearningAccessSource";

-- DropEnum
DROP TYPE "LearningPathStatus";

-- DropEnum
DROP TYPE "MembershipStatus";

-- DropEnum
DROP TYPE "OrganisationRole";

-- DropEnum
DROP TYPE "TrainingProgressStatus";

-- CreateTable
CREATE TABLE "LearnerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "learnerStatus" "LearnerStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearnerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneralLearnerProfile" (
    "id" TEXT NOT NULL,
    "learnerProfileId" TEXT NOT NULL,
    "accessSource" "GeneralLearnerAccessSource" NOT NULL DEFAULT 'SELF_SIGNUP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneralLearnerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganisationLearnerProfile" (
    "id" TEXT NOT NULL,
    "learnerProfileId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "employeeLabel" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organisationUserStatus" "OrganisationUserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganisationLearnerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganisationAdminProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "adminStatus" "AdminStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganisationAdminProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IpAdminProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adminStatus" "AdminStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IpAdminProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganisationContext" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "uploadedByUserId" TEXT,
    "contextType" "OrganisationContextType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "contentSummary" TEXT,
    "contentRef" TEXT,
    "metadata" JSONB,
    "processingStatus" "OrganisationContextProcessingStatus" NOT NULL DEFAULT 'UPLOADED',
    "aiUsable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganisationContext_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignPrerequisite" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "prerequisiteCampaignId" TEXT NOT NULL,
    "requirementType" "CampaignPrerequisiteRequirementType" NOT NULL DEFAULT 'COMPLETION_REQUIRED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignPrerequisite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignItem" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "parentGroupId" TEXT,
    "itemType" "CampaignItemType" NOT NULL,
    "componentType" "CampaignComponentType",
    "groupType" "CampaignGroupType",
    "completionRule" "CompletionRule",
    "title" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL,
    "difficultyLevel" "DifficultyLevel",
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "availabilityStatus" "CampaignItemAvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "trainingDocumentId" TEXT,
    "quizId" TEXT,
    "simulationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttemptAnswerOption" (
    "id" TEXT NOT NULL,
    "attemptAnswerId" TEXT NOT NULL,
    "answerOptionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttemptAnswerOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailRedFlag" (
    "id" TEXT NOT NULL,
    "simulatedEmailId" TEXT NOT NULL,
    "redFlagType" "EmailRedFlagType" NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "severity" "RedFlagSeverity" NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailRedFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailClassificationResponse" (
    "id" TEXT NOT NULL,
    "learnerProfileId" TEXT NOT NULL,
    "simulatedEmailId" TEXT NOT NULL,
    "campaignAssignmentId" TEXT,
    "campaignItemId" TEXT,
    "selectedClassification" "EmailClassification" NOT NULL,
    "reasonSummary" TEXT,
    "freeTextReason" TEXT,
    "isCorrect" BOOLEAN NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailClassificationResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailClassificationSelectedRedFlag" (
    "id" TEXT NOT NULL,
    "emailClassificationResponseId" TEXT NOT NULL,
    "emailRedFlagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailClassificationSelectedRedFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LearnerProfile_userId_key" ON "LearnerProfile"("userId");

-- CreateIndex
CREATE INDEX "LearnerProfile_learnerStatus_idx" ON "LearnerProfile"("learnerStatus");

-- CreateIndex
CREATE UNIQUE INDEX "GeneralLearnerProfile_learnerProfileId_key" ON "GeneralLearnerProfile"("learnerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganisationLearnerProfile_learnerProfileId_key" ON "OrganisationLearnerProfile"("learnerProfileId");

-- CreateIndex
CREATE INDEX "OrganisationLearnerProfile_organisationId_idx" ON "OrganisationLearnerProfile"("organisationId");

-- CreateIndex
CREATE INDEX "OrganisationLearnerProfile_organisationUserStatus_idx" ON "OrganisationLearnerProfile"("organisationUserStatus");

-- CreateIndex
CREATE UNIQUE INDEX "OrganisationAdminProfile_userId_key" ON "OrganisationAdminProfile"("userId");

-- CreateIndex
CREATE INDEX "OrganisationAdminProfile_organisationId_idx" ON "OrganisationAdminProfile"("organisationId");

-- CreateIndex
CREATE INDEX "OrganisationAdminProfile_adminStatus_idx" ON "OrganisationAdminProfile"("adminStatus");

-- CreateIndex
CREATE UNIQUE INDEX "IpAdminProfile_userId_key" ON "IpAdminProfile"("userId");

-- CreateIndex
CREATE INDEX "OrganisationContext_organisationId_idx" ON "OrganisationContext"("organisationId");

-- CreateIndex
CREATE INDEX "OrganisationContext_uploadedByUserId_idx" ON "OrganisationContext"("uploadedByUserId");

-- CreateIndex
CREATE INDEX "OrganisationContext_contextType_idx" ON "OrganisationContext"("contextType");

-- CreateIndex
CREATE INDEX "OrganisationContext_processingStatus_idx" ON "OrganisationContext"("processingStatus");

-- CreateIndex
CREATE INDEX "CampaignPrerequisite_campaignId_idx" ON "CampaignPrerequisite"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignPrerequisite_prerequisiteCampaignId_idx" ON "CampaignPrerequisite"("prerequisiteCampaignId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignPrerequisite_campaignId_prerequisiteCampaignId_key" ON "CampaignPrerequisite"("campaignId", "prerequisiteCampaignId");

-- CreateIndex
CREATE INDEX "CampaignItem_campaignId_idx" ON "CampaignItem"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignItem_parentGroupId_idx" ON "CampaignItem"("parentGroupId");

-- CreateIndex
CREATE INDEX "CampaignItem_itemType_idx" ON "CampaignItem"("itemType");

-- CreateIndex
CREATE INDEX "CampaignItem_componentType_idx" ON "CampaignItem"("componentType");

-- CreateIndex
CREATE INDEX "CampaignItem_groupType_idx" ON "CampaignItem"("groupType");

-- CreateIndex
CREATE INDEX "CampaignItem_trainingDocumentId_idx" ON "CampaignItem"("trainingDocumentId");

-- CreateIndex
CREATE INDEX "CampaignItem_quizId_idx" ON "CampaignItem"("quizId");

-- CreateIndex
CREATE INDEX "CampaignItem_simulationId_idx" ON "CampaignItem"("simulationId");

-- CreateIndex
CREATE INDEX "CampaignItem_availabilityStatus_idx" ON "CampaignItem"("availabilityStatus");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignItem_campaignId_parentGroupId_position_key" ON "CampaignItem"("campaignId", "parentGroupId", "position");

-- CreateIndex
CREATE INDEX "AttemptAnswerOption_attemptAnswerId_idx" ON "AttemptAnswerOption"("attemptAnswerId");

-- CreateIndex
CREATE INDEX "AttemptAnswerOption_answerOptionId_idx" ON "AttemptAnswerOption"("answerOptionId");

-- CreateIndex
CREATE UNIQUE INDEX "AttemptAnswerOption_attemptAnswerId_answerOptionId_key" ON "AttemptAnswerOption"("attemptAnswerId", "answerOptionId");

-- CreateIndex
CREATE INDEX "EmailRedFlag_simulatedEmailId_idx" ON "EmailRedFlag"("simulatedEmailId");

-- CreateIndex
CREATE INDEX "EmailRedFlag_redFlagType_idx" ON "EmailRedFlag"("redFlagType");

-- CreateIndex
CREATE INDEX "EmailRedFlag_severity_idx" ON "EmailRedFlag"("severity");

-- CreateIndex
CREATE INDEX "EmailClassificationResponse_learnerProfileId_idx" ON "EmailClassificationResponse"("learnerProfileId");

-- CreateIndex
CREATE INDEX "EmailClassificationResponse_simulatedEmailId_idx" ON "EmailClassificationResponse"("simulatedEmailId");

-- CreateIndex
CREATE INDEX "EmailClassificationResponse_campaignAssignmentId_idx" ON "EmailClassificationResponse"("campaignAssignmentId");

-- CreateIndex
CREATE INDEX "EmailClassificationResponse_campaignItemId_idx" ON "EmailClassificationResponse"("campaignItemId");

-- CreateIndex
CREATE INDEX "EmailClassificationResponse_selectedClassification_idx" ON "EmailClassificationResponse"("selectedClassification");

-- CreateIndex
CREATE INDEX "EmailClassificationResponse_submittedAt_idx" ON "EmailClassificationResponse"("submittedAt");

-- CreateIndex
CREATE INDEX "EmailClassificationSelectedRedFlag_emailClassificationRespo_idx" ON "EmailClassificationSelectedRedFlag"("emailClassificationResponseId");

-- CreateIndex
CREATE INDEX "EmailClassificationSelectedRedFlag_emailRedFlagId_idx" ON "EmailClassificationSelectedRedFlag"("emailRedFlagId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailClassificationSelectedRedFlag_emailClassificationRespo_key" ON "EmailClassificationSelectedRedFlag"("emailClassificationResponseId", "emailRedFlagId");

-- CreateIndex
CREATE UNIQUE INDEX "AnswerOption_questionId_position_key" ON "AnswerOption"("questionId", "position");

-- CreateIndex
CREATE INDEX "Campaign_createdByUserId_idx" ON "Campaign"("createdByUserId");

-- CreateIndex
CREATE INDEX "Campaign_difficultyLevel_idx" ON "Campaign"("difficultyLevel");

-- CreateIndex
CREATE INDEX "CampaignAssignment_learnerProfileId_idx" ON "CampaignAssignment"("learnerProfileId");

-- CreateIndex
CREATE INDEX "CampaignAssignment_assignedByUserId_idx" ON "CampaignAssignment"("assignedByUserId");

-- CreateIndex
CREATE INDEX "CampaignAssignment_currentCampaignItemId_idx" ON "CampaignAssignment"("currentCampaignItemId");

-- CreateIndex
CREATE INDEX "CampaignAssignment_assignmentStatus_idx" ON "CampaignAssignment"("assignmentStatus");

-- CreateIndex
CREATE INDEX "CampaignAssignment_accessType_idx" ON "CampaignAssignment"("accessType");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignAssignment_campaignId_learnerProfileId_key" ON "CampaignAssignment"("campaignId", "learnerProfileId");

-- CreateIndex
CREATE INDEX "InteractionEvent_learnerProfileId_idx" ON "InteractionEvent"("learnerProfileId");

-- CreateIndex
CREATE INDEX "InteractionEvent_campaignAssignmentId_idx" ON "InteractionEvent"("campaignAssignmentId");

-- CreateIndex
CREATE INDEX "InteractionEvent_campaignItemId_idx" ON "InteractionEvent"("campaignItemId");

-- CreateIndex
CREATE INDEX "InteractionEvent_emailClassificationResponseId_idx" ON "InteractionEvent"("emailClassificationResponseId");

-- CreateIndex
CREATE INDEX "Quiz_createdByUserId_idx" ON "Quiz"("createdByUserId");

-- CreateIndex
CREATE INDEX "Quiz_difficultyLevel_idx" ON "Quiz"("difficultyLevel");

-- CreateIndex
CREATE INDEX "QuizAttempt_learnerProfileId_idx" ON "QuizAttempt"("learnerProfileId");

-- CreateIndex
CREATE INDEX "QuizAttempt_campaignItemId_idx" ON "QuizAttempt"("campaignItemId");

-- CreateIndex
CREATE INDEX "QuizQuestion_questionType_idx" ON "QuizQuestion"("questionType");

-- CreateIndex
CREATE UNIQUE INDEX "QuizQuestion_quizId_position_key" ON "QuizQuestion"("quizId", "position");

-- CreateIndex
CREATE INDEX "SimulatedEmail_expectedClassification_idx" ON "SimulatedEmail"("expectedClassification");

-- CreateIndex
CREATE INDEX "SimulatedEmail_difficultyLevel_idx" ON "SimulatedEmail"("difficultyLevel");

-- CreateIndex
CREATE UNIQUE INDEX "SimulatedInbox_simulationId_key" ON "SimulatedInbox"("simulationId");

-- CreateIndex
CREATE INDEX "Simulation_createdByUserId_idx" ON "Simulation"("createdByUserId");

-- CreateIndex
CREATE INDEX "Simulation_difficultyLevel_idx" ON "Simulation"("difficultyLevel");

-- CreateIndex
CREATE INDEX "TrainingDocument_createdByUserId_idx" ON "TrainingDocument"("createdByUserId");

-- CreateIndex
CREATE INDEX "TrainingDocument_contentType_idx" ON "TrainingDocument"("contentType");

-- CreateIndex
CREATE INDEX "TrainingDocument_difficultyLevel_idx" ON "TrainingDocument"("difficultyLevel");

-- AddForeignKey
ALTER TABLE "LearnerProfile" ADD CONSTRAINT "LearnerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneralLearnerProfile" ADD CONSTRAINT "GeneralLearnerProfile_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationLearnerProfile" ADD CONSTRAINT "OrganisationLearnerProfile_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationLearnerProfile" ADD CONSTRAINT "OrganisationLearnerProfile_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationAdminProfile" ADD CONSTRAINT "OrganisationAdminProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationAdminProfile" ADD CONSTRAINT "OrganisationAdminProfile_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IpAdminProfile" ADD CONSTRAINT "IpAdminProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationContext" ADD CONSTRAINT "OrganisationContext_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationContext" ADD CONSTRAINT "OrganisationContext_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignPrerequisite" ADD CONSTRAINT "CampaignPrerequisite_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignPrerequisite" ADD CONSTRAINT "CampaignPrerequisite_prerequisiteCampaignId_fkey" FOREIGN KEY ("prerequisiteCampaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignItem" ADD CONSTRAINT "CampaignItem_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignItem" ADD CONSTRAINT "CampaignItem_parentGroupId_fkey" FOREIGN KEY ("parentGroupId") REFERENCES "CampaignItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignItem" ADD CONSTRAINT "CampaignItem_trainingDocumentId_fkey" FOREIGN KEY ("trainingDocumentId") REFERENCES "TrainingDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignItem" ADD CONSTRAINT "CampaignItem_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignItem" ADD CONSTRAINT "CampaignItem_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "Simulation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignAssignment" ADD CONSTRAINT "CampaignAssignment_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignAssignment" ADD CONSTRAINT "CampaignAssignment_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignAssignment" ADD CONSTRAINT "CampaignAssignment_currentCampaignItemId_fkey" FOREIGN KEY ("currentCampaignItemId") REFERENCES "CampaignItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingDocument" ADD CONSTRAINT "TrainingDocument_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_campaignItemId_fkey" FOREIGN KEY ("campaignItemId") REFERENCES "CampaignItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptAnswerOption" ADD CONSTRAINT "AttemptAnswerOption_attemptAnswerId_fkey" FOREIGN KEY ("attemptAnswerId") REFERENCES "AttemptAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptAnswerOption" ADD CONSTRAINT "AttemptAnswerOption_answerOptionId_fkey" FOREIGN KEY ("answerOptionId") REFERENCES "AnswerOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Simulation" ADD CONSTRAINT "Simulation_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulatedInbox" ADD CONSTRAINT "SimulatedInbox_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "Simulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailRedFlag" ADD CONSTRAINT "EmailRedFlag_simulatedEmailId_fkey" FOREIGN KEY ("simulatedEmailId") REFERENCES "SimulatedEmail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailClassificationResponse" ADD CONSTRAINT "EmailClassificationResponse_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailClassificationResponse" ADD CONSTRAINT "EmailClassificationResponse_simulatedEmailId_fkey" FOREIGN KEY ("simulatedEmailId") REFERENCES "SimulatedEmail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailClassificationResponse" ADD CONSTRAINT "EmailClassificationResponse_campaignAssignmentId_fkey" FOREIGN KEY ("campaignAssignmentId") REFERENCES "CampaignAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailClassificationResponse" ADD CONSTRAINT "EmailClassificationResponse_campaignItemId_fkey" FOREIGN KEY ("campaignItemId") REFERENCES "CampaignItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailClassificationSelectedRedFlag" ADD CONSTRAINT "EmailClassificationSelectedRedFlag_emailClassificationResp_fkey" FOREIGN KEY ("emailClassificationResponseId") REFERENCES "EmailClassificationResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailClassificationSelectedRedFlag" ADD CONSTRAINT "EmailClassificationSelectedRedFlag_emailRedFlagId_fkey" FOREIGN KEY ("emailRedFlagId") REFERENCES "EmailRedFlag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InteractionEvent" ADD CONSTRAINT "InteractionEvent_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InteractionEvent" ADD CONSTRAINT "InteractionEvent_campaignAssignmentId_fkey" FOREIGN KEY ("campaignAssignmentId") REFERENCES "CampaignAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InteractionEvent" ADD CONSTRAINT "InteractionEvent_campaignItemId_fkey" FOREIGN KEY ("campaignItemId") REFERENCES "CampaignItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InteractionEvent" ADD CONSTRAINT "InteractionEvent_emailClassificationResponseId_fkey" FOREIGN KEY ("emailClassificationResponseId") REFERENCES "EmailClassificationResponse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

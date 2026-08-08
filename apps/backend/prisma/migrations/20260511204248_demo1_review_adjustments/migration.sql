-- CreateEnum
CREATE TYPE "InboxStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TrainingDocumentStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "GeneralLearningAccessSource" AS ENUM ('SELF_SIGNUP', 'INVITE', 'SEED', 'ADMIN_CREATED');

-- AlterEnum
BEGIN;
CREATE TYPE "UserType_new" AS ENUM ('IP_ADMIN', 'COMPANY_ADMIN', 'COMPANY_LEARNER', 'GENERAL_LEARNER');
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
ALTER TABLE "SimulatedEmail" DROP CONSTRAINT "SimulatedEmail_simulationId_fkey";

-- DropForeignKey
ALTER TABLE "SimulatedEmail" DROP CONSTRAINT "SimulatedEmail_trainingDocumentId_fkey";

-- DropIndex
DROP INDEX "SimulatedEmail_trainingDocumentId_idx";

-- DropIndex
DROP INDEX "TrainingDocument_readableStatus_idx";

-- DropIndex
DROP INDEX "TrainingProgress_userId_trainingDocumentId_key";

-- AlterTable
ALTER TABLE "AnswerOption" ALTER COLUMN "label" SET NOT NULL;

-- AlterTable
ALTER TABLE "AttemptAnswer" DROP COLUMN "isCorrect",
DROP COLUMN "selectedValue",
ALTER COLUMN "selectedOptionId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "CampaignAssignment" ALTER COLUMN "membershipId" SET NOT NULL;

-- AlterTable
ALTER TABLE "FeedbackItem" DROP COLUMN "message",
ADD COLUMN     "attemptAnswerId" TEXT,
ADD COLUMN     "explanation" TEXT NOT NULL,
ADD COLUMN     "isCorrect" BOOLEAN NOT NULL,
ADD COLUMN     "questionId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "GeneralLearningAccess" DROP COLUMN "source",
ADD COLUMN     "source" "GeneralLearningAccessSource" NOT NULL DEFAULT 'SELF_SIGNUP';

-- AlterTable
ALTER TABLE "InteractionEvent" ADD COLUMN     "quizId" TEXT,
ADD COLUMN     "quizQuestionId" TEXT;

-- AlterTable
ALTER TABLE "LearningPath" DROP COLUMN "contextType";

-- AlterTable
ALTER TABLE "OrganisationMembership" ADD COLUMN     "departmentId" TEXT;

-- AlterTable
ALTER TABLE "Quiz" DROP COLUMN "passThreshold",
ADD COLUMN     "passThresholdPercentage" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "QuizAttempt" DROP COLUMN "score",
ADD COLUMN     "campaignAssignmentId" TEXT,
ADD COLUMN     "trainingProgressId" TEXT;

-- AlterTable
ALTER TABLE "QuizResult" DROP COLUMN "score",
ADD COLUMN     "scorePercentage" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "SimulatedEmail" DROP COLUMN "body",
DROP COLUMN "isSimulated",
DROP COLUMN "senderEmail",
DROP COLUMN "trainingDocumentId",
ADD COLUMN     "bodyHtml" TEXT NOT NULL,
ADD COLUMN     "recommendedTrainingDocumentId" TEXT,
ADD COLUMN     "senderAddress" TEXT NOT NULL,
ALTER COLUMN "simulationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "SimulatedInbox" DROP COLUMN "summaryStatus",
ADD COLUMN     "status" "InboxStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "TrainingDocument" DROP COLUMN "readableStatus",
ADD COLUMN     "status" "TrainingDocumentStatus" NOT NULL DEFAULT 'AVAILABLE';

-- AlterTable
ALTER TABLE "TrainingModule" ADD COLUMN     "order" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "TrainingProgress" ADD COLUMN     "campaignAssignmentId" TEXT;

-- DropEnum
DROP TYPE "InboxSummaryStatus";

-- DropEnum
DROP TYPE "LearningPathContextType";

-- DropEnum
DROP TYPE "ReadableStatus";

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Department_organisationId_idx" ON "Department"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_organisationId_name_key" ON "Department"("organisationId", "name");

-- CreateIndex
CREATE INDEX "FeedbackItem_questionId_idx" ON "FeedbackItem"("questionId");

-- CreateIndex
CREATE INDEX "FeedbackItem_attemptAnswerId_idx" ON "FeedbackItem"("attemptAnswerId");

-- CreateIndex
CREATE INDEX "InteractionEvent_quizId_idx" ON "InteractionEvent"("quizId");

-- CreateIndex
CREATE INDEX "InteractionEvent_quizQuestionId_idx" ON "InteractionEvent"("quizQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "Organisation_name_key" ON "Organisation"("name");

-- CreateIndex
CREATE INDEX "OrganisationMembership_departmentId_idx" ON "OrganisationMembership"("departmentId");

-- CreateIndex
CREATE INDEX "QuizAttempt_campaignAssignmentId_idx" ON "QuizAttempt"("campaignAssignmentId");

-- CreateIndex
CREATE INDEX "QuizAttempt_trainingProgressId_idx" ON "QuizAttempt"("trainingProgressId");

-- CreateIndex
CREATE INDEX "SimulatedEmail_recommendedTrainingDocumentId_idx" ON "SimulatedEmail"("recommendedTrainingDocumentId");

-- CreateIndex
CREATE INDEX "TrainingDocument_status_idx" ON "TrainingDocument"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingModule_learningPathId_order_key" ON "TrainingModule"("learningPathId", "order");

-- CreateIndex
CREATE INDEX "TrainingProgress_campaignAssignmentId_idx" ON "TrainingProgress"("campaignAssignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingProgress_userId_trainingDocumentId_campaignAssignme_key" ON "TrainingProgress"("userId", "trainingDocumentId", "campaignAssignmentId");

-- AddForeignKey
ALTER TABLE "OrganisationMembership" ADD CONSTRAINT "OrganisationMembership_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignAssignment" ADD CONSTRAINT "CampaignAssignment_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "OrganisationMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulatedEmail" ADD CONSTRAINT "SimulatedEmail_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "Simulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulatedEmail" ADD CONSTRAINT "SimulatedEmail_recommendedTrainingDocumentId_fkey" FOREIGN KEY ("recommendedTrainingDocumentId") REFERENCES "TrainingDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingProgress" ADD CONSTRAINT "TrainingProgress_campaignAssignmentId_fkey" FOREIGN KEY ("campaignAssignmentId") REFERENCES "CampaignAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_campaignAssignmentId_fkey" FOREIGN KEY ("campaignAssignmentId") REFERENCES "CampaignAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_trainingProgressId_fkey" FOREIGN KEY ("trainingProgressId") REFERENCES "TrainingProgress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptAnswer" ADD CONSTRAINT "AttemptAnswer_selectedOptionId_fkey" FOREIGN KEY ("selectedOptionId") REFERENCES "AnswerOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackItem" ADD CONSTRAINT "FeedbackItem_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackItem" ADD CONSTRAINT "FeedbackItem_attemptAnswerId_fkey" FOREIGN KEY ("attemptAnswerId") REFERENCES "AttemptAnswer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InteractionEvent" ADD CONSTRAINT "InteractionEvent_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InteractionEvent" ADD CONSTRAINT "InteractionEvent_quizQuestionId_fkey" FOREIGN KEY ("quizQuestionId") REFERENCES "QuizQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;


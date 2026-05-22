-- Rename user type enum values to standardise on trainee terminology.
ALTER TYPE "UserType" RENAME VALUE 'ORGANISATION_LEARNER' TO 'ORGANISATION_TRAINEE';
ALTER TYPE "UserType" RENAME VALUE 'GENERAL_LEARNER' TO 'GENERAL_TRAINEE';

-- Rename trainee-related enum types.
ALTER TYPE "LearnerStatus" RENAME TO "TraineeStatus";
ALTER TYPE "GeneralLearnerAccessSource" RENAME TO "GeneralTraineeAccessSource";

-- Rename trainee profile tables.
ALTER TABLE "LearnerProfile" RENAME TO "TraineeProfile";
ALTER TABLE "GeneralLearnerProfile" RENAME TO "GeneralTraineeProfile";
ALTER TABLE "OrganisationLearnerProfile" RENAME TO "OrganisationTraineeProfile";

-- Rename trainee profile columns.
ALTER TABLE "TraineeProfile" RENAME COLUMN "learnerStatus" TO "traineeStatus";
ALTER TABLE "GeneralTraineeProfile" RENAME COLUMN "learnerProfileId" TO "traineeProfileId";
ALTER TABLE "OrganisationTraineeProfile" RENAME COLUMN "learnerProfileId" TO "traineeProfileId";
ALTER TABLE "CampaignAssignment" RENAME COLUMN "learnerProfileId" TO "traineeProfileId";
ALTER TABLE "QuizAttempt" RENAME COLUMN "learnerProfileId" TO "traineeProfileId";
ALTER TABLE "EmailClassificationResponse" RENAME COLUMN "learnerProfileId" TO "traineeProfileId";
ALTER TABLE "InteractionEvent" RENAME COLUMN "learnerProfileId" TO "traineeProfileId";

-- Rename primary key constraints.
ALTER TABLE "TraineeProfile" RENAME CONSTRAINT "LearnerProfile_pkey" TO "TraineeProfile_pkey";
ALTER TABLE "GeneralTraineeProfile" RENAME CONSTRAINT "GeneralLearnerProfile_pkey" TO "GeneralTraineeProfile_pkey";
ALTER TABLE "OrganisationTraineeProfile" RENAME CONSTRAINT "OrganisationLearnerProfile_pkey" TO "OrganisationTraineeProfile_pkey";

-- Rename unique constraints and indexes.
ALTER INDEX "LearnerProfile_userId_key" RENAME TO "TraineeProfile_userId_key";
ALTER INDEX "LearnerProfile_learnerStatus_idx" RENAME TO "TraineeProfile_traineeStatus_idx";
ALTER INDEX "GeneralLearnerProfile_learnerProfileId_key" RENAME TO "GeneralTraineeProfile_traineeProfileId_key";
ALTER INDEX "OrganisationLearnerProfile_learnerProfileId_key" RENAME TO "OrganisationTraineeProfile_traineeProfileId_key";
ALTER INDEX "OrganisationLearnerProfile_organisationId_idx" RENAME TO "OrganisationTraineeProfile_organisationId_idx";
ALTER INDEX "OrganisationLearnerProfile_organisationUserStatus_idx" RENAME TO "OrganisationTraineeProfile_organisationUserStatus_idx";
ALTER INDEX "CampaignAssignment_learnerProfileId_idx" RENAME TO "CampaignAssignment_traineeProfileId_idx";
ALTER INDEX "CampaignAssignment_campaignId_learnerProfileId_key" RENAME TO "CampaignAssignment_campaignId_traineeProfileId_key";
ALTER INDEX "QuizAttempt_learnerProfileId_idx" RENAME TO "QuizAttempt_traineeProfileId_idx";
ALTER INDEX "EmailClassificationResponse_learnerProfileId_idx" RENAME TO "EmailClassificationResponse_traineeProfileId_idx";
ALTER INDEX "InteractionEvent_learnerProfileId_idx" RENAME TO "InteractionEvent_traineeProfileId_idx";

-- Rename foreign key constraints.
ALTER TABLE "TraineeProfile" RENAME CONSTRAINT "LearnerProfile_userId_fkey" TO "TraineeProfile_userId_fkey";
ALTER TABLE "GeneralTraineeProfile" RENAME CONSTRAINT "GeneralLearnerProfile_learnerProfileId_fkey" TO "GeneralTraineeProfile_traineeProfileId_fkey";
ALTER TABLE "OrganisationTraineeProfile" RENAME CONSTRAINT "OrganisationLearnerProfile_learnerProfileId_fkey" TO "OrganisationTraineeProfile_traineeProfileId_fkey";
ALTER TABLE "OrganisationTraineeProfile" RENAME CONSTRAINT "OrganisationLearnerProfile_organisationId_fkey" TO "OrganisationTraineeProfile_organisationId_fkey";
ALTER TABLE "CampaignAssignment" RENAME CONSTRAINT "CampaignAssignment_learnerProfileId_fkey" TO "CampaignAssignment_traineeProfileId_fkey";
ALTER TABLE "QuizAttempt" RENAME CONSTRAINT "QuizAttempt_learnerProfileId_fkey" TO "QuizAttempt_traineeProfileId_fkey";
ALTER TABLE "EmailClassificationResponse" RENAME CONSTRAINT "EmailClassificationResponse_learnerProfileId_fkey" TO "EmailClassificationResponse_traineeProfileId_fkey";
ALTER TABLE "InteractionEvent" RENAME CONSTRAINT "InteractionEvent_learnerProfileId_fkey" TO "InteractionEvent_traineeProfileId_fkey";

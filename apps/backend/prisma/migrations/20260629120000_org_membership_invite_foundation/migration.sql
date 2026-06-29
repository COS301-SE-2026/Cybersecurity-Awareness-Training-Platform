-- Extend invitation lifecycle support for organisation trainee invites.
ALTER TYPE "InvitationPurpose" ADD VALUE 'ORGANISATION_TRAINEE_INVITE';

ALTER TYPE "InvitationStatus" ADD VALUE 'SENT';
ALTER TYPE "InvitationStatus" ADD VALUE 'FAILED_TO_SEND';
ALTER TYPE "InvitationStatus" ADD VALUE 'COMPLETED';
ALTER TYPE "InvitationStatus" ADD VALUE 'REJECTED';

-- Preserve existing organisation trainee membership state while adopting membership naming.
ALTER TABLE "OrganisationTraineeProfile"
  RENAME COLUMN "organisationUserStatus" TO "membershipStatus";

ALTER INDEX "OrganisationTraineeProfile_organisationUserStatus_idx"
  RENAME TO "OrganisationTraineeProfile_membershipStatus_idx";

-- Nullable fields preserve existing rows and allow later invite acceptance flows to link records.
ALTER TABLE "OrganisationTraineeProfile"
  ADD COLUMN "createdFromInvitationId" TEXT,
  ADD COLUMN "disabledAt" TIMESTAMP(3),
  ADD COLUMN "disabledReason" TEXT;

ALTER TABLE "Invitation"
  ADD COLUMN "targetUserId" TEXT;

CREATE UNIQUE INDEX "OrganisationTraineeProfile_createdFromInvitationId_organisationId_key"
  ON "OrganisationTraineeProfile"("createdFromInvitationId", "organisationId");

CREATE UNIQUE INDEX "Invitation_id_organisationId_key"
  ON "Invitation"("id", "organisationId");

CREATE INDEX "OrganisationTraineeProfile_disabledAt_idx"
  ON "OrganisationTraineeProfile"("disabledAt");

CREATE INDEX "Invitation_targetUserId_idx"
  ON "Invitation"("targetUserId");

ALTER TABLE "OrganisationTraineeProfile"
  ADD CONSTRAINT "OrganisationTraineeProfile_createdFromInvitationId_fkey"
  FOREIGN KEY ("createdFromInvitationId", "organisationId") REFERENCES "Invitation"("id", "organisationId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Invitation"
  ADD CONSTRAINT "Invitation_targetUserId_fkey"
  FOREIGN KEY ("targetUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

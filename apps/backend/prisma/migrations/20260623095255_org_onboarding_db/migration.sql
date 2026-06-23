-- CreateEnum
CREATE TYPE "OrganisationRegistrationRequestStatus" AS ENUM ('PENDING_REVIEW', 'CONTACTED', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvitationPurpose" AS ENUM ('INITIAL_ORGANISATION_ADMIN_SETUP');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrganisationStatus" ADD VALUE 'PENDING_ONBOARDING';
ALTER TYPE "OrganisationStatus" ADD VALUE 'SUSPENDED';
ALTER TYPE "OrganisationStatus" ADD VALUE 'DISABLED';

-- AlterTable
ALTER TABLE "EmailDeliveryLog" ADD COLUMN     "invitationId" TEXT,
ADD COLUMN     "organisationId" TEXT,
ADD COLUMN     "organisationRegistrationRequestId" TEXT;

-- CreateTable
CREATE TABLE "OrganisationRegistrationRequest" (
    "id" TEXT NOT NULL,
    "submittedOrganisationName" TEXT NOT NULL,
    "submittedWebsite" TEXT,
    "submittedIndustry" TEXT,
    "submittedEmployeeCount" INTEGER,
    "submittedPrimaryDomain" TEXT,
    "representativeFirstName" TEXT NOT NULL,
    "representativeLastName" TEXT NOT NULL,
    "representativeEmail" TEXT NOT NULL,
    "representativePhone" TEXT,
    "status" "OrganisationRegistrationRequestStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewedByIpAdminId" TEXT,
    "approvedOrganisationId" TEXT,
    "contactedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganisationRegistrationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "recipientFirstName" TEXT,
    "recipientLastName" TEXT,
    "purpose" "InvitationPurpose" NOT NULL DEFAULT 'INITIAL_ORGANISATION_ADMIN_SETUP',
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganisationRegistrationRequest_status_idx" ON "OrganisationRegistrationRequest"("status");

-- CreateIndex
CREATE INDEX "OrganisationRegistrationRequest_reviewedByIpAdminId_idx" ON "OrganisationRegistrationRequest"("reviewedByIpAdminId");

-- CreateIndex
CREATE INDEX "OrganisationRegistrationRequest_representativeEmail_idx" ON "OrganisationRegistrationRequest"("representativeEmail");

-- CreateIndex
CREATE INDEX "OrganisationRegistrationRequest_approvedOrganisationId_idx" ON "OrganisationRegistrationRequest"("approvedOrganisationId");

-- CreateIndex
CREATE INDEX "OrganisationRegistrationRequest_contactedAt_idx" ON "OrganisationRegistrationRequest"("contactedAt");

-- CreateIndex
CREATE INDEX "OrganisationRegistrationRequest_decidedAt_idx" ON "OrganisationRegistrationRequest"("decidedAt");

-- CreateIndex
CREATE INDEX "Invitation_organisationId_idx" ON "Invitation"("organisationId");

-- CreateIndex
CREATE INDEX "Invitation_recipientEmail_idx" ON "Invitation"("recipientEmail");

-- CreateIndex
CREATE INDEX "Invitation_status_idx" ON "Invitation"("status");

-- CreateIndex
CREATE INDEX "Invitation_purpose_idx" ON "Invitation"("purpose");

-- CreateIndex
CREATE INDEX "Invitation_expiresAt_idx" ON "Invitation"("expiresAt");

-- CreateIndex
CREATE INDEX "EmailDeliveryLog_organisationId_idx" ON "EmailDeliveryLog"("organisationId");

-- CreateIndex
CREATE INDEX "EmailDeliveryLog_organisationRegistrationRequestId_idx" ON "EmailDeliveryLog"("organisationRegistrationRequestId");

-- CreateIndex
CREATE INDEX "EmailDeliveryLog_invitationId_idx" ON "EmailDeliveryLog"("invitationId");


UPDATE "ActionToken"
SET "invitationId" = NULL
WHERE "invitationId" IS NOT NULL;

UPDATE "ActionToken"
SET "organisationRegistrationRequestId" = NULL
WHERE "organisationRegistrationRequestId" IS NOT NULL;


-- AddForeignKey
ALTER TABLE "ActionToken" ADD CONSTRAINT "ActionToken_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionToken" ADD CONSTRAINT "ActionToken_organisationRegistrationRequestId_fkey" FOREIGN KEY ("organisationRegistrationRequestId") REFERENCES "OrganisationRegistrationRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDeliveryLog" ADD CONSTRAINT "EmailDeliveryLog_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDeliveryLog" ADD CONSTRAINT "EmailDeliveryLog_organisationRegistrationRequestId_fkey" FOREIGN KEY ("organisationRegistrationRequestId") REFERENCES "OrganisationRegistrationRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDeliveryLog" ADD CONSTRAINT "EmailDeliveryLog_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationRegistrationRequest" ADD CONSTRAINT "OrganisationRegistrationRequest_reviewedByIpAdminId_fkey" FOREIGN KEY ("reviewedByIpAdminId") REFERENCES "IpAdminProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationRegistrationRequest" ADD CONSTRAINT "OrganisationRegistrationRequest_approvedOrganisationId_fkey" FOREIGN KEY ("approvedOrganisationId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

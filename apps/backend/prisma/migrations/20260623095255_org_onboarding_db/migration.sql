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
ALTER TABLE "EmailDeliveryLog" ALTER COLUMN "relatedEntityType" DROP NOT NULL;

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
    "contactedByIpAdminId" TEXT,
    "approvedByIpAdminId" TEXT,
    "rejectedByIpAdminId" TEXT,
    "approvedOrganisationId" TEXT,
    "contactedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganisationRegistrationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "organisationRegistrationRequestId" TEXT,
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
CREATE INDEX "OrganisationRegistrationRequest_contactedByIpAdminId_idx" ON "OrganisationRegistrationRequest"("contactedByIpAdminId");

-- CreateIndex
CREATE INDEX "OrganisationRegistrationRequest_approvedByIpAdminId_idx" ON "OrganisationRegistrationRequest"("approvedByIpAdminId");

-- CreateIndex
CREATE INDEX "OrganisationRegistrationRequest_rejectedByIpAdminId_idx" ON "OrganisationRegistrationRequest"("rejectedByIpAdminId");

-- CreateIndex
CREATE INDEX "OrganisationRegistrationRequest_representativeEmail_idx" ON "OrganisationRegistrationRequest"("representativeEmail");

-- CreateIndex
CREATE INDEX "OrganisationRegistrationRequest_approvedOrganisationId_idx" ON "OrganisationRegistrationRequest"("approvedOrganisationId");

-- CreateIndex
CREATE INDEX "OrganisationRegistrationRequest_contactedAt_idx" ON "OrganisationRegistrationRequest"("contactedAt");

-- CreateIndex
CREATE INDEX "OrganisationRegistrationRequest_approvedAt_idx" ON "OrganisationRegistrationRequest"("approvedAt");

-- CreateIndex
CREATE INDEX "OrganisationRegistrationRequest_rejectedAt_idx" ON "OrganisationRegistrationRequest"("rejectedAt");

-- CreateIndex
CREATE INDEX "Invitation_organisationId_idx" ON "Invitation"("organisationId");

-- CreateIndex
CREATE INDEX "Invitation_organisationRegistrationRequestId_idx" ON "Invitation"("organisationRegistrationRequestId");

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

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "ActionToken" at
    WHERE at."invitationId" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM "Invitation" i
        WHERE i."id" = at."invitationId"
      )
  ) THEN
    RAISE EXCEPTION 'Cannot add ActionToken.invitationId foreign key because orphan invitation references exist';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "ActionToken" at
    WHERE at."organisationRegistrationRequestId" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM "OrganisationRegistrationRequest" r
        WHERE r."id" = at."organisationRegistrationRequestId"
      )
  ) THEN
    RAISE EXCEPTION 'Cannot add ActionToken.organisationRegistrationRequestId foreign key because orphan organisation registration request references exist';
  END IF;
END $$;

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
ALTER TABLE "OrganisationRegistrationRequest" ADD CONSTRAINT "OrganisationRegistrationRequest_contactedByIpAdminId_fkey" FOREIGN KEY ("contactedByIpAdminId") REFERENCES "IpAdminProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationRegistrationRequest" ADD CONSTRAINT "OrganisationRegistrationRequest_approvedByIpAdminId_fkey" FOREIGN KEY ("approvedByIpAdminId") REFERENCES "IpAdminProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationRegistrationRequest" ADD CONSTRAINT "OrganisationRegistrationRequest_rejectedByIpAdminId_fkey" FOREIGN KEY ("rejectedByIpAdminId") REFERENCES "IpAdminProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationRegistrationRequest" ADD CONSTRAINT "OrganisationRegistrationRequest_approvedOrganisationId_fkey" FOREIGN KEY ("approvedOrganisationId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_organisationRegistrationRequestId_fkey" FOREIGN KEY ("organisationRegistrationRequestId") REFERENCES "OrganisationRegistrationRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

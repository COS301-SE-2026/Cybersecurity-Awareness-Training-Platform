/*
  Warnings:

  - The values [ORGANISATION_REQUEST_APPROVED,PLATFORM_ADMIN_UPGRADE_CONFIRMATION] on the enum `EmailDeliveryType` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "EmailChangeRequestStatus" AS ENUM ('PENDING', 'CONFIRMED', 'EXPIRED', 'CANCELED');

-- AlterEnum
BEGIN;
CREATE TYPE "EmailDeliveryType_new" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'PASSWORD_CHANGED', 'EMAIL_CHANGE_CONFIRMATION', 'EMAIL_CHANGE_WARNING', 'ORGANISATION_REQUEST_RECEIVED', 'ORGANISATION_REQUEST_REJECTED', 'INITIAL_ORGANISATION_ADMIN_SETUP', 'ORGANISATION_TRAINEE_INVITE', 'ORGANISATION_ADMIN_PROMOTION_INVITE', 'PLATFORM_ADMIN_INVITE', 'ROLE_CHANGED_NOTIFICATION');
ALTER TABLE "EmailDeliveryLog" ALTER COLUMN "emailType" TYPE "EmailDeliveryType_new" USING ("emailType"::text::"EmailDeliveryType_new");
ALTER TYPE "EmailDeliveryType" RENAME TO "EmailDeliveryType_old";
ALTER TYPE "EmailDeliveryType_new" RENAME TO "EmailDeliveryType";
DROP TYPE "public"."EmailDeliveryType_old";
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InvitationStatus" ADD VALUE 'SENT';
ALTER TYPE "InvitationStatus" ADD VALUE 'FAILED_TO_SEND';

-- CreateTable
CREATE TABLE "EmailChangeRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentEmail" TEXT NOT NULL,
    "RequestedEmail" TEXT NOT NULL,
    "status" "EmailChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "confirmedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailChangeRequest_userId_idx" ON "EmailChangeRequest"("userId");

-- CreateIndex
CREATE INDEX "EmailChangeRequest_RequestedEmail_idx" ON "EmailChangeRequest"("RequestedEmail");

-- CreateIndex
CREATE INDEX "EmailChangeRequest_status_idx" ON "EmailChangeRequest"("status");

-- CreateIndex
CREATE INDEX "EmailChangeRequest_expiresAt_idx" ON "EmailChangeRequest"("expiresAt");

-- AddForeignKey
ALTER TABLE "ActionToken" ADD CONSTRAINT "ActionToken_emailChangeRequestId_fkey" FOREIGN KEY ("emailChangeRequestId") REFERENCES "EmailChangeRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailChangeRequest" ADD CONSTRAINT "EmailChangeRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "EmailChangeRequestStatus" AS ENUM ('PENDING', 'CONFIRMED', 'EXPIRED', 'CANCELED');

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

-- CreateEnum
CREATE TYPE "EmailProviderProfileStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateTable
CREATE TABLE "EmailProviderProfile" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" "EmailProviderProfileStatus" NOT NULL DEFAULT 'ACTIVE',
    "smtpHost" TEXT NOT NULL,
    "smtpPort" INTEGER NOT NULL,
    "smtpSecure" BOOLEAN NOT NULL,
    "smtpUsername" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "fromName" TEXT,
    "replyTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailProviderProfile_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "EmailProviderProfile_smtp_port_secure_check" CHECK (("smtpPort" = 465 AND "smtpSecure" = TRUE) OR ("smtpPort" = 587 AND "smtpSecure" = FALSE))
);

-- CreateIndex
CREATE INDEX "EmailProviderProfile_organisationId_status_idx" ON "EmailProviderProfile"("organisationId", "status");

-- AddForeignKey
ALTER TABLE "EmailProviderProfile" ADD CONSTRAINT "EmailProviderProfile_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "PlatformAdminRole" AS ENUM ('SUPER_ADMIN', 'NORMAL_ADMIN');

-- CreateEnum
CREATE TYPE "AuthSessionRevokedReason" AS ENUM ('LOGOUT', 'LOGOUT_ALL', 'PASSWORD_RESET', 'PASSWORD_CHANGE', 'EMAIL_CHANGE', 'ADMIN_DISABLED', 'ORGANISATION_SUSPENDED', 'TOKEN_REUSE_DETECTED', 'EXPIRED', 'OTHER');

-- CreateEnum
CREATE TYPE "RefreshTokenRevokedReason" AS ENUM ('ROTATED', 'LOGOUT', 'LOGOUT_ALL', 'PASSWORD_RESET', 'PASSWORD_CHANGE', 'EMAIL_CHANGE', 'TOKEN_REUSE_DETECTED', 'EXPIRED', 'OTHER');

-- CreateEnum
CREATE TYPE "ActionTokenPurpose" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'EMAIL_CHANGE_VERIFICATION', 'INITIAL_ORGANISATION_ADMIN_SETUP', 'ORGANISATION_TRAINEE_INVITE', 'ORGANISATION_ADMIN_PROMOTION', 'PLATFORM_ADMIN_INVITE', 'PLATFORM_ADMIN_UPGRADE_CONFIRMATION');

-- CreateEnum
CREATE TYPE "EmailDeliveryType" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'PASSWORD_CHANGED', 'EMAIL_CHANGE_CONFIRMATION', 'EMAIL_CHANGE_WARNING', 'ORGANISATION_REQUEST_RECEIVED', 'ORGANISATION_REQUEST_APPROVED', 'ORGANISATION_REQUEST_REJECTED', 'INITIAL_ORGANISATION_ADMIN_SETUP', 'ORGANISATION_TRAINEE_INVITE', 'ORGANISATION_ADMIN_PROMOTION_INVITE', 'PLATFORM_ADMIN_INVITE', 'PLATFORM_ADMIN_UPGRADE_CONFIRMATION', 'ROLE_CHANGED_NOTIFICATION');

-- CreateEnum
CREATE TYPE "EmailRelatedEntityType" AS ENUM ('USER', 'INVITATION', 'ACTIONTOKEN', 'ORGANISATION_REGISTRATION_REQUEST', 'EMAIL_CHANGE_REQUEST', 'ORGANISATION', 'OTHER');

-- CreateEnum
CREATE TYPE "EmailDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- AlterEnum
BEGIN;
CREATE TYPE "AdminStatus_new" AS ENUM ('ACTIVE', 'DISABLED');
ALTER TABLE "public"."IpAdminProfile" ALTER COLUMN "adminStatus" DROP DEFAULT;
ALTER TABLE "public"."OrganisationAdminProfile" ALTER COLUMN "adminStatus" DROP DEFAULT;
ALTER TABLE "OrganisationAdminProfile" ALTER COLUMN "adminStatus" TYPE "AdminStatus_new" USING (
    CASE "adminStatus"::text
        WHEN 'INACTIVE' THEN 'DISABLED'
        ELSE "adminStatus"::text
    END::"AdminStatus_new"
);
ALTER TABLE "IpAdminProfile" ALTER COLUMN "adminStatus" TYPE "AdminStatus_new" USING (
    CASE "adminStatus"::text
        WHEN 'INACTIVE' THEN 'DISABLED'
        ELSE "adminStatus"::text
    END::"AdminStatus_new"
);
ALTER TYPE "AdminStatus" RENAME TO "AdminStatus_old";
ALTER TYPE "AdminStatus_new" RENAME TO "AdminStatus";
DROP TYPE "public"."AdminStatus_old";
ALTER TABLE "IpAdminProfile" ALTER COLUMN "adminStatus" SET DEFAULT 'ACTIVE';
ALTER TABLE "OrganisationAdminProfile" ALTER COLUMN "adminStatus" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "AuthStatus_new" AS ENUM ('PENDING_EMAIL_VERIFICATION', 'PENDING_INVITE_SETUP', 'ACTIVE', 'DISABLED');
ALTER TABLE "public"."User" ALTER COLUMN "authStatus" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "authStatus" TYPE "AuthStatus_new" USING (
    CASE "authStatus"::text
        WHEN 'PENDING' THEN 'PENDING_EMAIL_VERIFICATION'
        ELSE "authStatus"::text
    END::"AuthStatus_new"
);
ALTER TYPE "AuthStatus" RENAME TO "AuthStatus_old";
ALTER TYPE "AuthStatus_new" RENAME TO "AuthStatus";
DROP TYPE "public"."AuthStatus_old";
ALTER TABLE "User" ALTER COLUMN "authStatus" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterTable
ALTER TABLE "IpAdminProfile" ADD COLUMN     "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "platformAdminRole" "PlatformAdminRole" NOT NULL DEFAULT 'NORMAL_ADMIN',
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "revokedReason" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "disabledAt" TIMESTAMP(3),
ADD COLUMN     "disabledReason" TEXT,
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rememberMe" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "idleTimeoutMinutes" INTEGER,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" "AuthSessionRevokedReason",
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "deviceSummary" TEXT,
    "locationSummary" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "authSessionId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedReason" "RefreshTokenRevokedReason",
    "replacedByTokenId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "purpose" "ActionTokenPurpose" NOT NULL,
    "userId" TEXT,
    "invitationId" TEXT,
    "emailChangeRequestId" TEXT,
    "organisationRegistrationRequestId" TEXT,
    "targetEmail" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailDeliveryLog" (
    "id" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "emailType" "EmailDeliveryType" NOT NULL,
    "relatedEntityType" "EmailRelatedEntityType" NOT NULL,
    "relatedEntityId" TEXT,
    "userId" TEXT,
    "actionTokenId" TEXT,
    "deliveryStatus" "EmailDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "providerMessageId" TEXT,
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailDeliveryLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");

-- CreateIndex
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");

-- CreateIndex
CREATE INDEX "AuthSession_lastActiveAt_idx" ON "AuthSession"("lastActiveAt");

-- CreateIndex
CREATE INDEX "AuthSession_revokedAt_idx" ON "AuthSession"("revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_replacedByTokenId_key" ON "RefreshToken"("replacedByTokenId");

-- CreateIndex
CREATE INDEX "RefreshToken_authSessionId_idx" ON "RefreshToken"("authSessionId");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex
CREATE INDEX "RefreshToken_usedAt_idx" ON "RefreshToken"("usedAt");

-- CreateIndex
CREATE INDEX "RefreshToken_revokedAt_idx" ON "RefreshToken"("revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ActionToken_tokenHash_key" ON "ActionToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ActionToken_userId_idx" ON "ActionToken"("userId");

-- CreateIndex
CREATE INDEX "ActionToken_purpose_idx" ON "ActionToken"("purpose");

-- CreateIndex
CREATE INDEX "ActionToken_invitationId_idx" ON "ActionToken"("invitationId");

-- CreateIndex
CREATE INDEX "ActionToken_emailChangeRequestId_idx" ON "ActionToken"("emailChangeRequestId");

-- CreateIndex
CREATE INDEX "ActionToken_organisationRegistrationRequestId_idx" ON "ActionToken"("organisationRegistrationRequestId");

-- CreateIndex
CREATE INDEX "ActionToken_targetEmail_idx" ON "ActionToken"("targetEmail");

-- CreateIndex
CREATE INDEX "ActionToken_expiresAt_idx" ON "ActionToken"("expiresAt");

-- CreateIndex
CREATE INDEX "ActionToken_usedAt_idx" ON "ActionToken"("usedAt");

-- CreateIndex
CREATE INDEX "ActionToken_revokedAt_idx" ON "ActionToken"("revokedAt");

-- CreateIndex
CREATE INDEX "EmailDeliveryLog_recipientEmail_idx" ON "EmailDeliveryLog"("recipientEmail");

-- CreateIndex
CREATE INDEX "EmailDeliveryLog_emailType_idx" ON "EmailDeliveryLog"("emailType");

-- CreateIndex
CREATE INDEX "EmailDeliveryLog_relatedEntityType_relatedEntityId_idx" ON "EmailDeliveryLog"("relatedEntityType", "relatedEntityId");

-- CreateIndex
CREATE INDEX "EmailDeliveryLog_userId_idx" ON "EmailDeliveryLog"("userId");

-- CreateIndex
CREATE INDEX "EmailDeliveryLog_actionTokenId_idx" ON "EmailDeliveryLog"("actionTokenId");

-- CreateIndex
CREATE INDEX "EmailDeliveryLog_deliveryStatus_idx" ON "EmailDeliveryLog"("deliveryStatus");

-- CreateIndex
CREATE INDEX "EmailDeliveryLog_createdAt_idx" ON "EmailDeliveryLog"("createdAt");

-- CreateIndex
CREATE INDEX "IpAdminProfile_adminStatus_idx" ON "IpAdminProfile"("adminStatus");

-- CreateIndex
CREATE INDEX "IpAdminProfile_platformAdminRole_idx" ON "IpAdminProfile"("platformAdminRole");

-- CreateIndex
CREATE INDEX "IpAdminProfile_revokedAt_idx" ON "IpAdminProfile"("revokedAt");

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_authSessionId_fkey" FOREIGN KEY ("authSessionId") REFERENCES "AuthSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_replacedByTokenId_fkey" FOREIGN KEY ("replacedByTokenId") REFERENCES "RefreshToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionToken" ADD CONSTRAINT "ActionToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDeliveryLog" ADD CONSTRAINT "EmailDeliveryLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDeliveryLog" ADD CONSTRAINT "EmailDeliveryLog_actionTokenId_fkey" FOREIGN KEY ("actionTokenId") REFERENCES "ActionToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;

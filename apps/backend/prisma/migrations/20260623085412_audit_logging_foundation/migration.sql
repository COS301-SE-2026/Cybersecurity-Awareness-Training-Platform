-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('IP_ADMIN', 'ORGANISATION_ADMIN', 'ORGANISATION_TRAINEE', 'GENERAL_TRAINEE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AuditTargetType" AS ENUM ('USER', 'ORGANISATION', 'ORGANISATION_REGISTRATION_REQUEST', 'INVITATION', 'ORGANISATION_ADMIN_PERMISSION', 'ORGANISATION_SECURITY_SETTINGS', 'PLATFORM_ADMIN_ROLE', 'AUTH_SESSION', 'CAMPAIGN', 'OTHER', 'TOKEN', 'ACTION_TOKEN', 'REFRESH_TOKEN');

-- CreateEnum
CREATE TYPE "AuditActionType" AS ENUM ('CREATED', 'UPDATED', 'DISABLED', 'ENABLED', 'APPROVED', 'REJECTED', 'CONTACTED', 'INVITED', 'RESENT', 'REVOKED', 'ACCEPTED', 'COMPLETED', 'PROMOTED', 'DEMOTED', 'PERMISSIONS_CHANGED', 'SETTINGS_CHANGED', 'SUSPENDED', 'REACTIVATED', 'LOGIN', 'LOGOUT', 'TOKEN_REUSE_DETECTED');

-- CreateEnum
CREATE TYPE "AuditOutcome" AS ENUM ('SUCCESS', 'FAILURE');

-- CreateTable
CREATE TABLE "AuditLogEntry" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorType" "AuditActorType" NOT NULL,
    "organisationId" TEXT,
    "targetType" "AuditTargetType" NOT NULL,
    "targetId" TEXT,
    "actionType" "AuditActionType" NOT NULL,
    "outcome" "AuditOutcome" NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLogEntry_actorUserId_idx" ON "AuditLogEntry"("actorUserId");

-- CreateIndex
CREATE INDEX "AuditLogEntry_organisationId_idx" ON "AuditLogEntry"("organisationId");

-- CreateIndex
CREATE INDEX "AuditLogEntry_actorType_idx" ON "AuditLogEntry"("actorType");

-- CreateIndex
CREATE INDEX "AuditLogEntry_targetType_targetId_idx" ON "AuditLogEntry"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AuditLogEntry_actionType_idx" ON "AuditLogEntry"("actionType");

-- CreateIndex
CREATE INDEX "AuditLogEntry_outcome_idx" ON "AuditLogEntry"("outcome");

-- CreateIndex
CREATE INDEX "AuditLogEntry_createdAt_idx" ON "AuditLogEntry"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLogEntry_organisationId_createdAt_idx" ON "AuditLogEntry"("organisationId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLogEntry_actorUserId_createdAt_idx" ON "AuditLogEntry"("actorUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "AuditLogEntry" ADD CONSTRAINT "AuditLogEntry_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLogEntry" ADD CONSTRAINT "AuditLogEntry_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TYPE "EmailDeliveryJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'RETRY_SCHEDULED', 'SUCCEEDED', 'FAILED');

CREATE TYPE "EmailDeliveryProviderKind" AS ENUM ('SMTP');

CREATE TYPE "EmailDeliveryProviderOutcome" AS ENUM ('PROVIDER_ACCEPTED', 'PROVIDER_REJECTED', 'PROVIDER_TEMPORARY_FAILURE', 'PROVIDER_AMBIGUOUS', 'PROVIDER_PERSISTENCE_FAILED');

CREATE TABLE "EmailDeliveryJob" (
    "id" TEXT NOT NULL,
    "deliveryLogId" TEXT NOT NULL,
    "status" "EmailDeliveryJobStatus" NOT NULL DEFAULT 'PENDING',
    "providerKind" "EmailDeliveryProviderKind" NOT NULL DEFAULT 'SMTP',
    "recipientEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "textBody" TEXT NOT NULL,
    "htmlBody" TEXT,
    "emailType" "EmailDeliveryType" NOT NULL,
    "invitationStateVersion" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 4,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstAttemptAt" TIMESTAMP(3),
    "retryDeadlineAt" TIMESTAMP(3),
    "leaseOwner" TEXT,
    "leasedAt" TIMESTAMP(3),
    "leaseExpiresAt" TIMESTAMP(3),
    "lastProviderOutcome" "EmailDeliveryProviderOutcome",
    "lastReasonCode" TEXT,
    "terminalAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailDeliveryJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailDeliveryJob_deliveryLogId_key" ON "EmailDeliveryJob"("deliveryLogId");

CREATE INDEX "EmailDeliveryJob_status_nextAttemptAt_idx" ON "EmailDeliveryJob"("status", "nextAttemptAt");

CREATE INDEX "EmailDeliveryJob_leaseExpiresAt_idx" ON "EmailDeliveryJob"("leaseExpiresAt");

CREATE INDEX "EmailDeliveryJob_providerKind_idx" ON "EmailDeliveryJob"("providerKind");

CREATE INDEX "EmailDeliveryJob_terminalAt_idx" ON "EmailDeliveryJob"("terminalAt");

ALTER TABLE "EmailDeliveryJob" ADD CONSTRAINT "EmailDeliveryJob_deliveryLogId_fkey" FOREIGN KEY ("deliveryLogId") REFERENCES "EmailDeliveryLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

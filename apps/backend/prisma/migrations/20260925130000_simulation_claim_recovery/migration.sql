ALTER TABLE "EmailDeliveryJob" ADD COLUMN "simulationHandoffClaim" BOOLEAN NOT NULL DEFAULT false;

UPDATE "EmailDeliveryJob"
SET "status" = 'FAILED',
    "terminalAt" = CURRENT_TIMESTAMP,
    "leasedAt" = NULL,
    "leaseExpiresAt" = NULL,
    "lastProviderOutcome" = 'PROVIDER_AMBIGUOUS',
    "lastReasonCode" = 'EMAIL_LEGACY_SIMULATION_CLAIM_OUTCOME_UNKNOWN'
WHERE "emailType" = 'PHISHING_SIMULATION_MESSAGE'
  AND "status" = 'PROCESSING'
  AND "terminalAt" IS NULL;

UPDATE "EmailDeliveryLog" AS log
SET "deliveryStatus" = 'FAILED',
    "failedAt" = CURRENT_TIMESTAMP,
    "failureReason" = 'EMAIL_LEGACY_SIMULATION_CLAIM_OUTCOME_UNKNOWN'
FROM "EmailDeliveryJob" AS job
WHERE job."deliveryLogId" = log."id"
  AND job."lastReasonCode" = 'EMAIL_LEGACY_SIMULATION_CLAIM_OUTCOME_UNKNOWN';

ALTER TYPE "EmailDeliveryType" ADD VALUE 'CAMPAIGN_ASSIGNED';
ALTER TYPE "EmailDeliveryType" ADD VALUE 'CAMPAIGN_SELF_ENROLLED';
ALTER TYPE "EmailDeliveryType" ADD VALUE 'CAMPAIGN_DEADLINE_REMINDER';
ALTER TYPE "EmailDeliveryStatus" ADD VALUE 'CANCELLED';
ALTER TYPE "EmailDeliveryJobStatus" ADD VALUE 'CANCELLED';

ALTER TABLE "EmailDeliveryLog"
ADD COLUMN "idempotencyKey" TEXT,
ADD COLUMN "campaignAssignmentId" TEXT;

CREATE UNIQUE INDEX "EmailDeliveryLog_idempotencyKey_key" ON "EmailDeliveryLog"("idempotencyKey");
CREATE INDEX "EmailDeliveryLog_campaignAssignmentId_idx" ON "EmailDeliveryLog"("campaignAssignmentId");

ALTER TABLE "EmailDeliveryLog" ADD CONSTRAINT "EmailDeliveryLog_campaignAssignmentId_fkey"
FOREIGN KEY ("campaignAssignmentId") REFERENCES "CampaignAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

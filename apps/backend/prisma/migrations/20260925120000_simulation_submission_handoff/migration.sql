ALTER TYPE "EmailDeliveryJobStatus" ADD VALUE 'SUBMITTING';

ALTER TABLE "PhishingSimulation" ADD COLUMN "stopRequestedAt" TIMESTAMP(3);

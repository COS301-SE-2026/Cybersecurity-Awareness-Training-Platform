ALTER TABLE "ManagedPortalLink"
  ALTER COLUMN "campaignAssignmentId" DROP NOT NULL,
  ALTER COLUMN "campaignItemId" DROP NOT NULL,
  ALTER COLUMN "simulatedEmailId" DROP NOT NULL,
  ADD COLUMN "phishingSimulationMessageId" TEXT;

ALTER TABLE "ManagedPortalLink"
  ADD CONSTRAINT "ManagedPortalLink_source_context_check" CHECK (
    (
      "phishingSimulationMessageId" IS NULL
      AND "campaignAssignmentId" IS NOT NULL
      AND "campaignItemId" IS NOT NULL
      AND "simulatedEmailId" IS NOT NULL
    ) OR (
      "phishingSimulationMessageId" IS NOT NULL
      AND "campaignAssignmentId" IS NULL
      AND "campaignItemId" IS NULL
      AND "simulatedEmailId" IS NULL
    )
  );

CREATE UNIQUE INDEX "ManagedPortalLink_phishingSimulationMessageId_key"
  ON "ManagedPortalLink"("phishingSimulationMessageId");

ALTER TABLE "ManagedPortalLink"
  ADD CONSTRAINT "ManagedPortalLink_phishingSimulationMessageId_fkey"
  FOREIGN KEY ("phishingSimulationMessageId") REFERENCES "PhishingSimulationMessage"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TYPE "OrganisationEmailStatus" AS ENUM ('DRAFT', 'ACTIVE');

CREATE TABLE "OrganisationEmail" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "senderLabel" TEXT NOT NULL,
    "senderAddress" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "preview" TEXT,
    "bodyHtml" TEXT NOT NULL,
    "linkAnchorText" TEXT NOT NULL,
    "expectedClassification" "EmailClassification" NOT NULL,
    "categories" "ContentCategory"[] NOT NULL DEFAULT ARRAY[]::"ContentCategory"[],
    "difficultyLevel" "DifficultyLevel" NOT NULL DEFAULT 'EASY',
    "contentHash" TEXT NOT NULL,
    "status" "OrganisationEmailStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganisationEmail_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SimulatedEmail"
ADD COLUMN "sourceOrganisationEmailId" TEXT,
ADD COLUMN "position" INTEGER,
ADD COLUMN "linkAnchorText" TEXT;

WITH ranked_emails AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "inboxId"
            ORDER BY "receivedAt" DESC, "createdAt" DESC, "id" ASC
        ) - 1 AS "position"
    FROM "SimulatedEmail"
)
UPDATE "SimulatedEmail" AS email
SET "position" = ranked_emails."position"
FROM ranked_emails
WHERE email."id" = ranked_emails."id";

ALTER TABLE "SimulatedEmail" ALTER COLUMN "position" SET NOT NULL;

ALTER TABLE "EmailRedFlag"
ADD COLUMN "organisationEmailId" TEXT,
ALTER COLUMN "simulatedEmailId" DROP NOT NULL;

ALTER TABLE "EmailRedFlag"
ADD CONSTRAINT "EmailRedFlag_exactly_one_owner_check"
CHECK (num_nonnulls("simulatedEmailId", "organisationEmailId") = 1);

CREATE UNIQUE INDEX "SimulatedEmail_inboxId_position_key" ON "SimulatedEmail"("inboxId", "position");
CREATE INDEX "SimulatedEmail_sourceOrganisationEmailId_idx" ON "SimulatedEmail"("sourceOrganisationEmailId");

CREATE INDEX "EmailRedFlag_organisationEmailId_idx" ON "EmailRedFlag"("organisationEmailId");

CREATE INDEX "OrganisationEmail_organisationId_idx" ON "OrganisationEmail"("organisationId");
CREATE INDEX "OrganisationEmail_createdByUserId_idx" ON "OrganisationEmail"("createdByUserId");
CREATE INDEX "OrganisationEmail_categories_idx" ON "OrganisationEmail" USING GIN ("categories");
CREATE INDEX "OrganisationEmail_difficultyLevel_idx" ON "OrganisationEmail"("difficultyLevel");
CREATE INDEX "OrganisationEmail_status_idx" ON "OrganisationEmail"("status");
CREATE INDEX "OrganisationEmail_contentHash_idx" ON "OrganisationEmail"("contentHash");
CREATE INDEX "OrganisationEmail_organisationId_contentHash_idx" ON "OrganisationEmail"("organisationId", "contentHash");
CREATE INDEX "OrganisationEmail_organisationId_status_updatedAt_idx" ON "OrganisationEmail"("organisationId", "status", "updatedAt");

ALTER TABLE "OrganisationEmail"
ADD CONSTRAINT "OrganisationEmail_organisationId_fkey"
FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrganisationEmail"
ADD CONSTRAINT "OrganisationEmail_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SimulatedEmail"
ADD CONSTRAINT "SimulatedEmail_sourceOrganisationEmailId_fkey"
FOREIGN KEY ("sourceOrganisationEmailId") REFERENCES "OrganisationEmail"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EmailRedFlag"
ADD CONSTRAINT "EmailRedFlag_organisationEmailId_fkey"
FOREIGN KEY ("organisationEmailId") REFERENCES "OrganisationEmail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

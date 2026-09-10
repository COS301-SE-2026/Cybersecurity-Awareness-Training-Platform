ALTER TYPE "DifficultyLevel" ADD VALUE IF NOT EXISTS 'EASY';
ALTER TYPE "DifficultyLevel" ADD VALUE IF NOT EXISTS 'MEDIUM';
ALTER TYPE "DifficultyLevel" ADD VALUE IF NOT EXISTS 'HARD';

CREATE TYPE "ContentCategory" AS ENUM (
  'PHISHING',
  'PASSWORD_SECURITY',
  'SOCIAL_ENGINEERING',
  'MALWARE',
  'DATA_PROTECTION',
  'DEVICE_SECURITY',
  'INCIDENT_REPORTING'
);

ALTER TABLE "TrainingDocument" ADD COLUMN "organisationId" TEXT;
ALTER TABLE "TrainingDocument" ADD COLUMN "category" "ContentCategory" NOT NULL DEFAULT 'PHISHING';

ALTER TABLE "Quiz" ADD COLUMN "organisationId" TEXT;
ALTER TABLE "Quiz" ADD COLUMN "category" "ContentCategory" NOT NULL DEFAULT 'PHISHING';

ALTER TABLE "Simulation" ADD COLUMN "organisationId" TEXT;
ALTER TABLE "Simulation" ADD COLUMN "category" "ContentCategory" NOT NULL DEFAULT 'PHISHING';

ALTER TABLE "SimulatedEmail" ADD COLUMN "category" "ContentCategory" NOT NULL DEFAULT 'PHISHING';

CREATE INDEX "TrainingDocument_organisationId_idx" ON "TrainingDocument"("organisationId");
CREATE INDEX "TrainingDocument_category_idx" ON "TrainingDocument"("category");

CREATE INDEX "Quiz_organisationId_idx" ON "Quiz"("organisationId");
CREATE INDEX "Quiz_category_idx" ON "Quiz"("category");

CREATE INDEX "Simulation_organisationId_idx" ON "Simulation"("organisationId");
CREATE INDEX "Simulation_category_idx" ON "Simulation"("category");

CREATE INDEX "SimulatedEmail_category_idx" ON "SimulatedEmail"("category");

ALTER TABLE "TrainingDocument" ADD CONSTRAINT "TrainingDocument_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Simulation" ADD CONSTRAINT "Simulation_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

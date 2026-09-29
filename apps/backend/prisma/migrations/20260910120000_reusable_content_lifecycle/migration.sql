CREATE TYPE "ContentCategory" AS ENUM (
  'PHISHING_AND_SUSPICIOUS_MESSAGES',
  'LINKS_DOMAINS_AND_SENDER_VERIFICATION',
  'PASSWORDS_AND_AUTHENTICATION',
  'SOCIAL_ENGINEERING_AND_INFORMATION_DISCLOSURE',
  'DATA_DEVICE_AND_ACCOUNT_SAFETY'
);

ALTER TABLE "TrainingDocument" ADD COLUMN "organisationId" TEXT;
ALTER TABLE "TrainingDocument" ADD COLUMN "categories" "ContentCategory"[] NOT NULL DEFAULT ARRAY[]::"ContentCategory"[];

ALTER TABLE "Quiz" ADD COLUMN "organisationId" TEXT;
ALTER TABLE "QuizQuestion" ADD COLUMN "categories" "ContentCategory"[] NOT NULL DEFAULT ARRAY[]::"ContentCategory"[];

ALTER TABLE "Simulation" ADD COLUMN "organisationId" TEXT;
ALTER TABLE "SimulatedEmail" ADD COLUMN "categories" "ContentCategory"[] NOT NULL DEFAULT ARRAY[]::"ContentCategory"[];

CREATE INDEX "TrainingDocument_organisationId_idx" ON "TrainingDocument"("organisationId");
CREATE INDEX "TrainingDocument_categories_idx" ON "TrainingDocument" USING GIN ("categories");

CREATE INDEX "Quiz_organisationId_idx" ON "Quiz"("organisationId");
CREATE INDEX "QuizQuestion_categories_idx" ON "QuizQuestion" USING GIN ("categories");

CREATE INDEX "Simulation_organisationId_idx" ON "Simulation"("organisationId");
CREATE INDEX "SimulatedEmail_categories_idx" ON "SimulatedEmail" USING GIN ("categories");

ALTER TABLE "TrainingDocument" ADD CONSTRAINT "TrainingDocument_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Simulation" ADD CONSTRAINT "Simulation_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

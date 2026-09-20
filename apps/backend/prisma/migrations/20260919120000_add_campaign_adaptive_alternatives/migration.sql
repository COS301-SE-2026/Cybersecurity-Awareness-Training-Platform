ALTER TYPE "CampaignItemType" ADD VALUE 'ADAPTIVE';

CREATE TABLE "CampaignAdaptiveAlternative" (
    "id" TEXT NOT NULL,
    "campaignItemId" TEXT NOT NULL,
    "difficulty" "DifficultyLevel" NOT NULL,
    "trainingDocumentId" TEXT,
    "quizId" TEXT,
    "simulationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignAdaptiveAlternative_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CampaignAdaptiveAlternative_campaignItemId_difficulty_key"
ON "CampaignAdaptiveAlternative"("campaignItemId", "difficulty");

CREATE INDEX "CampaignAdaptiveAlternative_campaignItemId_idx"
ON "CampaignAdaptiveAlternative"("campaignItemId");

CREATE INDEX "CampaignAdaptiveAlternative_trainingDocumentId_idx"
ON "CampaignAdaptiveAlternative"("trainingDocumentId");

CREATE INDEX "CampaignAdaptiveAlternative_quizId_idx"
ON "CampaignAdaptiveAlternative"("quizId");

CREATE INDEX "CampaignAdaptiveAlternative_simulationId_idx"
ON "CampaignAdaptiveAlternative"("simulationId");

ALTER TABLE "CampaignAdaptiveAlternative"
ADD CONSTRAINT "CampaignAdaptiveAlternative_exactly_one_content_check"
CHECK (NUM_NONNULLS("trainingDocumentId", "quizId", "simulationId") = 1);

ALTER TABLE "CampaignAdaptiveAlternative"
ADD CONSTRAINT "CampaignAdaptiveAlternative_campaignItemId_fkey"
FOREIGN KEY ("campaignItemId") REFERENCES "CampaignItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CampaignAdaptiveAlternative"
ADD CONSTRAINT "CampaignAdaptiveAlternative_trainingDocumentId_fkey"
FOREIGN KEY ("trainingDocumentId") REFERENCES "TrainingDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CampaignAdaptiveAlternative"
ADD CONSTRAINT "CampaignAdaptiveAlternative_quizId_fkey"
FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CampaignAdaptiveAlternative"
ADD CONSTRAINT "CampaignAdaptiveAlternative_simulationId_fkey"
FOREIGN KEY ("simulationId") REFERENCES "Simulation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

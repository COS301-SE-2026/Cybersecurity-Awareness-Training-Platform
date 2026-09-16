-- AlterTable
ALTER TABLE "EmailRedFlag" ADD COLUMN     "phishingSimulationEmailId" TEXT;

-- CreateTable
CREATE TABLE "PhishingSimulationEmail" (
    "id" TEXT NOT NULL,
    "phishingSimulationId" TEXT NOT NULL,
    "sourceOrganisationEmailId" TEXT,
    "senderLabel" TEXT NOT NULL,
    "senderAddress" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "preview" TEXT,
    "bodyHtml" TEXT NOT NULL,
    "linkAnchorText" TEXT,
    "expectedClassification" "EmailClassification" NOT NULL,
    "categories" "ContentCategory"[] NOT NULL DEFAULT ARRAY[]::"ContentCategory"[],
    "difficultyLevel" "DifficultyLevel" NOT NULL DEFAULT 'EASY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhishingSimulationEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PhishingSimulationEmail_phishingSimulationId_idx" ON "PhishingSimulationEmail"("phishingSimulationId");

-- CreateIndex
CREATE INDEX "EmailRedFlag_phishingSimulationEmailId_idx" ON "EmailRedFlag"("phishingSimulationEmailId");

-- AddForeignKey
ALTER TABLE "EmailRedFlag" ADD CONSTRAINT "EmailRedFlag_phishingSimulationEmailId_fkey" FOREIGN KEY ("phishingSimulationEmailId") REFERENCES "PhishingSimulationEmail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhishingSimulationEmail" ADD CONSTRAINT "PhishingSimulationEmail_phishingSimulationId_fkey" FOREIGN KEY ("phishingSimulationId") REFERENCES "PhishingSimulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmailRedFlag" DROP CONSTRAINT "EmailRedFlag_exactly_one_owner_check";
ALTER TABLE "EmailRedFlag" ADD CONSTRAINT "EmailRedFlag_exactly_one_owner_check" CHECK (num_nonnulls("simulatedEmailId", "organisationEmailId", "phishingSimulationEmailId") = 1);

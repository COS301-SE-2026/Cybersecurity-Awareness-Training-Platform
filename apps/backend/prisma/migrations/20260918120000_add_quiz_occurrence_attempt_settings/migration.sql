CREATE TYPE "QuizScorePolicy" AS ENUM ('BEST', 'LATEST', 'AVERAGE');

ALTER TABLE "CampaignItem"
ADD COLUMN "quizMaxAttempts" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "quizScorePolicy" "QuizScorePolicy" NOT NULL DEFAULT 'BEST';

ALTER TABLE "CampaignItem"
ADD CONSTRAINT "CampaignItem_quizMaxAttempts_check"
CHECK ("quizMaxAttempts" >= 1);
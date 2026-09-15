-- AlterEnum
BEGIN;

DO $$
BEGIN
 IF EXISTS (
	SELECT 1
	FROM "Campaign"
	WHERE "difficultyLevel" = 'ADAPTIVE'

	UNION ALL

	SELECT 1
	FROM "CampaignItem"
	WHERE "difficultyLevel" = 'ADAPTIVE'

	UNION ALL

	SELECT 1
	FROM "TrainingDocument"
	WHERE "difficultyLevel" = 'ADAPTIVE'

	UNION ALL

	SELECT 1
	FROM "Quiz"
	WHERE "difficultyLevel" = 'ADAPTIVE'

	UNION ALL

	SELECT 1
	FROM "Simulation"
	WHERE "difficultyLevel" = 'ADAPTIVE'

	UNION ALL

	SELECT 1
	FROM "SimulatedEmail"
	WHERE "difficultyLevel" = 'ADAPTIVE'
 ) THEN
   RAISE EXCEPTION
   'Cannot migrate DifficultyLevel: legacy ADAPTIVE rows must be manually reclassified before rerunning this migration.';
   END IF;
END
$$;

ALTER TABLE "Campaign" ALTER COLUMN "difficultyLevel" DROP DEFAULT;
ALTER TABLE "TrainingDocument" ALTER COLUMN "difficultyLevel" DROP DEFAULT;
ALTER TABLE "Quiz" ALTER COLUMN "difficultyLevel" DROP DEFAULT;
ALTER TABLE "Simulation" ALTER COLUMN "difficultyLevel" DROP DEFAULT;
ALTER TABLE "SimulatedEmail" ALTER COLUMN "difficultyLevel" DROP DEFAULT;

CREATE TYPE "DifficultyLevel_new" AS ENUM ( 'EASY', 'MEDIUM', 'HARD');

ALTER TABLE "Campaign"
ALTER COLUMN "difficultyLevel" TYPE "DifficultyLevel_new"
USING (
	CASE "difficultyLevel"::text
	WHEN 'BEGINNER' THEN 'EASY'
	WHEN 'INTERMEDIATE' THEN 'MEDIUM'
	WHEN 'ADVANCED' THEN 'HARD'
  END::"DifficultyLevel_new"
);

ALTER TABLE "CampaignItem"
ALTER COLUMN "difficultyLevel" TYPE "DifficultyLevel_new"
USING (
	CASE "difficultyLevel"::text
	WHEN 'BEGINNER' THEN 'EASY'
	WHEN 'INTERMEDIATE' THEN 'MEDIUM'
	WHEN 'ADVANCED' THEN 'HARD'
  END::"DifficultyLevel_new"
);

ALTER TABLE "TrainingDocument"
ALTER COLUMN "difficultyLevel" TYPE "DifficultyLevel_new"
USING (
	CASE "difficultyLevel"::text
	WHEN 'BEGINNER' THEN 'EASY'
	WHEN 'INTERMEDIATE' THEN 'MEDIUM'
	WHEN 'ADVANCED' THEN 'HARD'
  END::"DifficultyLevel_new"
);

ALTER TABLE "Quiz"
ALTER COLUMN "difficultyLevel" TYPE "DifficultyLevel_new"
USING (
	CASE "difficultyLevel"::text
	WHEN 'BEGINNER' THEN 'EASY'
	WHEN 'INTERMEDIATE' THEN 'MEDIUM'
	WHEN 'ADVANCED' THEN 'HARD'
  END::"DifficultyLevel_new"
);

ALTER TABLE "Simulation"
ALTER COLUMN "difficultyLevel" TYPE "DifficultyLevel_new"
USING (
	CASE "difficultyLevel"::text
	WHEN 'BEGINNER' THEN 'EASY'
	WHEN 'INTERMEDIATE' THEN 'MEDIUM'
	WHEN 'ADVANCED' THEN 'HARD'
  END::"DifficultyLevel_new"
);

ALTER TABLE "SimulatedEmail"
ALTER COLUMN "difficultyLevel" TYPE "DifficultyLevel_new"
USING (
	CASE "difficultyLevel"::text
	WHEN 'BEGINNER' THEN 'EASY'
	WHEN 'INTERMEDIATE' THEN 'MEDIUM'
	WHEN 'ADVANCED' THEN 'HARD'
  END::"DifficultyLevel_new"
);

ALTER TYPE "DifficultyLevel" RENAME TO "DifficultyLevel_old";
ALTER TYPE "DifficultyLevel_new" RENAME TO "DifficultyLevel";
DROP TYPE "public"."DifficultyLevel_old";

ALTER TABLE "Campaign" ALTER COLUMN "difficultyLevel" SET DEFAULT 'EASY';
ALTER TABLE "TrainingDocument" ALTER COLUMN "difficultyLevel" SET DEFAULT 'EASY';
ALTER TABLE "Quiz" ALTER COLUMN "difficultyLevel" SET DEFAULT 'EASY';
ALTER TABLE "Simulation" ALTER COLUMN "difficultyLevel" SET DEFAULT 'EASY';
ALTER TABLE "SimulatedEmail" ALTER COLUMN "difficultyLevel" SET DEFAULT 'EASY';

COMMIT;

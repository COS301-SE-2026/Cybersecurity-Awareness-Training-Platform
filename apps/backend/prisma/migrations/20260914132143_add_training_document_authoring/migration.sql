-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DifficultyLevel" ADD VALUE 'EASY';
ALTER TYPE "DifficultyLevel" ADD VALUE 'MEDIUM';
ALTER TYPE "DifficultyLevel" ADD VALUE 'HARD';

-- AlterTable
ALTER TABLE "TrainingDocument" ALTER COLUMN "contentRef" DROP NOT NULL;

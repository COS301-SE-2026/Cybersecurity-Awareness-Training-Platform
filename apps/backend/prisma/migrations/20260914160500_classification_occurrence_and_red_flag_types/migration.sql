ALTER TABLE "EmailClassificationResponse"
ADD COLUMN "selectedRedFlagTypes" "EmailRedFlagType"[] NOT NULL DEFAULT ARRAY[]::"EmailRedFlagType"[];

UPDATE "EmailClassificationResponse" AS response
SET "selectedRedFlagTypes" = matched."redFlagTypes"
FROM (
  SELECT selected."emailClassificationResponseId",
         ARRAY_AGG(DISTINCT flag."redFlagType" ORDER BY flag."redFlagType") AS "redFlagTypes"
  FROM "EmailClassificationSelectedRedFlag" AS selected
  JOIN "EmailRedFlag" AS flag ON flag."id" = selected."emailRedFlagId"
  GROUP BY selected."emailClassificationResponseId"
) AS matched
WHERE response."id" = matched."emailClassificationResponseId";

CREATE UNIQUE INDEX "EmailClassificationOccurrence_unique"
ON "EmailClassificationResponse"("campaignAssignmentId", "campaignItemId", "simulatedEmailId");

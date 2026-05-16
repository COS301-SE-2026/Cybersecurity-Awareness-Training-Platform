/*
  User display names are now stored as separate first and last name fields.
  Existing demo data keeps the first token as firstName and the remaining text as lastName.
*/

ALTER TABLE "User" ADD COLUMN "firstName" TEXT;
ALTER TABLE "User" ADD COLUMN "lastName" TEXT;

UPDATE "User"
SET
    "firstName" = COALESCE(NULLIF(split_part("name", ' ', 1), ''), "name"),
    "lastName" = COALESCE(NULLIF(trim(substr("name", length(split_part("name", ' ', 1)) + 1)), ''), '');

ALTER TABLE "User" ALTER COLUMN "firstName" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "lastName" SET NOT NULL;

ALTER TABLE "User" DROP COLUMN "name";

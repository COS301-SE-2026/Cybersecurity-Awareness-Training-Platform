-- Enforce that the recorded organisation security settings updater belongs to the same organisation.
UPDATE "OrganisationSecuritySettings" settings
SET "updatedByOrganisationAdminId" = NULL
WHERE settings."updatedByOrganisationAdminId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "OrganisationAdminProfile" admin_profile
    WHERE admin_profile."id" = settings."updatedByOrganisationAdminId"
      AND admin_profile."organisationId" = settings."organisationId"
  );

ALTER TABLE "OrganisationSecuritySettings"
  DROP CONSTRAINT "OrganisationSecuritySettings_updatedByOrganisationAdminId_fkey";

ALTER TABLE "OrganisationSecuritySettings"
  ADD CONSTRAINT "OrganisationSecuritySettings_updatedByOrganisationAdminId_fkey"
  FOREIGN KEY ("updatedByOrganisationAdminId", "organisationId")
  REFERENCES "OrganisationAdminProfile"("id", "organisationId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

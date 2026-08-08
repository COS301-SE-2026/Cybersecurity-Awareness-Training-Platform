-- AlterEnum
ALTER TYPE "OrganisationPermissionKey" ADD VALUE IF NOT EXISTS 'ASSIGN_CAMPAIGNS';

COMMIT;

BEGIN;

-- Create OrganisationPermission records for all existing organisations for ASSIGN_CAMPAIGNS
INSERT INTO "OrganisationPermission" ("id", "organisationId", "key", "displayName", "description", "isCritical", "updatedAt")
SELECT 
  'org-permission:' || o."id" || ':ASSIGN_CAMPAIGNS',
  o."id",
  'ASSIGN_CAMPAIGNS'::"OrganisationPermissionKey",
  'Assign campaigns',
  'Assign campaigns to eligible organisation trainees.',
  false,
  CURRENT_TIMESTAMP
FROM "Organisation" o
ON CONFLICT ("organisationId", "key") DO NOTHING;

-- Grant ASSIGN_CAMPAIGNS permission to any existing initial admins
INSERT INTO "OrganisationAdminPermission" ("id", "organisationId", "organisationAdminId", "organisationPermissionId")
SELECT 
  'org-admin-permission:' || a."id" || ':' || p."id",
  a."organisationId",
  a."id",
  p."id"
FROM "OrganisationAdminProfile" a
JOIN "OrganisationPermission" p ON p."organisationId" = a."organisationId"
WHERE a."adminStatus" = 'ACTIVE'
  AND a."isInitialAdmin" = true
  AND p."key" = 'ASSIGN_CAMPAIGNS'
ON CONFLICT ("organisationAdminId", "organisationPermissionId") DO NOTHING;

COMMIT;

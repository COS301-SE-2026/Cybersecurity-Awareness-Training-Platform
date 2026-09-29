-- AlterEnum
ALTER TYPE "OrganisationPermissionKey" ADD VALUE IF NOT EXISTS 'MANAGE_ORGANISATION_CONTEXT';

COMMIT;
BEGIN;
INSERT INTO "OrganisationPermission" ("id", "organisationId", "key", "displayName", "description", "isCritical", "updatedAt")
SELECT 
  'org-permission:' || o."id" || ':MANAGE_ORGANISATION_CONTEXT',
  o."id",
  'MANAGE_ORGANISATION_CONTEXT'::"OrganisationPermissionKey",
  'Manage organisation context',
  'Edit organisation information and manage context used by AI.',
  false,
  CURRENT_TIMESTAMP
FROM "Organisation" o
ON CONFLICT ("organisationId", "key") DO NOTHING;

-- Grant MANAGE_ORGANISATION_CONTEXT permission to any existing initial admins
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
  AND p."key" = 'MANAGE_ORGANISATION_CONTEXT'
ON CONFLICT ("organisationAdminId", "organisationPermissionId") DO NOTHING;

COMMIT;
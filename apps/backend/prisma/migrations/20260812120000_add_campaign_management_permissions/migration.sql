ALTER TYPE "OrganisationPermissionKey" ADD VALUE IF NOT EXISTS 'VIEW_CAMPAIGNS';
ALTER TYPE "OrganisationPermissionKey" ADD VALUE IF NOT EXISTS 'MANAGE_CAMPAIGNS';

COMMIT;

BEGIN;

INSERT INTO "OrganisationPermission" ("id", "organisationId", "key", "displayName", "description", "isCritical", "updatedAt")
SELECT 
  'org-permission:' || o."id" || ':VIEW_CAMPAIGNS',
  o."id",
  'VIEW_CAMPAIGNS'::"OrganisationPermissionKey",
  'View campaigns',
  'View organisation campaigns catalog and items.',
  false,
  CURRENT_TIMESTAMP
FROM "Organisation" o
ON CONFLICT ("organisationId", "key") DO NOTHING;

INSERT INTO "OrganisationPermission" ("id", "organisationId", "key", "displayName", "description", "isCritical", "updatedAt")
SELECT 
  'org-permission:' || o."id" || ':MANAGE_CAMPAIGNS',
  o."id",
  'MANAGE_CAMPAIGNS'::"OrganisationPermissionKey",
  'Manage campaigns',
  'Create, update, activate, and archive organisation campaigns.',
  false,
  CURRENT_TIMESTAMP
FROM "Organisation" o
ON CONFLICT ("organisationId", "key") DO NOTHING;

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
  AND p."key" IN ('VIEW_CAMPAIGNS', 'MANAGE_CAMPAIGNS')
ON CONFLICT ("organisationAdminId", "organisationPermissionId") DO NOTHING;

COMMIT;

-- AlterEnum
ALTER TYPE "OrganisationPermissionKey" ADD VALUE IF NOT EXISTS 'VIEW_ORGANISATION_TRAINEES';
ALTER TYPE "OrganisationPermissionKey" ADD VALUE IF NOT EXISTS 'INVITE_ORGANISATION_TRAINEES';
ALTER TYPE "OrganisationPermissionKey" ADD VALUE IF NOT EXISTS 'REMOVE_ORGANISATION_TRAINEES';

ALTER TYPE "OrganisationUserStatus" ADD VALUE IF NOT EXISTS 'DISABLED';

-- Create OrganisationPermission records for all existing organisations for the new trainee permissions
INSERT INTO "OrganisationPermission" ("id", "organisationId", "key", "displayName", "description", "isCritical", "updatedAt")
SELECT 
  'org-permission:' || o."id" || ':VIEW_ORGANISATION_TRAINEES',
  o."id",
  'VIEW_ORGANISATION_TRAINEES'::"OrganisationPermissionKey",
  'View organisation trainees',
  'View organisation trainees and pending invitations.',
  false,
  CURRENT_TIMESTAMP
FROM "Organisation" o
ON CONFLICT ("organisationId", "key") DO NOTHING;

INSERT INTO "OrganisationPermission" ("id", "organisationId", "key", "displayName", "description", "isCritical", "updatedAt")
SELECT 
  'org-permission:' || o."id" || ':INVITE_ORGANISATION_TRAINEES',
  o."id",
  'INVITE_ORGANISATION_TRAINEES'::"OrganisationPermissionKey",
  'Invite organisation trainees',
  'Invite new trainees or manage pending trainee invitations.',
  false,
  CURRENT_TIMESTAMP
FROM "Organisation" o
ON CONFLICT ("organisationId", "key") DO NOTHING;

INSERT INTO "OrganisationPermission" ("id", "organisationId", "key", "displayName", "description", "isCritical", "updatedAt")
SELECT 
  'org-permission:' || o."id" || ':REMOVE_ORGANISATION_TRAINEES',
  o."id",
  'REMOVE_ORGANISATION_TRAINEES'::"OrganisationPermissionKey",
  'Remove organisation trainees',
  'Disable or remove organisation trainee access.',
  false,
  CURRENT_TIMESTAMP
FROM "Organisation" o
ON CONFLICT ("organisationId", "key") DO NOTHING;

-- Grant all new trainee permissions to any existing initial admins
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
  AND p."key" IN ('VIEW_ORGANISATION_TRAINEES', 'INVITE_ORGANISATION_TRAINEES', 'REMOVE_ORGANISATION_TRAINEES')
ON CONFLICT ("organisationAdminId", "organisationPermissionId") DO NOTHING;


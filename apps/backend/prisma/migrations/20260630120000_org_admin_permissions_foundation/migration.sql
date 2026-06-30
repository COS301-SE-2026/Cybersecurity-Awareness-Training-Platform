-- Add organisation admin promotion invitation support.
ALTER TYPE "InvitationPurpose" ADD VALUE 'ORGANISATION_ADMIN_PROMOTION';

-- Stable organisation-scoped permission keys for Sprint 4 organisation admin work.
CREATE TYPE "OrganisationPermissionKey" AS ENUM (
  'VIEW_ORGANISATION_ADMINS',
  'INVITE_ORGANISATION_ADMINS',
  'REMOVE_ORGANISATION_ADMINS',
  'CHANGE_ORGANISATION_ADMIN_PERMISSIONS'
);

-- Preserve existing organisation admin rows while adding lifecycle metadata.
ALTER TABLE "OrganisationAdminProfile"
  ADD COLUMN "isInitialAdmin" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "createdFromInvitationId" TEXT,
  ADD COLUMN "disabledAt" TIMESTAMP(3),
  ADD COLUMN "disabledReason" TEXT;

CREATE TABLE "OrganisationPermission" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "key" "OrganisationPermissionKey" NOT NULL,
  "displayName" TEXT NOT NULL,
  "description" TEXT,
  "isCritical" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OrganisationPermission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganisationAdminPermission" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "organisationAdminId" TEXT NOT NULL,
  "organisationPermissionId" TEXT NOT NULL,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "grantedByOrganisationAdminId" TEXT,

  CONSTRAINT "OrganisationAdminPermission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InvitationPermissionGrant" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "invitationId" TEXT NOT NULL,
  "organisationPermissionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InvitationPermissionGrant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganisationAdminProfile_id_organisationId_key"
  ON "OrganisationAdminProfile"("id", "organisationId");

CREATE UNIQUE INDEX "OrganisationAdminProfile_createdFromInvitationId_organisationId_key"
  ON "OrganisationAdminProfile"("createdFromInvitationId", "organisationId");

CREATE INDEX "OrganisationAdminProfile_isInitialAdmin_idx"
  ON "OrganisationAdminProfile"("isInitialAdmin");

CREATE INDEX "OrganisationAdminProfile_disabledAt_idx"
  ON "OrganisationAdminProfile"("disabledAt");

CREATE UNIQUE INDEX "OrganisationPermission_organisationId_key_key"
  ON "OrganisationPermission"("organisationId", "key");

CREATE UNIQUE INDEX "OrganisationPermission_id_organisationId_key"
  ON "OrganisationPermission"("id", "organisationId");

CREATE INDEX "OrganisationPermission_organisationId_idx"
  ON "OrganisationPermission"("organisationId");

CREATE INDEX "OrganisationPermission_key_idx"
  ON "OrganisationPermission"("key");

CREATE INDEX "OrganisationPermission_isCritical_idx"
  ON "OrganisationPermission"("isCritical");

CREATE INDEX "OrganisationPermission_organisationId_isCritical_idx"
  ON "OrganisationPermission"("organisationId", "isCritical");

CREATE UNIQUE INDEX "OrganisationAdminPermission_organisationAdminId_organisationPermissionId_key"
  ON "OrganisationAdminPermission"("organisationAdminId", "organisationPermissionId");

CREATE INDEX "OrganisationAdminPermission_organisationId_idx"
  ON "OrganisationAdminPermission"("organisationId");

CREATE INDEX "OrganisationAdminPermission_organisationAdminId_idx"
  ON "OrganisationAdminPermission"("organisationAdminId");

CREATE INDEX "OrganisationAdminPermission_organisationPermissionId_idx"
  ON "OrganisationAdminPermission"("organisationPermissionId");

CREATE INDEX "OrganisationAdminPermission_organisationId_organisationPermissionId_idx"
  ON "OrganisationAdminPermission"("organisationId", "organisationPermissionId");

CREATE UNIQUE INDEX "InvitationPermissionGrant_invitationId_organisationPermissionId_key"
  ON "InvitationPermissionGrant"("invitationId", "organisationPermissionId");

CREATE INDEX "InvitationPermissionGrant_organisationId_idx"
  ON "InvitationPermissionGrant"("organisationId");

CREATE INDEX "InvitationPermissionGrant_invitationId_idx"
  ON "InvitationPermissionGrant"("invitationId");

CREATE INDEX "InvitationPermissionGrant_organisationPermissionId_idx"
  ON "InvitationPermissionGrant"("organisationPermissionId");

CREATE INDEX "InvitationPermissionGrant_organisationId_organisationPermissionId_idx"
  ON "InvitationPermissionGrant"("organisationId", "organisationPermissionId");

ALTER TABLE "OrganisationAdminProfile"
  ADD CONSTRAINT "OrganisationAdminProfile_createdFromInvitationId_fkey"
  FOREIGN KEY ("createdFromInvitationId", "organisationId") REFERENCES "Invitation"("id", "organisationId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrganisationPermission"
  ADD CONSTRAINT "OrganisationPermission_organisationId_fkey"
  FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrganisationAdminPermission"
  ADD CONSTRAINT "OrganisationAdminPermission_organisationId_fkey"
  FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrganisationAdminPermission"
  ADD CONSTRAINT "OrganisationAdminPermission_organisationAdminId_fkey"
  FOREIGN KEY ("organisationAdminId", "organisationId") REFERENCES "OrganisationAdminProfile"("id", "organisationId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrganisationAdminPermission"
  ADD CONSTRAINT "OrganisationAdminPermission_organisationPermissionId_fkey"
  FOREIGN KEY ("organisationPermissionId", "organisationId") REFERENCES "OrganisationPermission"("id", "organisationId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrganisationAdminPermission"
  ADD CONSTRAINT "OrganisationAdminPermission_grantedByOrganisationAdminId_fkey"
  FOREIGN KEY ("grantedByOrganisationAdminId", "organisationId") REFERENCES "OrganisationAdminProfile"("id", "organisationId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InvitationPermissionGrant"
  ADD CONSTRAINT "InvitationPermissionGrant_organisationId_fkey"
  FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InvitationPermissionGrant"
  ADD CONSTRAINT "InvitationPermissionGrant_invitationId_fkey"
  FOREIGN KEY ("invitationId", "organisationId") REFERENCES "Invitation"("id", "organisationId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InvitationPermissionGrant"
  ADD CONSTRAINT "InvitationPermissionGrant_organisationPermissionId_fkey"
  FOREIGN KEY ("organisationPermissionId", "organisationId") REFERENCES "OrganisationPermission"("id", "organisationId")
  ON DELETE CASCADE ON UPDATE CASCADE;

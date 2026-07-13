/*
  Warnings:

  - A unique constraint covering the columns `[initialAdminOrganisationId]` on the table `Invitation` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "initialAdminOrganisationId" TEXT;

-- AlterTable
ALTER TABLE "Organisation" ADD COLUMN     "approximateSize" INTEGER,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "primaryDomain" TEXT,
ADD COLUMN     "website" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_initialAdminOrganisationId_key" ON "Invitation"("initialAdminOrganisationId");

-- RenameForeignKey
ALTER TABLE "InvitationPermissionGrant" RENAME CONSTRAINT "InvitationPermissionGrant_invitationId_fkey" TO "InvitationPermissionGrant_invitationId_organisationId_fkey";

-- RenameForeignKey
ALTER TABLE "InvitationPermissionGrant" RENAME CONSTRAINT "InvitationPermissionGrant_organisationPermissionId_fkey" TO "InvitationPermissionGrant_organisationPermissionId_organis_fkey";

-- RenameForeignKey
ALTER TABLE "OrganisationAdminPermission" RENAME CONSTRAINT "OrganisationAdminPermission_grantedByOrganisationAdminId_fkey" TO "OrganisationAdminPermission_grantedByOrganisationAdminId_o_fkey";

-- RenameForeignKey
ALTER TABLE "OrganisationAdminPermission" RENAME CONSTRAINT "OrganisationAdminPermission_organisationAdminId_fkey" TO "OrganisationAdminPermission_organisationAdminId_organisati_fkey";

-- RenameForeignKey
ALTER TABLE "OrganisationAdminPermission" RENAME CONSTRAINT "OrganisationAdminPermission_organisationPermissionId_fkey" TO "OrganisationAdminPermission_organisationPermissionId_organ_fkey";

-- RenameForeignKey
ALTER TABLE "OrganisationAdminProfile" RENAME CONSTRAINT "OrganisationAdminProfile_createdFromInvitationId_fkey" TO "OrganisationAdminProfile_createdFromInvitationId_organisat_fkey";

-- RenameForeignKey
ALTER TABLE "OrganisationSecuritySettings" RENAME CONSTRAINT "OrganisationSecuritySettings_updatedByOrganisationAdminId_fkey" TO "OrganisationSecuritySettings_updatedByOrganisationAdminId__fkey";

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_initialAdminOrganisationId_fkey" FOREIGN KEY ("initialAdminOrganisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "InvitationPermissionGrant_invitationId_organisationPermissionId" RENAME TO "InvitationPermissionGrant_invitationId_organisationPermissi_key";

-- RenameIndex
ALTER INDEX "InvitationPermissionGrant_organisationId_organisationPermission" RENAME TO "InvitationPermissionGrant_organisationId_organisationPermis_idx";

-- RenameIndex
ALTER INDEX "OrganisationAdminPermission_organisationAdminId_organisationPer" RENAME TO "OrganisationAdminPermission_organisationAdminId_organisatio_key";

-- RenameIndex
ALTER INDEX "OrganisationAdminPermission_organisationId_organisationPermissi" RENAME TO "OrganisationAdminPermission_organisationId_organisationPerm_idx";

-- RenameIndex
ALTER INDEX "OrganisationAdminProfile_createdFromInvitationId_organisationId" RENAME TO "OrganisationAdminProfile_createdFromInvitationId_organisati_key";

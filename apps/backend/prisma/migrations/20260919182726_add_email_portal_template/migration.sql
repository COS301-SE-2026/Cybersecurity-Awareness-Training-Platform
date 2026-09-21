-- AlterTable
ALTER TABLE "OrganisationEmail" ADD COLUMN     "portalTemplateId" "PortalTemplateId";

-- AlterTable
ALTER TABLE "PhishingSimulationEmail" ADD COLUMN     "portalTemplateId" "PortalTemplateId";

-- AlterTable
ALTER TABLE "SimulatedEmail" ADD COLUMN     "portalTemplateId" "PortalTemplateId";

CREATE TYPE "PortalTemplateId" AS ENUM (
    'GENERIC_ACCOUNT_LOGIN_V1',
    'GENERIC_DOCUMENT_ACCESS_V1',
    'GENERIC_BANKING_LOGIN_V1'
);

CREATE TYPE "ManagedPortalLinkPurpose" AS ENUM ('PHISHING_PORTAL');

CREATE TYPE "PortalInteractionEventType" AS ENUM (
    'MANAGED_LINK_REQUESTED',
    'PORTAL_VISITED',
    'PORTAL_IDENTIFIER_FIELD_INTERACTED',
    'PORTAL_CREDENTIAL_FIELD_INTERACTED',
    'CREDENTIAL_SUBMISSION_ATTEMPTED',
    'PORTAL_EDUCATIONAL_REVEAL_VIEWED'
);

ALTER TABLE "OrganisationEmail"
ADD COLUMN "portalTemplateId" "PortalTemplateId";

ALTER TABLE "SimulatedEmail"
ADD COLUMN "portalTemplateId" "PortalTemplateId";

CREATE TABLE "ManagedPortalLink" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "purpose" "ManagedPortalLinkPurpose" NOT NULL,
    "portalTemplateId" "PortalTemplateId" NOT NULL,
    "traineeProfileId" TEXT NOT NULL,
    "organisationId" TEXT,
    "campaignAssignmentId" TEXT NOT NULL,
    "campaignItemId" TEXT NOT NULL,
    "simulatedEmailId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManagedPortalLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PortalInteractionEvent" (
    "id" TEXT NOT NULL,
    "managedPortalLinkId" TEXT NOT NULL,
    "eventType" "PortalInteractionEventType" NOT NULL,
    "clientEventId" VARCHAR(200),
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalInteractionEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PortalInteractionEvent_clientEventId_check" CHECK (
        (
            "eventType" = 'MANAGED_LINK_REQUESTED'::"PortalInteractionEventType"
            AND "clientEventId" IS NULL
        ) OR (
            "eventType" <> 'MANAGED_LINK_REQUESTED'::"PortalInteractionEventType"
            AND "clientEventId" IS NOT NULL
        )
    )
);

CREATE UNIQUE INDEX "ManagedPortalLink_tokenHash_key" ON "ManagedPortalLink"("tokenHash");
CREATE INDEX "ManagedPortalLink_traineeProfileId_idx" ON "ManagedPortalLink"("traineeProfileId");
CREATE INDEX "ManagedPortalLink_organisationId_idx" ON "ManagedPortalLink"("organisationId");
CREATE INDEX "ManagedPortalLink_campaignAssignmentId_idx" ON "ManagedPortalLink"("campaignAssignmentId");
CREATE INDEX "ManagedPortalLink_campaignItemId_idx" ON "ManagedPortalLink"("campaignItemId");
CREATE INDEX "ManagedPortalLink_simulatedEmailId_idx" ON "ManagedPortalLink"("simulatedEmailId");
CREATE INDEX "ManagedPortalLink_expiresAt_idx" ON "ManagedPortalLink"("expiresAt");
CREATE INDEX "ManagedPortalLink_revokedAt_idx" ON "ManagedPortalLink"("revokedAt");

CREATE UNIQUE INDEX "PortalInteractionEvent_managedPortalLinkId_clientEventId_key"
ON "PortalInteractionEvent"("managedPortalLinkId", "clientEventId");

CREATE INDEX "PortalInteractionEvent_managedPortalLinkId_occurredAt_idx"
ON "PortalInteractionEvent"("managedPortalLinkId", "occurredAt");

ALTER TABLE "ManagedPortalLink"
ADD CONSTRAINT "ManagedPortalLink_traineeProfileId_fkey"
FOREIGN KEY ("traineeProfileId") REFERENCES "TraineeProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ManagedPortalLink"
ADD CONSTRAINT "ManagedPortalLink_organisationId_fkey"
FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ManagedPortalLink"
ADD CONSTRAINT "ManagedPortalLink_campaignAssignmentId_fkey"
FOREIGN KEY ("campaignAssignmentId") REFERENCES "CampaignAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ManagedPortalLink"
ADD CONSTRAINT "ManagedPortalLink_campaignItemId_fkey"
FOREIGN KEY ("campaignItemId") REFERENCES "CampaignItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ManagedPortalLink"
ADD CONSTRAINT "ManagedPortalLink_simulatedEmailId_fkey"
FOREIGN KEY ("simulatedEmailId") REFERENCES "SimulatedEmail"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PortalInteractionEvent"
ADD CONSTRAINT "PortalInteractionEvent_managedPortalLinkId_fkey"
FOREIGN KEY ("managedPortalLinkId") REFERENCES "ManagedPortalLink"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

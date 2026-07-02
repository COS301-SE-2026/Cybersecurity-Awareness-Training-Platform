-- Create organisation security settings and optional user security preferences.
CREATE TABLE "UserSecurityPreferences" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "preferredRegularSessionLengthHours" INTEGER,
  "preferredRememberMeSessionLengthHours" INTEGER,
  "preferredIdleTimeoutMinutes" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserSecurityPreferences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganisationSecuritySettings" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "enforceRememberMePolicy" BOOLEAN NOT NULL DEFAULT true,
  "allowRememberMe" BOOLEAN NOT NULL DEFAULT true,
  "maxRememberedSessionHours" INTEGER DEFAULT 168,
  "enforceRegularSessionLength" BOOLEAN NOT NULL DEFAULT true,
  "regularSessionLengthHours" INTEGER DEFAULT 8,
  "enforceIdleTimeout" BOOLEAN NOT NULL DEFAULT false,
  "idleTimeoutMinutes" INTEGER,
  "requireReauthenticationForSensitiveActions" BOOLEAN NOT NULL DEFAULT true,
  "allowTraineeEmailChange" BOOLEAN NOT NULL DEFAULT true,
  "updatedByOrganisationAdminId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OrganisationSecuritySettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserSecurityPreferences_userId_key"
  ON "UserSecurityPreferences"("userId");

CREATE UNIQUE INDEX "OrganisationSecuritySettings_organisationId_key"
  ON "OrganisationSecuritySettings"("organisationId");

CREATE INDEX "OrganisationSecuritySettings_updatedByOrganisationAdminId_idx"
  ON "OrganisationSecuritySettings"("updatedByOrganisationAdminId");

ALTER TABLE "UserSecurityPreferences"
  ADD CONSTRAINT "UserSecurityPreferences_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrganisationSecuritySettings"
  ADD CONSTRAINT "OrganisationSecuritySettings_organisationId_fkey"
  FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrganisationSecuritySettings"
  ADD CONSTRAINT "OrganisationSecuritySettings_updatedByOrganisationAdminId_fkey"
  FOREIGN KEY ("updatedByOrganisationAdminId") REFERENCES "OrganisationAdminProfile"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "OrganisationSecuritySettings" (
  "id",
  "organisationId",
  "enforceRememberMePolicy",
  "allowRememberMe",
  "maxRememberedSessionHours",
  "enforceRegularSessionLength",
  "regularSessionLengthHours",
  "enforceIdleTimeout",
  "idleTimeoutMinutes",
  "requireReauthenticationForSensitiveActions",
  "allowTraineeEmailChange",
  "updatedByOrganisationAdminId",
  "createdAt",
  "updatedAt"
)
SELECT
  CONCAT('organisation-security-settings-', o."id"),
  o."id",
  true,
  true,
  168,
  true,
  8,
  false,
  NULL,
  true,
  true,
  NULL,
  NOW(),
  NOW()
FROM "Organisation" o
WHERE NOT EXISTS (
  SELECT 1
  FROM "OrganisationSecuritySettings" settings
  WHERE settings."organisationId" = o."id"
);

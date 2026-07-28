ALTER TABLE "OrganisationRegistrationRequest"
  RENAME COLUMN "submittedIndustry" TO "submittedOrganisationDescription";

ALTER TABLE "OrganisationRegistrationRequest"
  RENAME COLUMN "submittedEmployeeCount" TO "submittedOrganisationSize";

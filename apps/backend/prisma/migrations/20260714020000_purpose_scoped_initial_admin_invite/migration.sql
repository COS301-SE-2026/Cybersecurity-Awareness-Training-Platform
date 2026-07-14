-- Drop the old column-level unique constraint (covers NULLs, wrong-purpose rows, and disagrees with organisationId)
DROP INDEX IF EXISTS "Invitation_initialAdminOrganisationId_key";

-- Drop the redundant foreign key on the column
ALTER TABLE "Invitation" DROP CONSTRAINT IF EXISTS "Invitation_initialAdminOrganisationId_fkey";

-- Drop the redundant column itself
ALTER TABLE "Invitation" DROP COLUMN IF EXISTS "initialAdminOrganisationId";

-- Add composite index to support efficient lookups by organisation + purpose
CREATE INDEX IF NOT EXISTS "Invitation_organisationId_purpose_idx" ON "Invitation"("organisationId", "purpose");

-- Add a purpose-scoped partial unique index: at most one INITIAL_ORGANISATION_ADMIN_SETUP invitation per organisation.
-- This enforces the invariant without allowing wrong-purpose or null-matching rows to satisfy the constraint.
-- The migration is safe on existing dev rows because the column being dropped was nullable.
CREATE UNIQUE INDEX "Invitation_org_initial_admin_setup_unique"
  ON "Invitation"("organisationId")
  WHERE "purpose" = 'INITIAL_ORGANISATION_ADMIN_SETUP';

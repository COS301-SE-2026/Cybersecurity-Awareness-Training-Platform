import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const schema = readFileSync(resolve(process.cwd(), 'prisma/schema.prisma'), 'utf8');
const migration = readFileSync(
  resolve(
    process.cwd(),
    'prisma/migrations/20260915120000_organisation_email_authoring_foundation/migration.sql',
  ),
  'utf8',
);
const nullableLinkMigration = readFileSync(
  resolve(
    process.cwd(),
    'prisma/migrations/20260915130000_organisation_email_nullable_link/migration.sql',
  ),
  'utf8',
);
const nullablePreviewMigration = readFileSync(
  resolve(
    process.cwd(),
    'prisma/migrations/20260916120000_organisation_email_nullable_preview/migration.sql',
  ),
  'utf8',
);

describe('organisation email authoring schema', () => {
  it('defines the reusable organisation email record and lifecycle', () => {
    expect(schema).toContain('enum OrganisationEmailStatus');
    expect(schema).toMatch(/enum OrganisationEmailStatus\s*{\s*DRAFT\s*ACTIVE\s*}/);
    expect(schema).toContain('model OrganisationEmail');

    for (const field of [
      'organisationId',
      'createdByUserId',
      'senderLabel',
      'senderAddress',
      'subject',
      'preview',
      'bodyHtml',
      'linkAnchorText',
      'expectedClassification',
      'categories',
      'difficultyLevel',
      'contentHash',
      'status',
      'createdAt',
      'updatedAt',
    ]) {
      expect(schema.slice(schema.indexOf('model OrganisationEmail'))).toContain(field);
    }
  });

  it('allows link metadata to be absent when no system-link marker is authored', () => {
    const organisationEmailModel = schema.slice(
      schema.indexOf('model OrganisationEmail'),
      schema.indexOf('model SimulatedEmail'),
    );

    expect(organisationEmailModel).toMatch(/linkAnchorText\s+String\?/);
    expect(nullableLinkMigration).toContain(
      'ALTER TABLE "OrganisationEmail" ALTER COLUMN "linkAnchorText" DROP NOT NULL',
    );
  });

  it('stores the optional preview without forcing a blank persistence value', () => {
    const organisationEmailModel = schema.slice(
      schema.indexOf('model OrganisationEmail'),
      schema.indexOf('model SimulatedEmail'),
    );

    expect(organisationEmailModel).toMatch(/preview\s+String\?/);
    expect(migration).toContain('"preview" TEXT,');
    expect(nullablePreviewMigration).toContain(
      'ALTER TABLE "OrganisationEmail" ALTER COLUMN "preview" DROP NOT NULL',
    );
  });

  it('keeps simulated emails as positioned snapshots with nullable provenance', () => {
    expect(schema).toMatch(/sourceOrganisationEmailId\s+String\?/);
    expect(schema).toMatch(/position\s+Int/);
    expect(schema).toMatch(/linkAnchorText\s+String\?/);
    expect(schema).toContain('@@unique([inboxId, position])');
    expect(schema).toContain('@@index([sourceOrganisationEmailId])');
    expect(schema).toMatch(/sourceOrganisationEmail\s+OrganisationEmail\?.*onDelete: SetNull/);
    expect(schema).toContain('simulatedLinkTarget');
    expect(schema).toContain('hasAttachment');
  });

  it('allows exactly one red-flag owner and cascades each owned identity', () => {
    expect(schema).toMatch(/simulatedEmailId\s+String\?/);
    expect(schema).toMatch(/organisationEmailId\s+String\?/);
    expect(migration).toContain(
      'CHECK (num_nonnulls("simulatedEmailId", "organisationEmailId") = 1)',
    );
    expect(migration).toContain(
      'FOREIGN KEY ("organisationEmailId") REFERENCES "OrganisationEmail"("id") ON DELETE CASCADE',
    );
  });

  it('backfills existing positions in the legacy newest-first visible order', () => {
    const backfill = migration.indexOf('ROW_NUMBER() OVER');
    const required = migration.indexOf('ALTER COLUMN "position" SET NOT NULL');
    const unique = migration.indexOf('SimulatedEmail_inboxId_position_key');

    expect(backfill).toBeGreaterThan(-1);
    expect(migration).toContain('ORDER BY "receivedAt" DESC, "createdAt" DESC, "id" ASC');
    expect(backfill).toBeLessThan(required);
    expect(required).toBeLessThan(unique);
  });

  it('indexes reusable ownership and hashes without forbidding identical drafts', () => {
    expect(migration).toContain('OrganisationEmail_organisationId_contentHash_idx');
    expect(migration).not.toContain(
      'CREATE UNIQUE INDEX "OrganisationEmail_organisationId_contentHash_idx"',
    );
    expect(migration).toContain('OrganisationEmail_organisationId_status_updatedAt_idx');
    expect(migration).toContain('ON DELETE SET NULL ON UPDATE CASCADE');
  });
});

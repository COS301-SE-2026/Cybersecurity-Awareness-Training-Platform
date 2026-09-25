import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const schema = readFileSync(resolve(process.cwd(), 'prisma/schema.prisma'), 'utf8');
const migration = readFileSync(
  resolve(process.cwd(), 'prisma/migrations/20260921120000_add_portal_persistence/migration.sql'),
  'utf8',
);
const occurrenceMigration = readFileSync(
  resolve(
    process.cwd(),
    'prisma/migrations/20260921130000_add_managed_portal_occurrence_uniqueness/migration.sql',
  ),
  'utf8',
);
const snapshotMigration = readFileSync(
  resolve(
    process.cwd(),
    'prisma/migrations/20260919182726_add_email_portal_template/migration.sql',
  ),
  'utf8',
);
const realEmailMigration = readFileSync(
  resolve(
    process.cwd(),
    'prisma/migrations/20260924120000_connect_real_email_portals/migration.sql',
  ),
  'utf8',
);

function schemaBlock(kind: 'enum' | 'model', name: string): string {
  const match = schema.match(new RegExp(`${kind} ${name}\\s*\\{([\\s\\S]*?)\\n\\}`));

  if (!match?.[1]) {
    throw new Error(`${kind} ${name} was not found in Prisma schema.`);
  }

  return match[1];
}

function migrationTable(name: string): string {
  const match = migration.match(new RegExp(`CREATE TABLE "${name}" \\(\\n([\\s\\S]*?)\\n\\);`));

  if (!match?.[1]) {
    throw new Error(`${name} was not found in the portal persistence migration.`);
  }

  return match[1];
}

describe('portal persistence Prisma schema', () => {
  it('uses the canonical closed portal template and interaction vocabularies', () => {
    expect(schemaBlock('enum', 'PortalTemplateId')).toMatch(
      /^\s*GENERIC_ACCOUNT_LOGIN_V1\s+GENERIC_DOCUMENT_ACCESS_V1\s+GENERIC_BANKING_LOGIN_V1\s*$/,
    );
    expect(schemaBlock('enum', 'ManagedPortalLinkPurpose')).toMatch(/^\s*PHISHING_PORTAL\s*$/);
    expect(schemaBlock('enum', 'PortalInteractionEventType')).toMatch(
      /^\s*MANAGED_LINK_REQUESTED\s+PORTAL_VISITED\s+PORTAL_IDENTIFIER_FIELD_INTERACTED\s+PORTAL_CREDENTIAL_FIELD_INTERACTED\s+CREDENTIAL_SUBMISSION_ATTEMPTED\s+PORTAL_EDUCATIONAL_REVEAL_VIEWED\s*$/,
    );
  });

  it('adds independent nullable portal snapshots without defaults', () => {
    const organisationEmail = schemaBlock('model', 'OrganisationEmail');
    const simulatedEmail = schemaBlock('model', 'SimulatedEmail');

    expect(organisationEmail).toMatch(/portalTemplateId\s+PortalTemplateId\?/);
    expect(simulatedEmail).toMatch(/portalTemplateId\s+PortalTemplateId\?/);
    expect(organisationEmail).not.toMatch(/portalTemplateId.*@default/);
    expect(simulatedEmail).not.toMatch(/portalTemplateId.*@default/);
    expect(
      snapshotMigration.match(/ADD COLUMN\s+"portalTemplateId" "PortalTemplateId";/g),
    ).toHaveLength(3);
    expect(snapshotMigration).not.toMatch(/ADD COLUMN\s+"portalTemplateId"[^;]*(NOT NULL|DEFAULT)/);
    expect(migration).not.toContain('ADD COLUMN "portalTemplateId"');
    expect(migration).not.toContain('CREATE TYPE "PortalTemplateId"');
  });

  it('stores only hashed token lookup material and the complete source', () => {
    const managedLink = schemaBlock('model', 'ManagedPortalLink');

    for (const expected of [
      'tokenHash            String                   @unique',
      'publicOrigin         String',
      'purpose              ManagedPortalLinkPurpose',
      'portalTemplateId     PortalTemplateId',
      'traineeProfileId     String',
      'organisationId       String?',
      'campaignAssignmentId String',
      'campaignItemId       String',
      'simulatedEmailId     String',
      'expiresAt            DateTime',
      'revokedAt            DateTime?',
      'createdAt            DateTime                 @default(now())',
    ]) {
      expect(managedLink).toContain(expected);
    }

    expect(managedLink).toMatch(/phishingSimulationMessageId\s+String\? @unique/);
    expect(migrationTable('ManagedPortalLink')).toContain('"publicOrigin" TEXT NOT NULL');
    expect(migration).not.toMatch(
      /CREATE TABLE "(?:SimulationOrigin|SimulationDomain|PublicOrigin)"/,
    );
    expect(managedLink).not.toMatch(
      /\b(rawToken|token|tokenCiphertext|tokenPrefix|sourceType|sourceJson)\b/,
    );
    expect(managedLink).toContain(
      '@@unique([campaignAssignmentId, campaignItemId, simulatedEmailId], map: "ManagedPortalLink_occurrence_key")',
    );
    expect(migration).not.toContain('tokenCiphertext');
    expect(migration).not.toContain('ManagedPortalLink_occurrence_key');
    expect(occurrenceMigration).toContain(
      'ON "ManagedPortalLink"("campaignAssignmentId", "campaignItemId", "simulatedEmailId")',
    );
  });

  it('adds an exclusive real-email source without rewriting historical links or token storage', () => {
    expect(realEmailMigration).toContain('ADD COLUMN "phishingSimulationMessageId" TEXT');
    expect(realEmailMigration).toContain('"ManagedPortalLink_source_context_check"');
    expect(realEmailMigration).toContain('"phishingSimulationMessageId" IS NULL');
    expect(realEmailMigration).toContain('"phishingSimulationMessageId" IS NOT NULL');
    expect(realEmailMigration).toContain('"campaignItemId" IS NULL');
    expect(realEmailMigration).toContain('"simulatedEmailId" IS NULL');
    expect(realEmailMigration).toContain(
      'CREATE UNIQUE INDEX "ManagedPortalLink_phishingSimulationMessageId_key"',
    );
    expect(realEmailMigration).toContain('ON DELETE RESTRICT ON UPDATE CASCADE');
    expect(realEmailMigration).not.toMatch(
      /\b(?:DROP TABLE|TRUNCATE|DELETE FROM|UPDATE "ManagedPortalLink")\b/,
    );
    expect(realEmailMigration).not.toMatch(
      /rawToken|tokenCiphertext|credential|enteredValue|bearerUrl/i,
    );
  });

  it('enforces event retry idempotency and client identifier policy', () => {
    const event = schemaBlock('model', 'PortalInteractionEvent');

    expect(event).toContain('clientEventId       String?                    @db.VarChar(200)');
    expect(event).toContain('occurredAt          DateTime                   @default(now())');
    expect(event).toContain('@@unique([managedPortalLinkId, clientEventId])');
    expect(event).toContain('@@index([managedPortalLinkId, occurredAt])');
    expect(migration).toContain(
      '"eventType" = \'MANAGED_LINK_REQUESTED\'::"PortalInteractionEventType"',
    );
    expect(migration).toContain('AND "clientEventId" IS NULL');
    expect(migration).toContain(
      '"eventType" <> \'MANAGED_LINK_REQUESTED\'::"PortalInteractionEventType"',
    );
    expect(migration).toContain('AND "clientEventId" IS NOT NULL');
    expect(migration).toContain('PortalInteractionEvent_managedPortalLinkId_clientEventId_key');
  });

  it('preserves historical facts through restrictive required relations', () => {
    for (const relation of [
      'traineeProfileId',
      'campaignAssignmentId',
      'campaignItemId',
      'simulatedEmailId',
    ]) {
      expect(migration).toContain(`FOREIGN KEY ("${relation}") REFERENCES`);
    }

    expect(migration.match(/ON DELETE RESTRICT ON UPDATE CASCADE/g)).toHaveLength(5);
    expect(migration).toContain(
      'FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE SET NULL',
    );
  });

  it('adds no prohibited portal storage surfaces', () => {
    const portalTables = [
      migrationTable('ManagedPortalLink'),
      migrationTable('PortalInteractionEvent'),
    ].join('\n');

    for (const prohibitedColumn of [
      '"token"',
      '"rawToken"',
      '"managedPortalUrl"',
      '"tokenPrefix"',
      '"metadata"',
      '"payload"',
      '"formData"',
      '"username"',
      '"password"',
      '"credentialHash"',
      '"maskedCredential"',
      '"otp"',
      '"pin"',
    ]) {
      expect(portalTables).not.toContain(prohibitedColumn);
    }
  });
});

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';

const migration = readFileSync(
  resolve(
    process.cwd(),
    'prisma/migrations/20260915120000_organisation_email_authoring_foundation/migration.sql',
  ),
  'utf8',
);

function positionBackfillSql() {
  const start = migration.indexOf('WITH ranked_emails AS');
  const end = migration.indexOf(';', start);
  if (start < 0 || end < 0) throw new Error('Position backfill SQL was not found');
  return migration.slice(start, end + 1);
}

describe('organisation email authoring migration', () => {
  it('preserves an existing inbox newest-first order across multiple received times', async () => {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`
        CREATE TEMP TABLE "SimulatedEmail" (
          "id" TEXT PRIMARY KEY,
          "inboxId" TEXT NOT NULL,
          "receivedAt" TIMESTAMP(3) NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL,
          "position" INTEGER
        ) ON COMMIT DROP
      `);
      await tx.$executeRaw`
        INSERT INTO "SimulatedEmail" ("id", "inboxId", "receivedAt", "createdAt")
        VALUES
          ('oldest', 'existing-inbox', ${new Date('2026-01-01T08:00:00.000Z')}, ${new Date('2026-01-01T08:00:00.000Z')}),
          ('newest', 'existing-inbox', ${new Date('2026-03-01T08:00:00.000Z')}, ${new Date('2026-03-01T08:00:00.000Z')}),
          ('middle', 'existing-inbox', ${new Date('2026-02-01T08:00:00.000Z')}, ${new Date('2026-02-01T08:00:00.000Z')})
      `;

      await tx.$executeRawUnsafe(positionBackfillSql());

      const rows = await tx.$queryRaw<Array<{ id: string; position: number }>>`
        SELECT "id", "position"
        FROM "SimulatedEmail"
        WHERE "inboxId" = 'existing-inbox'
        ORDER BY "position" ASC
      `;

      expect(rows).toEqual([
        { id: 'newest', position: 0 },
        { id: 'middle', position: 1 },
        { id: 'oldest', position: 2 },
      ]);
    });
  });
});

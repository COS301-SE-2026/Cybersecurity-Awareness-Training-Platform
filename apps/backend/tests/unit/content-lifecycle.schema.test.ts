import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const schema = readFileSync(resolve(process.cwd(), 'prisma/schema.prisma'), 'utf8');
const migration = readFileSync(
  resolve(
    process.cwd(),
    'prisma/migrations/20260910120000_reusable_content_lifecycle/migration.sql',
  ),
  'utf8',
);

describe('reusable content lifecycle schema', () => {
  it('defines the agreed categories and compatible difficulty levels', () => {
    for (const value of [
      'PHISHING_AND_SUSPICIOUS_MESSAGES',
      'LINKS_DOMAINS_AND_SENDER_VERIFICATION',
      'PASSWORDS_AND_AUTHENTICATION',
      'SOCIAL_ENGINEERING_AND_INFORMATION_DISCLOSURE',
      'DATA_DEVICE_AND_ACCOUNT_SAFETY',
    ]) {
      expect(schema).toContain(value);
      expect(migration).toContain(`'${value}'`);
    }

    for (const value of ['EASY', 'MEDIUM', 'HARD']) {
      expect(migration).not.toContain(`ADD VALUE IF NOT EXISTS '${value}'`);
    }
  });

  it('adds ownership and multi-category fields without guessing legacy classifications', () => {
    for (const model of ['TrainingDocument', 'Quiz', 'Simulation']) {
      expect(migration).toContain(`ALTER TABLE "${model}" ADD COLUMN "organisationId" TEXT;`);
      expect(migration).toContain(
        `ALTER TABLE "${model}" ADD CONSTRAINT "${model}_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
      );
    }

    for (const model of ['TrainingDocument', 'QuizQuestion', 'SimulatedEmail']) {
      expect(migration).toContain(
        `ALTER TABLE "${model}" ADD COLUMN "categories" "ContentCategory"[] NOT NULL DEFAULT ARRAY[]::"ContentCategory"[];`,
      );
    }
    expect(migration).not.toContain("DEFAULT 'PHISHING_AND_SUSPICIOUS_MESSAGES'");
    expect(migration).not.toContain('ALTER TABLE "Quiz" ADD COLUMN "category"');
    expect(migration).not.toContain('ALTER TABLE "Simulation" ADD COLUMN "category"');
  });
});

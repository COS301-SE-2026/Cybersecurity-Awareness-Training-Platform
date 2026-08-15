import { afterAll, beforeEach } from 'vitest';

const TEST_DATABASE_URL_EXAMPLE =
  'postgresql://insightful_phish:insightful_phish@localhost:5432/insightful_phish_test';

process.env.NODE_ENV = 'test';

await import('dotenv/config');

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

function getDatabaseName(databaseUrl: string | undefined) {
  if (!databaseUrl) {
    return undefined;
  }

  try {
    return new URL(databaseUrl).pathname.replace(/^\//, '');
  } catch {
    return undefined;
  }
}

function assertIntegrationDatabaseConfigured() {
  const databaseName = getDatabaseName(process.env.DATABASE_URL);

  if (process.env.TEST_DATABASE_URL || databaseName?.toLowerCase().includes('test')) {
    return;
  }

  throw new Error(
    [
      'Backend integration tests require TEST_DATABASE_URL or DATABASE_URL to point to a dedicated test database.',
      `The active DATABASE_URL appears to point to "${databaseName ?? 'an unknown database'}", not a test database.`,
      'The development database insightful_phish_dev must never be cleaned by integration tests.',
      `Command Prompt: set "TEST_DATABASE_URL=${TEST_DATABASE_URL_EXAMPLE}"`,
      `PowerShell: $env:TEST_DATABASE_URL="${TEST_DATABASE_URL_EXAMPLE}"`,
      'Then run: pnpm --filter @insightful-phish/backend test:integration',
    ].join('\n'),
  );
}

assertIntegrationDatabaseConfigured();

async function getDatabaseHelper() {
  return import('./helpers/database.js');
}

beforeEach(async () => {
  const { resetTestDatabase } = await getDatabaseHelper();

  await resetTestDatabase();
}, 30000);

afterAll(async () => {
  const { disconnectTestPrisma } = await getDatabaseHelper();

  await disconnectTestPrisma();
});

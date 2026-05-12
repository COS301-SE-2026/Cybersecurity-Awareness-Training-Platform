import { afterAll, beforeEach } from 'vitest';

process.env.NODE_ENV = 'test';

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

async function getDatabaseHelper() {
  return import('./helpers/database.js');
}

beforeEach(async () => {
  const { resetTestDatabase } = await getDatabaseHelper();

  await resetTestDatabase();
});

afterAll(async () => {
  const { disconnectTestPrisma } = await getDatabaseHelper();

  await disconnectTestPrisma();
});

const BLOCKED_DATABASE_NAMES = new Set([
  'insightful_phish_dev',
  'postgres',
  'template0',
  'template1',
]);

const PRODUCTION_HOST_PARTS = ['prod', 'production'];

export interface TestDatabaseDetails {
  url: string;
  databaseName: string;
  host: string;
}

export function getActiveDatabaseUrl() {
  return process.env.DATABASE_URL;
}

export function assertTestDatabase(): TestDatabaseDetails {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(
      'Refusing to clean the database because NODE_ENV is not "test". Set NODE_ENV=test before running test database cleanup.',
    );
  }

  const databaseUrl = getActiveDatabaseUrl();

  if (!databaseUrl) {
    throw new Error('Refusing to clean the database because DATABASE_URL is missing.');
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    throw new Error('Refusing to clean the database because DATABASE_URL could not be parsed.');
  }

  const databaseName = parsedUrl.pathname.replace(/^\//, '');

  if (!databaseName) {
    throw new Error(
      'Refusing to clean the database because DATABASE_URL does not include a database name.',
    );
  }

  if (!databaseName.toLowerCase().includes('test')) {
    throw new Error(
      `Refusing to clean database "${databaseName}" because its name does not contain "test".`,
    );
  }

  if (BLOCKED_DATABASE_NAMES.has(databaseName.toLowerCase())) {
    throw new Error(
      `Refusing to clean protected database "${databaseName}". Use a dedicated test database instead.`,
    );
  }

  const host = parsedUrl.hostname.toLowerCase();

  if (PRODUCTION_HOST_PARTS.some((part) => host.includes(part))) {
    throw new Error(
      `Refusing to clean database "${databaseName}" because host "${parsedUrl.hostname}" looks production-like.`,
    );
  }

  return {
    url: databaseUrl,
    databaseName,
    host: parsedUrl.hostname,
  };
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

export async function truncateTestDatabase() {
  assertTestDatabase();

  const { prisma } = await import('../../src/lib/prisma.js');
  const tables = await prisma.$queryRaw<{ table_name: string }[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name <> '_prisma_migrations'
    ORDER BY table_name
  `;

  if (tables.length === 0) {
    return;
  }

  const tableList = tables
    .map(({ table_name: tableName }) => `public.${quoteIdentifier(tableName)}`)
    .join(', ');

  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
}

export async function resetTestDatabase() {
  await truncateTestDatabase();
}

export async function disconnectTestPrisma() {
  const { prisma } = await import('../../src/lib/prisma.js');

  await prisma.$disconnect();
}

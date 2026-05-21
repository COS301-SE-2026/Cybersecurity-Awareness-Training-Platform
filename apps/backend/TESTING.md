# Backend Testing

## Purpose

Database-backed Vitest and Supertest tests use a dedicated PostgreSQL test database. This keeps integration tests repeatable without manual cleanup and prevents test data from leaking between runs.

Unit tests remain separate from integration tests. Integration tests are the only tests wired to the database cleanup setup.

## Required Environment Variables

Normal backend development uses `DATABASE_URL` and should point to the development database:

```env
DATABASE_URL="postgresql://insightful_phish:insightful_phish@localhost:5432/insightful_phish_dev"
```

Integration tests use `TEST_DATABASE_URL` and copy it into `DATABASE_URL` during the integration test setup:

```env
TEST_DATABASE_URL="postgresql://insightful_phish:insightful_phish@localhost:5432/insightful_phish_test"
```

During integration tests, `NODE_ENV` is set to `test` by [tests/setup.integration.ts](tests/setup.integration.ts) before the Prisma test helper is imported.

Do not point `DATABASE_URL` at the test database for normal development. Keep `DATABASE_URL` for development and `TEST_DATABASE_URL` for integration tests.

## Safety Model

The cleanup helper in [tests/helpers/database.ts](tests/helpers/database.ts) refuses to run unless all safety checks pass:

- `NODE_ENV` must be `test`.
- `DATABASE_URL` must exist and be parseable.
- The active database name must contain `test`.
- Known development or system databases are rejected, including `insightful_phish_dev`, `postgres`, `template0`, and `template1`.
- Production-like hosts are rejected when detected.
- `_prisma_migrations` is excluded from cleanup.
- The cleanup strategy never targets `insightful_phish_dev`.

These guards are designed to make accidental cleanup of development data fail closed.

## Local Setup

Start local PostgreSQL:

```powershell
docker compose up -d
```

Create the local test database if it does not already exist:

```powershell
docker compose exec postgres createdb -U insightful_phish insightful_phish_test
```

If the database already exists, `createdb` may report that it exists. In that case, continue.

Apply migrations to the test database.

PowerShell:

```powershell
$env:TEST_DATABASE_URL="postgresql://insightful_phish:insightful_phish@localhost:5432/insightful_phish_test"
$env:DATABASE_URL=$env:TEST_DATABASE_URL
pnpm --filter @insightful-phish/backend prisma:generate
pnpm --filter @insightful-phish/backend exec prisma migrate deploy
```

Command Prompt:

```cmd
set "TEST_DATABASE_URL=postgresql://insightful_phish:insightful_phish@localhost:5432/insightful_phish_test"
set "DATABASE_URL=%TEST_DATABASE_URL%"
pnpm --filter @insightful-phish/backend prisma:generate
pnpm --filter @insightful-phish/backend exec prisma migrate deploy
```

Run unit tests:

```powershell
pnpm --filter @insightful-phish/backend test:unit
```

Run integration tests.

PowerShell:

```powershell
$env:TEST_DATABASE_URL="postgresql://insightful_phish:insightful_phish@localhost:5432/insightful_phish_test"
pnpm --filter @insightful-phish/backend test:integration
```

Command Prompt:

```cmd
set "TEST_DATABASE_URL=postgresql://insightful_phish:insightful_phish@localhost:5432/insightful_phish_test"
pnpm --filter @insightful-phish/backend test:integration
```

## Running Tests

Run backend unit tests only:

```powershell
pnpm --filter @insightful-phish/backend test:unit
```

Run backend integration tests only:

```powershell
pnpm --filter @insightful-phish/backend test:integration
```

Run the default backend test command:

```powershell
pnpm --filter @insightful-phish/backend test
```

The default backend `test` script currently runs unit tests only. Run `test:integration` explicitly when the local test database is available.

Integration test files run serially because they share one test database that is cleaned before each test.

## How Cleanup Works

Integration test setup is configured in [vitest.integration.config.ts](vitest.integration.config.ts) and [tests/setup.integration.ts](tests/setup.integration.ts).

Before each integration test, the setup calls `resetTestDatabase()`, which currently delegates to `truncateTestDatabase()`.

The truncate helper:

- Discovers application tables in the `public` schema
- Excludes `_prisma_migrations`
- Quotes table names safely
- Runs `TRUNCATE TABLE ... RESTART IDENTITY CASCADE`
- Uses `CASCADE` so related rows are cleaned without maintaining a fragile delete order

After all integration tests finish, `disconnectTestPrisma()` calls `prisma.$disconnect()`.

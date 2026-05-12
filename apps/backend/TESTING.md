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

During integration tests, `NODE_ENV` is set to `test` by `tests/setup.integration.ts` before the Prisma test helper is imported.

Do not point `DATABASE_URL` at the test database for normal development. Keep `DATABASE_URL` for development and `TEST_DATABASE_URL` for integration tests.

## Safety Model

The cleanup helper in `tests/helpers/database.ts` refuses to run unless all safety checks pass:

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

Integration test setup is configured in `vitest.integration.config.ts` and `tests/setup.integration.ts`.

Before each integration test, the setup calls `resetTestDatabase()`, which currently delegates to `truncateTestDatabase()`.

The truncate helper:

- discovers application tables in the `public` schema;
- excludes `_prisma_migrations`;
- quotes table names safely;
- runs `TRUNCATE TABLE ... RESTART IDENTITY CASCADE`;
- uses `CASCADE` so related rows are cleaned without maintaining a fragile delete order.

After all integration tests finish, `disconnectTestPrisma()` calls `prisma.$disconnect()`.

## CI Compatibility

CI database-backed integration tests need a PostgreSQL service.

The CI database should be named `insightful_phish_test` or another clearly test-only name containing `test`, because the cleanup guard rejects database names without `test`.

Before running integration tests, CI should:

- install dependencies;
- run `pnpm --filter @insightful-phish/backend prisma:generate`;
- set `DATABASE_URL` or `TEST_DATABASE_URL` to the CI test database;
- run `pnpm --filter @insightful-phish/backend exec prisma migrate deploy`;
- run `pnpm --filter @insightful-phish/backend test:integration`.

Full CI database provisioning is deferred and remains out of scope for this issue.

## Troubleshooting

### Safety Guard Rejects The Database

Check that `TEST_DATABASE_URL` points to a database whose name contains `test`, for example `insightful_phish_test`.

Also check that integration tests are setting `NODE_ENV=test`. The integration setup does this automatically, but direct helper usage still requires the same guard.

If the guard refuses to clean `insightful_phish_dev`, it is working correctly. Set `TEST_DATABASE_URL` with syntax that matches your terminal before running integration tests.

Command Prompt:

```cmd
set "TEST_DATABASE_URL=postgresql://insightful_phish:insightful_phish@localhost:5432/insightful_phish_test"
pnpm --filter @insightful-phish/backend test:integration
```

PowerShell:

```powershell
$env:TEST_DATABASE_URL="postgresql://insightful_phish:insightful_phish@localhost:5432/insightful_phish_test"
pnpm --filter @insightful-phish/backend test:integration
```

### Test Database Does Not Exist

Create it locally:

```powershell
docker compose exec postgres createdb -U insightful_phish insightful_phish_test
```

### Migrations Are Not Applied

Apply committed migrations to the test database:

PowerShell:

```powershell
$env:TEST_DATABASE_URL="postgresql://insightful_phish:insightful_phish@localhost:5432/insightful_phish_test"
$env:DATABASE_URL=$env:TEST_DATABASE_URL
pnpm --filter @insightful-phish/backend exec prisma migrate deploy
```

Command Prompt:

```cmd
set "TEST_DATABASE_URL=postgresql://insightful_phish:insightful_phish@localhost:5432/insightful_phish_test"
set "DATABASE_URL=%TEST_DATABASE_URL%"
pnpm --filter @insightful-phish/backend exec prisma migrate deploy
```

### Windows Prisma Generate EPERM

On Windows, `prisma:generate` may fail if a generated file is locked by another process. Close running dev servers, test watchers, or editors holding generated Prisma files, then rerun:

```powershell
pnpm --filter @insightful-phish/backend prisma:generate
```

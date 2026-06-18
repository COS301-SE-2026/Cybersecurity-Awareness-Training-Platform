# Backend Testing

## Purpose

Backend tests are split into unit tests and integration tests.

Unit tests do not require a real database. Integration tests use a dedicated PostgreSQL test database so database-backed behaviour can be tested without touching local development data.

## Test Data Strategy

Integration tests use a dedicated PostgreSQL test database named `insightful_phish_test`.

Integration tests should create the records they need through test setup and factories. They shouldn't depend on Demo 1 seed data. Integration tests need isolated records that can be reset between tests.

Unit tests may import demo seed constants or helpers only when testing seed config and summary behaviour. This doesn't mean that the integration test database should be preloaded with demo data.

## Required Environment Variables

For Docker local development, the backend test environment is provided by the `docker-compose.yml` file.

The Docker workspace service sets the required environment variables.

Integration tests copy the `TEST_DATABASE_URL` into the `DATABASE_URL` during setup so that Prisma connects to the dedicated test database.

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

## Local Docker Setup

Before running integration tests through Docker for the first time, install workspace dependencies into the Docker-managed volumes:

```bash
pnpm docker:tools:install
```

### Run backend unit tests

Backend unit tests do not require the integration test database.

From the repo root you can just run

```bash
pnpm docker:test:backend
```

### Run backend integration tests

Backend integration tests use the dedicated Docker test database: `insightful_phish_test`.

From the repo root run:

```bash
pnpm docker:test:integration:backend
```

This command:

1. Starts or reuses the local Postgres service
2. Creates the `insightful_phish_test` if it doesn't already exist
3. Applies committed Prisma migrations to the test database
4. Runs backend integration tests with `TEST_DATABASE_URL`.

The setup command is idempotent. It does not drop, reset, or truncate the database.

Table cleanup is handled by the integration test setup before each test.

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

# Insightful Phish: Local Setup Guide

This guide explains how to set up the Insightful Phish project locally, what each tool does, and which commands to run during development.

Insightful Phish is a `pnpm workspace` monorepo with:

- a shared package in `packages/shared`
- a backend package in `apps/backend`
- a frontend package in `apps/frontend`
- PostgreSQL running locally through Docker Compose
- Prisma 7 for database schema management
- Husky, lint-staged, and commitlint for local Git quality checks

Insightful Phish local development is Docker-first: Docker Compose runs the PostgreSQL database, the backend and the frontend. Root `pnpm docker:*` scripts provide short commands for docker setup, checks, logs, migration and seeding.

## 1. Required tools

Before starting, install these tools:

- Git
- Node.js
- pnpm
- Docker Desktop
- GitHub CLI, optional but recommended

`pnpm` is used to run the repo's command shortcuts. The app itself runs through Docker Compose.

### Check Git

```bash
git --version
```

Git is used for version control.

### Check Node.js

```bash
node --version
```

Node.js runs the frontend/backend tooling and JavaScript/TypeScript packages.

### Check pnpm

```bash
pnpm --version
```

pnpm is the package manager used by this repo. It installs dependencies and runs workspace scripts.

If pnpm is not installed, install it with Corepack:

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm --version
```

Or install it with Homebrew on macOS:

```bash
brew install pnpm
pnpm --version
```

### Check Docker

```bash
docker --version
docker compose version
docker info
```

Docker Compose runs the local app stack, including PostgreSQL, backend, and frontend, without requiring each developer to install those services directly.

If `docker info` fails, open Docker Desktop and wait until Docker is running.

### Check GitHub CLI, optional

```bash
gh auth status
```

The GitHub CLI is optional, but recommended. If installed and authenticated, the project’s local Git identity check can compare your GitHub CLI login with your local Git `user.name`.

## 2. Clone the repository

Clone the repository from GitHub:

```bash
git clone https://github.com/COS301-SE-2026/Cybersecurity-Awareness-Training-Platform.git InsightfulPhish
cd InsightfulPhish
```

The folder name does not affect the project as long as you are inside the repo root.

Check that you are in the repo root:

```bash
pwd
ls
```

You should see files/folders such as:

```txt
apps
packages
package.json
pnpm-workspace.yaml
docker-compose.yml
```

## 3. Configure local Git identity

Your local Git identity determines how your commits are attributed.

For this project, your local Git `user.name` should match your GitHub username.

Check your current values:

```bash
git config user.name
git config user.email
```

Also check your global defaults:

```bash
git config --global user.name
git config --global user.email
```

Set your Git username to your GitHub username:

```bash
git config --global user.name "your-github-username"
```

Set your Git email to an email linked to your GitHub account:

```bash
git config --global user.email "your-github-email@example.com"
```

For example:

```bash
git config --global user.name "FJNel"
git config --global user.email "u00000000@tuks.co.za"
```

Your email should be added and verified on GitHub under:

```txt
GitHub → Settings → Access → Emails
```

If you use GitHub private email protection, use your GitHub noreply email instead.

## 4. Start the local Docker app stack

The recommended local setup uses Docker Compose to run PostgreSQL, the backend and the frontend together.

From the repo root, create your local Compose environment file:

```bash
cp .env.example .env
```

Edit the created `.env` if needed. `POSTGRES_PASSWORD` is required. For Docker-first local setup, you do not need to create `apps/backend/.env` or `apps/frontend/.env`. The Docker Compose stack reads all the local values from the root `.env` file.

On Linux systems, set your `LOCAL_UID` and `LOCAL_GID` in the `.env` so files created by Docker workspace commands are owned by your host user. MacOD and Windows Docker Desktop users can usually leave these values alone.

You can set these using:

```bash
LOCAL_UID=$(id -u)
LOCAL_GID=$(id -g)
```

First, install workspace dependencies into Docker-managed volumes:

```bash
pnpm docker:tools:install
```

Start the full Docker app stack:

```bash
pnpm docker:up
```

Or run it in the background:

```bash
pnpm docker:up:detached
```

The local services are available at:

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend: [http://localhost:4000](http://localhost:4000)
- Postgres: `localhost:5432`
- Mailpit UI: [http://localhost:8025](http://localhost:8025)
- Mailpit SMTP from Docker services: `mailpit:1025`
- Mailpit SMTP from host machine: `localhost:1025`

### Inspect local emails with Mailpit

Emails are captured locally using Mailpit. After triggering something that sends an email, you can inspect the email in the Mailpit UI at [http://localhost:8025](http://localhost:8025).

To use the smoke-test script to see if the Mailpit service is running, you can run: `pnpm docker:mailpit:smoke`

### Check service status and logs

You can check the service status and logs using the commands below:

```bash
pnpm docker:ps
pnpm docker:logs:backend
pnpm docker:logs:frontend
pnpm docker:logs:postgres
```

To stop the stack while keeping the local database data, run:

```bash
pnpm docker:down
```

To stop the stack and delete the local database data, run:

```bash
pnpm docker:reset
```

> Note: `docker compose down -v` deletes the local PostgreSQL volume: Use it only when you intentionally want to wipe local database data.

## 5. Database Migrations and Demo 1 Seed Data

The local Docker stack uses Prisma 7 for database schema management.

Important Prisma files:

- [apps/backend/prisma.config.ts](apps/backend/prisma.config.ts)
- [apps/backend/prisma/schema.prisma](apps/backend/prisma/schema.prisma)
- [apps/backend/prisma/migrations/](apps/backend/prisma/migrations/)

For normal Docker startup, you do not need to run Prisma setup manually:

- The backend Docker image runs Prisma Client generation during image build
- The backend container runs migrations automatically before starting the API

> You only need to use manual Prisma commands when troubleshooting, resetting local data, or checking the tooling container.

### Manual Prisma Commands

Generate the Prisma Client manually:

```bash
pnpm docker:prisma:generate
```

Apply committed migrations manually:

```bash
pnpm docker:prisma:migrate
```

The generated Prisma Client is written to `apps/backend/src/generated/prisma`. This folder is ignored by Git and shouldn't be committed.

### Demo 1 Seed Data

The Demo 1 seed creates repeatable local users, campaign content, quizzes, training documents and simulated inbox data.

Make sure that the Docker stack is running:

```bash
pnpm docker:up:detached
```

Then run the seeding command:

```bash
pnpm docker:seed:demo1
```

The seed reads the `DEMO_SEED_PASSWORD` from the root `.env` file. The `DEMO_SEED_PASSWORD` is only required for:

```bash
pnpm docker:seed:demo1
```

This means that you can either set `DEMO_SEED_PASSWORD` in your `.env` file, or set it in the same terminal session before running the seed command:

```bash
export DEMO_SEED_PASSWORD="your-local-demo-password"
pnpm docker:seed:demo1
```

The Demo 1 seed creates these demo-only accounts:

```txt
demo.populated.trainee@example.com
demo.empty.trainee@example.com
demo.admin@example.com
```

Only run the Demo 1 seed against a local development database. For more detail, please see `apps/backend/SEEDING.md`.

### Prisma Studio

To inspect the local database with Prisma Studio you can use this command:

```bash
pnpm docker:prisma:studio
```

## 6. Running checks

Run checks through the Docker workspace service so everyone uses the same Node, pnpm and dependency environment.

Before running checks for the first time, install workspace dependencies into Docker-managed volumes:

```bash
pnpm docker:tools:install
```

Rerun this command whenever the pnpm lock file changes.

### Run the main local checks

Run TypeScript checks

```bash
pnpm docker:typecheck
```

Run linting:

```bash
pnpm docker:lint
```

Run tests:

```bash
pnpm docker:test
```

Check that all packages build:

```bash
pnpm docker:build
```

Check formatting:

```bash
pnpm docker:format:check
```

Fix formatting:

```bash
pnpm docker:format
```

### Run coverage

```bash
pnpm docker:test:coverage
```

This runs coverage for all workspace packages. The Coverage reports are generated in

```txt
apps/backend/coverage/
apps/frontend/coverage/
packages/shared/coverage
```

CI uploads coverage to Codecov as separate `backend`, `frontend`, and `shared` flags. Local coverage runs do not require a `CODECOV_TOKEN`: This token is only stored in the GitHub repository.

### Run package-specific checks

```bash
pnpm docker:typecheck:backend
pnpm docker:test:backend
pnpm docker:build:backend
```

> Similar package-specific commands exist for frontend and shared packages.

### Run backend integration tests

Backend integration tests use a dedicated local test database named `insightful_phish_test`.

Run them through Docker:

```bash
pnpm docker:test:integration:backend
```

This command creates the test database (if it is missing), applies committed migration to it, and runs the backend integration tests.

It does not drop or reset the test database. The integration test setup safely handles each table before each test.

### Run frontend e2e tests

Frontend browser smoke tests live in `apps/frontend/tests/e2e`.

The current e2e test suite are intentionally small and has not been updated to work with Docker yet.

- `/login` smoke coverage
- `/status` smoke coverage with mocked health data
- one axe accessibility check on `/login`

Before running the browser tests for the first time, install the Chromium browser used by Playwright:

```bash
pnpm --filter @insightful-phish/frontend test:e2e:install
```

From the repo root, run the frontend browser smoke tests with:

```bash
pnpm test:e2e:frontend
```

These checks are local-only. Docker setup will happen at a later stage.

# Insightful Phish: Local Setup Guide

This guide explains how to set up the Insightful Phish project locally, what each tool does, and which commands to run during development.

Insightful Phish is a `pnpm workspace` monorepo with:

- a shared package in `packages/shared`
- a backend package in `apps/backend`
- a frontend package in `apps/frontend`
- PostgreSQL running locally through Docker Compose
- Prisma 7 for database schema management
- Husky, lint-staged, and commitlint for local Git quality checks

The local setup path applies the current committed database migrations and can seed repeatable Demo 1 data using the modular campaign model. Demo 1 data is campaign-based: trainees access seeded campaign items for simulated inbox, training document, and quiz flows where the current app and APIs support them. The populated trainee has seeded phishing awareness and password security campaigns, while the empty-state trainee remains unassigned.

## 1. Required tools

Before starting, install these tools:

- Git
- Node.js
- pnpm
- Docker Desktop
- GitHub CLI, optional but recommended

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

Docker is used to run PostgreSQL locally without requiring each developer to install PostgreSQL directly on their machine.

If `docker info` fails, open Docker Desktop and wait until Docker is running.

### Check GitHub CLI, optional

```bash
gh auth status
```

The GitHub CLI is optional, but recommended. If installed and authenticated, the project’s local Git identity check can compare your GitHub CLI login with your local Git `user.name`.

## 2. Clone the repository

Clone the repository from GitHub:

```bash
git clone https://github.com/COS301-SE-2026/Cybersecurity-Awareness-Training-Platform.git
cd Cybersecurity-Awareness-Training-Platform
```

If your local folder has been renamed to `Insightful Phish`, that is fine. The folder name does not affect the project as long as you are inside the repo root.

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

## 4. Install dependencies

From the repo root, run:

```bash
pnpm install
```

This installs dependencies for all workspace packages.

The repo uses pnpm workspaces, defined in `pnpm-workspace.yaml`:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

This means pnpm treats these folders as separate workspace packages:

```txt
apps/backend
apps/frontend
packages/shared
```

The root [package.json](package.json) contains shared scripts such as:

```bash
pnpm typecheck
pnpm test
pnpm build
```

These run across all workspace packages.

### Quick fresh checkout path

Use this compact path when starting from a clean checkout for local Demo 1 rehearsal.

From the repo root:

```bash
pnpm install
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
docker compose up -d
pnpm --filter @insightful-phish/backend prisma:generate
pnpm --filter @insightful-phish/backend prisma:migrate:deploy
DEMO_SEED_PASSWORD="your-local-demo-password" pnpm --filter @insightful-phish/backend seed:demo1
```

Then start the backend:

```bash
pnpm --filter @insightful-phish/backend dev
```

In another terminal, start the frontend:

```bash
pnpm --filter @insightful-phish/frontend dev
```

For Windows PowerShell and Command Prompt examples for `DEMO_SEED_PASSWORD`, see [apps/backend/SEEDING.md](apps/backend/SEEDING.md).

## 5. Local Git checks with Husky

The project uses Husky to run local checks before commits.

Husky hooks are in:

```txt
.husky/pre-commit
.husky/commit-msg
```

### Pre-commit hook

Before a commit is created, Husky runs:

```bash
./scripts/check-git-identity.sh
./scripts/check-staged-file-policy.sh
pnpm exec lint-staged
```

This does three things:

1. checks that your local Git identity is set correctly;
2. prevents mixing Markdown documentation files with code/config changes in one commit;
3. runs Prettier on staged files through lint-staged.

### Commit message hook

Before Git accepts your commit message, Husky runs:

```bash
./scripts/check-commit-message.sh "$1"
pnpm exec commitlint --edit "$1"
```

This checks that commit messages follow the required format:

```txt
<type>: <description>
```

Allowed types:

```txt
feat
fix
docs
chore
```

Examples:

```txt
feat: add user authentication
fix: correct database health check
docs: update setup instructions
chore: add backend health check
```

Scopes are not allowed. For example, this is not allowed:

```txt
feat(auth): add login
```

`Co-authored-by:` trailers are also not allowed.

## 6. Documentation and code commit policy

To help with contribution tracking, unrelated documentation and code/config changes should usually be committed separately. Related documentation may stay with the code or configuration change it explains.

Rules:

- Documentation-only commits should use the `docs` type.
- If a commit includes development work, use `feat`, `fix`, or `chore` rather than `docs`.
- `docs` commits should only include documentation and documentation assets.
- `docs` commits must not include obvious source, config, tooling, or workflow files from `apps/`, `packages/`, `scripts/`, or `.github/workflows/`.
- `feat`, `fix`, and `chore` commits may include related Markdown, screenshots, images, static assets, or setup notes.
- `docs/demo1/` is frozen after the Demo 1 baseline. New or changed Demo 2 documentation belongs under `docs/demo2/`.

Examples:

```txt
docs: update setup instructions
chore: add ci workflow
feat: add campaign creation endpoint
fix: correct database connection check
```

If your commit is blocked because a `docs:` message includes development files, change the commit type to `feat:`, `fix:`, or `chore:` as appropriate.

Hyperperform may ignore documentation/configuration-only commits. Do not hide development work behind a `docs:` commit.

## 7. Start PostgreSQL with Docker

The backend uses PostgreSQL. For local development, PostgreSQL runs in Docker.

Start PostgreSQL:

```bash
docker compose up -d
```

The `-d` flag means detached mode, so the database keeps running in the background.

Check the container status:

```bash
docker compose ps
```

You should see a running container named:

```txt
insightful-phish-postgres
```

### PostgreSQL connection details

The database is configured in `docker-compose.yml`:

```txt
Host: localhost
Port: 5432
User: insightful_phish
Password: insightful_phish
Database: insightful_phish_dev
```

The backend connects with this URL:

```env
DATABASE_URL="postgresql://insightful_phish:insightful_phish@localhost:5432/insightful_phish_dev"
```

### Useful Docker commands

Stop containers but keep database data:

```bash
docker compose down
```

Start again:

```bash
docker compose up -d
```

View PostgreSQL logs:

```bash
docker compose logs postgres
```

Restart PostgreSQL:

```bash
docker compose restart postgres
```

Delete the local database completely:

```bash
docker compose down -v
```

Only use `-v` if you intentionally want to delete the local database volume.

### Local-only destructive reset for Demo 1 rehearsal data

Use this only for your own local development database. It deletes the local Docker database volume and recreates the schema/data from committed migrations and the Demo 1 seed.

Do not use this sequence against production, staging, or shared data.

```bash
docker compose down -v
docker compose up -d
pnpm --filter @insightful-phish/backend prisma:generate
pnpm --filter @insightful-phish/backend prisma:migrate:deploy
DEMO_SEED_PASSWORD="your-local-demo-password" pnpm --filter @insightful-phish/backend seed:demo1
```

See [apps/backend/SEEDING.md](apps/backend/SEEDING.md) for seed safety notes, idempotency details, and Windows-specific environment variable examples.

## 8. Create backend environment file

The backend uses environment variables from:

```txt
apps/backend/.env
```

This file is not committed. It is ignored by Git.

Create it from the example file:

```bash
cp apps/backend/.env.example apps/backend/.env
```

The example file contains:

```env
NODE_ENV=development
PORT=4000

DATABASE_URL="postgresql://insightful_phish:insightful_phish@localhost:5432/insightful_phish_dev"

FRONTEND_ORIGIN="http://localhost:5173"
```

### What these values mean

`PORT=4000` means the backend runs at:

```txt
http://localhost:4000
```

`DATABASE_URL` tells Prisma how to connect to PostgreSQL.

`FRONTEND_ORIGIN` allows the local frontend at `http://localhost:5173` to call the backend.

## 9. Prisma setup

The project uses Prisma 7.

Important Prisma files:

- [apps/backend/prisma.config.ts](apps/backend/prisma.config.ts)
- [apps/backend/prisma/schema.prisma](apps/backend/prisma/schema.prisma)
- [apps/backend/prisma/migrations/](apps/backend/prisma/migrations/)

### Prisma config

[apps/backend/prisma.config.ts](apps/backend/prisma.config.ts) tells Prisma where the schema is, where migrations are stored, and which database URL to use.

In Prisma 7, the database URL is configured in [apps/backend/prisma.config.ts](apps/backend/prisma.config.ts), not directly in [apps/backend/prisma/schema.prisma](apps/backend/prisma/schema.prisma).

### Prisma schema

[apps/backend/prisma/schema.prisma](apps/backend/prisma/schema.prisma) defines the current backend database schema. The committed migrations include the Demo 1 modular campaign model, including campaign assignments, campaign items, reusable training documents, quizzes, simulations, simulated inboxes, simulated emails, and related interaction/result records.

### Generate Prisma Client

Run:

```bash
pnpm --filter @insightful-phish/backend prisma:generate
```

This generates the Prisma Client under:

```txt
apps/backend/src/generated/prisma
```

That generated folder is ignored by Git and should not be committed.

### Run migrations

For normal local setup from a clean checkout, apply the committed migrations:

```bash
pnpm --filter @insightful-phish/backend prisma:migrate:deploy
```

This applies the version-controlled migration history under [apps/backend/prisma/migrations/](apps/backend/prisma/migrations/) to your local database.

Use `pnpm --filter @insightful-phish/backend prisma:migrate --name <migration-name>` only when you are intentionally changing the Prisma schema and creating a new development migration. Do not use it as the normal clean-checkout setup command.

Prisma migration files under [apps/backend/prisma/migrations/](apps/backend/prisma/migrations/) should be committed. They are the version-controlled database schema history.

Do not commit:

```txt
apps/backend/.env
apps/backend/src/generated/prisma
```

### Demo 1 seed data

For repeatable local Demo 1 users, campaign content, quizzes, and simulated inbox data, use the backend seed guide: [apps/backend/SEEDING.md](apps/backend/SEEDING.md).

The short version:

```bash
docker compose up -d
pnpm --filter @insightful-phish/backend prisma:generate
pnpm --filter @insightful-phish/backend prisma:migrate:deploy
```

Set `DEMO_SEED_PASSWORD` before running `pnpm --filter @insightful-phish/backend seed:demo1`. See [apps/backend/SEEDING.md](apps/backend/SEEDING.md) for PowerShell and Command Prompt examples.

The Demo 1 seed creates demo-only accounts:

```txt
demo.populated.trainee@example.com
demo.empty.trainee@example.com
demo.admin@example.com
```

All three use the password supplied through `DEMO_SEED_PASSWORD`.

The populated trainee is assigned to two active seeded campaigns:

- phishing awareness
- password security

The password security campaign is a simple sequence with an available training document followed by a statically locked quiz. Training completion records interaction data but does not unlock the quiz, because dynamic unlock logic is out of scope for this seed.

Only run the Demo 1 seed against a local development database.

## 10. Run the backend

Start PostgreSQL first:

```bash
docker compose up -d
```

Start the backend:

```bash
pnpm --filter @insightful-phish/backend dev
```

The backend should print:

```txt
Insightful Phish backend running on http://localhost:4000
```

In another terminal, test the health endpoint:

```bash
curl http://localhost:4000/health
```

Expected result:

```json
{
  "app": "Insightful Phish",
  "api": "working",
  "database": "connected",
  "timestamp": "..."
}
```

If the database is not running, the endpoint may return:

```json
{
  "app": "Insightful Phish",
  "api": "working",
  "database": "not connected",
  "timestamp": "..."
}
```

In that case, start PostgreSQL with:

```bash
docker compose up -d
```

## 11. Run the frontend

Create the frontend environment file:

```bash
cp apps/frontend/.env.example apps/frontend/.env
```

Start the frontend:

```bash
pnpm --filter @insightful-phish/frontend dev
```

The frontend should run at:

```txt
http://localhost:5173
```

Open that URL in your browser.

Verify the app loads and points at the local backend URL from [apps/frontend/.env](apps/frontend/.env).

Where the current frontend supports it, log in with the seeded Demo 1 trainee credentials from [apps/backend/SEEDING.md](apps/backend/SEEDING.md) and verify the populated trainee can reach seeded campaign-based content.

The backend health endpoint remains available at:

```txt
http://localhost:4000/health
```

The backend checks PostgreSQL through Prisma and returns the database status.

## 12. Demo 1 local readiness checklist

Before a local Demo 1 rehearsal, verify:

- PostgreSQL is running with `docker compose ps`.
- Committed migrations have been applied with `pnpm --filter @insightful-phish/backend prisma:migrate:deploy`.
- The Demo 1 seed ran successfully with `DEMO_SEED_PASSWORD` set.
- The backend responds at `http://localhost:4000/health`.
- The frontend starts at `http://localhost:5173`.
- `demo.populated.trainee@example.com` can log in with the local `DEMO_SEED_PASSWORD`.
- The populated trainee can see both seeded campaigns where campaign discovery is supported.
- `demo.empty.trainee@example.com` can log in and show the intended empty state where the current frontend supports it.
- Seeded campaign-based content is reachable through the current app or APIs where implemented.
- If UI/API verification is not wired yet, use Prisma Studio to inspect `Campaign`, `CampaignItem`, `CampaignAssignment`, `Simulation`, and `SimulatedInbox`.
- Current setup docs do not require `LearningPath`, `TrainingModule`, `TrainingProgress`, or user-owned inbox assumptions.

## 13. Running checks

Run all workspace checks from the repo root.

### Typecheck everything

```bash
pnpm typecheck
```

This checks TypeScript across the workspace.

### Test everything

```bash
pnpm test
```

This runs tests in all workspace packages.

### Run test coverage

```bash
pnpm test:coverage
```

This runs tests and generates coverage reports for all workspace packages. Reports are generated in `apps/backend/coverage/`, `apps/frontend/coverage/`, and `packages/shared/coverage/`.

CI uploads coverage to Codecov as separate `backend`, `frontend`, and `shared` flags. CI also writes Vitest JUnit reports for Codecov Test Analytics:

- `apps/backend/test-results.junit.xml`
- `apps/frontend/test-results.junit.xml`
- `packages/shared/test-results.junit.xml`

The frontend Vite build includes Codecov bundle analysis for the `insightful-phish-frontend` bundle only when `CODECOV_TOKEN` is present. Local builds still work without this environment variable.

The GitHub repository must define `CODECOV_TOKEN` as an Actions secret. Never commit real Codecov tokens, `.env` files, or local secret files.

### Build everything

```bash
pnpm build
```

This checks that all packages can build successfully.

### Run backend-only checks

```bash
pnpm --filter @insightful-phish/backend typecheck
pnpm --filter @insightful-phish/backend test
pnpm --filter @insightful-phish/backend build
```

For backend integration tests that use the dedicated test database, see [apps/backend/TESTING.md](apps/backend/TESTING.md).

### Run frontend-only checks

```bash
pnpm --filter @insightful-phish/frontend typecheck
pnpm --filter @insightful-phish/frontend test
pnpm --filter @insightful-phish/frontend build
```

## 14. GitHub Actions CI

The project has a CI workflow in:

```txt
.github/workflows/ci.yml
```

The workflow runs only on pull requests targeting `main`, and can also be started manually from GitHub.

It runs:

```bash
pnpm install --frozen-lockfile
pnpm --filter @insightful-phish/backend prisma:generate
pnpm --filter @insightful-phish/backend prisma:migrate:deploy
pnpm typecheck
pnpm test
pnpm build
```

### What this means

`pnpm install --frozen-lockfile` installs dependencies exactly as recorded in `pnpm-lock.yaml`.

`prisma:generate` regenerates the ignored Prisma Client in CI.

`prisma migrate deploy` applies committed migrations to the temporary CI database.

`pnpm typecheck` checks TypeScript.

`pnpm test` runs tests.

`pnpm build` ensures the repo builds successfully.

The CI workflow starts a temporary PostgreSQL service during the run. That database is deleted after the CI job finishes.

## 15. Common issues

### `DATABASE_URL` is missing

If Prisma says `Missing required environment variable: DATABASE_URL`, create the backend `.env` file:

```bash
cp apps/backend/.env.example apps/backend/.env
```

Then rerun the Prisma command.

### PostgreSQL is not connected

Check whether Docker is running:

```bash
docker compose ps
```

Start PostgreSQL:

```bash
docker compose up -d
```

Check logs:

```bash
docker compose logs postgres
```

### Prisma generated files appear in Git

Generated Prisma Client files should not be committed.

Check:

```bash
git status --short
```

If `apps/backend/src/generated/prisma` appears, make sure `.gitignore` includes:

```gitignore
apps/backend/src/generated/prisma
```

### Commit blocked because a docs commit includes development files

Use the correct development commit type.

Example:

```txt
docs: update setup instructions
chore: update backend tooling
```

Markdown may be committed with code/config changes when it supports the same work. However, a `docs:` commit must not include source, config, tooling, or workflow files. Use `feat:`, `fix:`, or `chore:` when development files are included.

### Commit message rejected

Use this format:

```txt
<type>: <description>
```

Allowed:

```txt
feat: add user authentication
fix: correct database health check
docs: update setup instructions
chore: add backend health check
```

Not allowed:

```txt
feat(auth): add login
update stuff
final changes
```

## 16. Normal development workflow

A typical local development session looks like this:

```bash
git pull
pnpm install
docker compose up -d
pnpm --filter @insightful-phish/backend prisma:generate
pnpm --filter @insightful-phish/backend prisma:migrate:deploy
pnpm --filter @insightful-phish/backend dev
```

In a second terminal:

```bash
pnpm --filter @insightful-phish/frontend dev
```

Before committing:

```bash
pnpm typecheck
pnpm test
pnpm build
git status
```

Then stage and commit logically separated changes.

## 17. Current local setup status

At this stage, the project should support:

- pnpm workspace installation
- PostgreSQL through Docker Compose
- Prisma 7 schema, config, generation, and committed migrations
- local Demo 1 seeding for modular campaign-based trainee data
- backend `/health` endpoint
- backend and frontend local development servers
- basic backend/frontend tests
- Husky local checks
- GitHub Actions CI for pull requests into `main`

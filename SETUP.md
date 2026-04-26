# Insightful Phish: Local Setup Guide

This guide explains how to set up the Insightful Phish project locally, what each tool does, and which commands to run during development.

Insightful Phish is a `pnpm workspace` monorepo with:

- a shared package in `packages/shared`
- a backend package in `apps/backend`
- a frontend package in `apps/frontend`
- PostgreSQL running locally through Docker Compose
- Prisma 7 for database schema management
- Husky, lint-staged, and commitlint for local Git quality checks

At this stage, the project foundation is intentionally minimal. The backend exposes a `/health` endpoint, and the frontend displays whether the API and database are connected.

---

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

---

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

---

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

---

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

The root `package.json` contains shared scripts such as:

```bash
pnpm typecheck
pnpm test
pnpm build
```

These run across all workspace packages.

---

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

---

## 6. Documentation and code commit policy

To help with contribution tracking, documentation and code/config changes should be committed separately.

Rules:

- If a commit includes Markdown files (`.md`), the commit type must be `docs`.
- If a commit includes Markdown files, it should not include code or configuration changes.
- Code/config commits should not include Markdown documentation changes.

Examples:

```txt
docs: update setup instructions
chore: add ci workflow
feat: add campaign creation endpoint
fix: correct database connection check
```

If your commit is blocked because you staged docs and code together, split the changes into two commits.

**Important:** Sync/Push to origin directly after committing: Do not create two commits locally (one for code and one for docs) and then push both together, as Hyperperform will track this as one commit with both code and docs changes. Instead, commit and push the first commit, then commit and push the second commit.

---

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
DATABASE_URL="postgresql://insightful_phish:insightful_phish@localhost:5432/insightful_phish_dev?schema=public"
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

---

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

DATABASE_URL="postgresql://insightful_phish:insightful_phish@localhost:5432/insightful_phish_dev?schema=public"

FRONTEND_ORIGIN="http://localhost:5173"
```

### What these values mean

`PORT=4000` means the backend runs at:

```txt
http://localhost:4000
```

`DATABASE_URL` tells Prisma how to connect to PostgreSQL.

`FRONTEND_ORIGIN` allows the local frontend at `http://localhost:5173` to call the backend.

---

## 9. Prisma setup

The project uses Prisma 7.

Important Prisma files:

```txt
apps/backend/prisma.config.ts
apps/backend/prisma/schema.prisma
apps/backend/prisma/migrations/
```

### Prisma config

`prisma.config.ts` tells Prisma where the schema is, where migrations are stored, and which database URL to use.

In Prisma 7, the database URL is configured in `prisma.config.ts`, not directly in `schema.prisma`.

### Prisma schema

`schema.prisma` defines the database schema.

At this stage, it only contains a minimal placeholder model:

```prisma
model HealthCheck {
  id        String   @id @default(uuid())
  message   String
  createdAt DateTime @default(now())
}
```

This exists only to prove that Prisma migrations work. It is not a real feature model.

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

Run:

```bash
pnpm --filter @insightful-phish/backend prisma:migrate --name init
```

This creates and applies a migration locally.

Prisma migration files under `apps/backend/prisma/migrations/` should be committed. They are the version-controlled database schema history.

Do not commit:

```txt
apps/backend/.env
apps/backend/src/generated/prisma
```

---

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

---

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

Expected page:

```txt
Hello from Insightful Phish!

The API is working.
The database is connected.
```

### How the frontend checks this

The frontend calls:

```txt
http://localhost:4000/health
```

The backend checks PostgreSQL through Prisma and returns the status. The frontend then displays that status.

---

## 12. Running checks

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

### Run frontend-only checks

```bash
pnpm --filter @insightful-phish/frontend typecheck
pnpm --filter @insightful-phish/frontend test
pnpm --filter @insightful-phish/frontend build
```

---

## 13. GitHub Actions CI

The project has a CI workflow in:

```txt
.github/workflows/ci.yml
```

The workflow runs only on pull requests targeting `main`, and can also be started manually from GitHub.

It runs:

```bash
pnpm install --frozen-lockfile
pnpm --filter @insightful-phish/backend prisma:generate
pnpm --filter @insightful-phish/backend prisma migrate deploy
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

---

## 14. Common issues

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

### Commit blocked because docs and code are mixed

Split the commit.

Example:

```txt
docs: update setup instructions
chore: update backend tooling
```

Do not commit `.md` files together with code/config files. Remember to push the first commit before creating the second commit, to ensure Hyperperform tracks them as separate commits.

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

---

## 15. Normal development workflow

A typical local development session looks like this:

```bash
git pull
pnpm install
docker compose up -d
pnpm --filter @insightful-phish/backend prisma:generate
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

---

## 16. Current project foundation status

At this stage, the project should support:

- pnpm workspace installation
- PostgreSQL through Docker Compose
- Prisma 7 schema, config, generation, and migrations
- backend `/health` endpoint
- frontend health status page
- basic backend/frontend tests
- Husky local checks
- GitHub Actions CI for pull requests into `main`

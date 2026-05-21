# Backend Seeding

This guide explains how to create the local Demo 1 seed data for backend and frontend development.

## Purpose

The Demo 1 seed creates repeatable local data for:

- Login testing
- Populated trainee flows
- Empty-state trainee flows
- Inbox and email detail views
- Training material views
- Quiz and result paths
- Password-security campaign views
- Classification feedback and red flag feedback

The seed is designed for local Demo 1 development only.

## Demo-Only Credentials

These credentials are for local Demo 1 development only and must not be used in production.

Set the local demo password with `DEMO_SEED_PASSWORD` before running the seed. The same value is used for all Demo 1 users created by the seed.

| User                | Email                                | Password source      |
| ------------------- | ------------------------------------ | -------------------- |
| Populated trainee   | `demo.populated.trainee@example.com` | `DEMO_SEED_PASSWORD` |
| Empty-state trainee | `demo.empty.trainee@example.com`     | `DEMO_SEED_PASSWORD` |
| Demo admin          | `demo.admin@example.com`             | `DEMO_SEED_PASSWORD` |

The seed script hashes the password before storing it. It does not print password hashes.

Do not commit `DEMO_SEED_PASSWORD` in `.env`. Prefer setting it only in the current shell when running the seed.

## Seeded Data

The Demo 1 seed creates:

- A populated trainee user and profile
- An empty-state trainee user and profile
- A demo admin user and admin profile
- Two Demo 1 campaigns assigned to the populated trainee:
  - Phishing awareness campaign
  - Password security campaign
- No campaign assignment for the empty-state trainee
- Ordered campaign items for training, quiz, and simulated inbox components
- Reusable training documents
- Reusable quizzes
- Quiz questions
- Answer options with answer-level feedback
- One reusable simulation
- One simulated inbox linked to the simulation
- A mix of phishing, suspicious, and safe simulated emails
- Expected email classifications
- Red flags for phishing and suspicious emails

## Seeded Campaigns

The populated trainee is assigned to two active Demo 1 campaigns.

### Phishing Awareness Campaign

The phishing awareness campaign demonstrates the broader Demo 1 flow for training, quiz, and simulated inbox content.

### Password Security Campaign

The password security campaign demonstrates a simple sequential path:

1. password-security training document
2. password-security quiz

The password-security training item is seeded as `AVAILABLE`, so it is openable immediately.

The password-security quiz item is seeded as `LOCKED`. This locked state is static seed behaviour. There is no dynamic unlock engine in this issue, and completing the password-security training document does not unlock later campaign items. This is intended for Demo 1.

Training completion records an `InteractionEvent`, but the current Demo 1 seed does not include prerequisite or sequential unlock logic.

The empty-state trainee remains unassigned and should not receive either seeded campaign.

## Password Training Content Metadata

The password-security training document uses the current backend metadata fields:

- `contentType`
- `contentRef`
- `contentSummary`
- `estimatedReadTimeMinutes`
- `difficultyLevel`
- `status`

Runtime markdown body loading is out of scope for this seed. The seed uses metadata and content references only.

## Commands

Run commands from the repository root.

### 1. Start the local database

```bash
docker compose up -d
```

Check that PostgreSQL is running:

```bash
docker compose ps
```

### 2. Run migrations if needed

If the local database is new or behind the current schema, apply committed migrations:

```bash
pnpm --filter @insightful-phish/backend prisma:migrate:deploy
```

Do not use `prisma migrate reset` for normal Demo 1 seeding.

### 3. Run the Demo 1 seed

Set `DEMO_SEED_PASSWORD` in the same terminal session before running the seed.

Windows PowerShell:

```powershell
$env:DEMO_SEED_PASSWORD = "your-local-demo-password"
pnpm --filter @insightful-phish/backend seed:demo1
```

Windows Command Prompt:

```bat
set "DEMO_SEED_PASSWORD=your-local-demo-password"
pnpm --filter @insightful-phish/backend seed:demo1
```

Other shells:

```bash
DEMO_SEED_PASSWORD="your-local-demo-password" \
pnpm --filter @insightful-phish/backend seed:demo1
```

The command prints a summary of the demo users and seeded content. It reports that `DEMO_SEED_PASSWORD` was used as the password source, but it does not print password hashes.

### 4. Rerun the Demo 1 seed

Run the same command again:

```powershell
$env:DEMO_SEED_PASSWORD = "your-local-demo-password"
pnpm --filter @insightful-phish/backend seed:demo1
```

The seed uses stable demo identifiers and known demo emails. It deletes and recreates only demo-owned records, so repeated runs should leave one consistent Demo 1 dataset without duplicate users, campaign items, quizzes, emails, or red flags.

## Empty-State Trainee Behavior

The empty-state trainee can log in with the demo-only credentials above.

The empty-state trainee intentionally has no campaign assignment and no assigned campaign items. This supports frontend empty-state testing without changing the populated trainee demo flow.

## Safety

The Demo 1 seed is for local and demo development only.

Do not run it against production data. Before seeding, confirm `DATABASE_URL` points to the local development database, for example:

```env
DATABASE_URL="postgresql://insightful_phish:insightful_phish@localhost:5432/insightful_phish_dev"
```

The seed script does not truncate tables, drop the database, or wipe all users. It targets stable demo identifiers and known demo emails so unrelated data is left alone.

## Viewing Seeded Data

Use Prisma Studio to browse the local database in a web UI:

```bash
pnpm --filter @insightful-phish/backend prisma:studio
```

If the browser does not open automatically, use the local URL printed by the command.

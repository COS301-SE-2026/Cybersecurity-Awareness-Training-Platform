# Coding Standards

This document records the coding standards used for Demo 2 work on Insightful Phish. It is based on the current pnpm workspace, TypeScript, ESLint, Prettier, testing scripts, Git hooks, and pull request template in the repository.

## Contents

- [Purpose](#purpose)
- [Repository Organisation](#repository-organisation)
- [General TypeScript and Formatting Standards](#general-typescript-and-formatting-standards)
- [Naming](#naming)
- [Frontend Standards](#frontend-standards)
- [Backend Standards](#backend-standards)
- [Shared Contracts and Validation](#shared-contracts-and-validation)
- [Database and Migrations](#database-and-migrations)
- [Testing Expectations](#testing-expectations)
- [Generated Artefacts](#generated-artefacts)
- [Security-Sensitive Code](#security-sensitive-code)
- [Git and Pull Requests](#git-and-pull-requests)
- [Commands and Enforcement](#commands-and-enforcement)
- [References](#references)

## Purpose

The goal of these standards is to keep Demo 2 code consistent, reviewable, and safe to change. It describes what is enforced by the repository configuration and what the team should follow when the tools do not enforce it directly.

These standards are not a replacement for testing or design review. Formatting, linting, and type checking help catch a variety of mistakes early, while tests and manual review still need to check behaviour, security, accessibility, and requirements fit.

## Repository Organisation

Insightful Phish is a pnpm workspace. The root [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml) includes:

| Workspace area    | Purpose                                                                             |
| ----------------- | ----------------------------------------------------------------------------------- |
| `apps/frontend`   | React and Vite frontend application.                                                |
| `apps/backend`    | Express, Prisma, API, mail, audit, and service-layer backend.                       |
| `packages/shared` | Shared TypeScript contracts and Zod validation schemas used across the application. |

The root [`package.json`](../../package.json) provides workspace-wide scripts that run the relevant package scripts through pnpm filters.

Documentation for Demo 2 lives under `docs/demo2`. The coding standards and testing policy sit alongside the SRS, SAS, API, traceability, Lighthouse, user interface, and user manual documentation.

## General TypeScript and Formatting Standards

TypeScript is the default language for application code in the backend, frontend, and shared package. New code should use domain types, Zod-backed validation at boundaries, and narrow function signatures.

The repository enforces formatting through Prettier. The root [`.prettierrc`](../../.prettierrc) currently sets:

| Setting         | Value               |
| --------------- | ------------------- |
| Tabs            | Spaces, not tabs    |
| Indentation     | 2 spaces            |
| Quotes          | Single quotes       |
| Semicolons      | Required            |
| Trailing commas | Enabled where valid |
| Print width     | 100 characters      |

ESLint is configured separately for the workspace packages. The shared root ESLint base enables the recommended JavaScript and TypeScript rules, prefers consistent type imports, warns on explicit `any`, and treats unused variables as errors unless they use the underscore ignore pattern. Backend and shared package configs reuse that base. The frontend config uses the recommended JavaScript and TypeScript rules together with React Hooks and React Refresh rules.

Formatting and linting in Insightful Phish are quality checks, not tests. A file can be formatted and lint-clean while still having obvious incorrect behaviour, so feature work still needs appropriate testing.

## Naming

Names should match the surrounding package and domain language. Use `organisation`, `behaviour`, `authorised`, `unauthorised`, `enrolment`, `licence`, and `artefacts` in documentation and user-facing project language unless a dependency, API field, or existing code identifier uses another spelling.

Code identifiers should favour clear domain meaning over abbreviations. File and folder names should follow the convention already used in the package being changed, because backend services, frontend components, and shared schemas do not all use the same filename shape.

The current codebase uses these broad naming conventions:

| Area                 | Convention                                                                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| React components     | Use PascalCase component names and keep component files near the feature or UI area they support.                                       |
| Hooks                | Use the `use...` prefix and keep reusable hooks under `apps/frontend/src/hooks` or close to the feature when they are feature-specific. |
| Backend routes       | Use `*.routes.ts` files for Express route registration.                                                                                 |
| Backend controllers  | Use controller functions for HTTP-facing request and response handling.                                                                 |
| Backend services     | Use `*.service.ts` files for use-case orchestration and business rules.                                                                 |
| Backend repositories | Use `*.repository.ts` files for persistence operations and transaction-aware database access.                                           |
| Shared schemas       | Use descriptive schema and DTO names that match the request, response, or domain concept being validated.                               |

Names should be stable enough for tests, documentation, Swagger/OpenAPI references, and audit records to stay understandable. Avoid vague names such as `data`, `payload`, or `item` when a stronger domain name is available.

## Frontend Standards

Frontend code should follow the current React, Vite, TypeScript, shared-validation, accessibility, and styling conventions already used in `apps/frontend`.

Frontend changes should keep user-visible behaviour accessible, predictable, and testable. Components should use typed props, avoid duplicating shared validation rules, and prefer behaviour-focused tests over assertions tied to fragile styling details.

The frontend source is organised around `components`, `pages`, `routes`, `services`, `hooks`, `context`, `constants`, `lib`, and `testing`. New code should fit that structure before adding another top-level folder.

Frontend standards:

- Keep page components focused on screen composition and flow.
- Put reusable UI in component folders where the existing feature or shared UI structure already expects it.
- Keep API calls in service or client helpers instead of spreading raw `fetch` calls through components.
- Use shared schemas from `packages/shared` when the frontend and backend need the same validation contract.
- Sanitise rendered HTML where the existing code path handles rich content. The project already uses DOMPurify for this kind of boundary.
- Write accessible controls with useful labels, keyboard interaction, visible focus, and understandable validation feedback.
- Prefer assertions about user-visible behaviour in tests. Avoid tests that only prove a particular utility-class string is present unless the styling contract itself is the behaviour under review.
- Keep design consistency with the Demo 2 UI and brand documentation without treating coding standards as a separate design-system specification.

## Backend Standards

Backend code should follow the current Express route, controller, service, repository, validation, audit, mail, logging, and Prisma boundaries already used in `apps/backend`.

Backend changes should keep request handling, business workflow, persistence, and infrastructure concerns separated. Controllers should stay thin, services should own use-case behaviour, repositories should isolate data access, and sensitive workflows should use the central audit and email boundaries where those already exist.

The backend source is organised into `routes`, `controllers`, `services`, `repositories`, `middleware`, `mappers`, `config`, `errors`, `lib`, `types`, `constants`, `content`, and generated Prisma client output. New backend work should respect those boundaries.

Backend standards:

- Routes should register middleware, rate limits where required, request validation, and controller handlers. They should not contain business workflows.
- Controllers should translate HTTP requests into service inputs and translate service outcomes into HTTP responses.
- Services should own use-case decisions, transaction boundaries, policy checks, audit recording, email hooks, token handling, and error mapping where those behaviours belong to the application workflow.
- Repositories should isolate Prisma queries and accept a transaction client when the service needs multiple writes to succeed or fail together.
- Validation should use existing shared or backend Zod schemas rather than ad hoc request parsing.
- Error responses should use the existing error handling style and avoid exposing raw provider, Prisma, SMTP, authentication, or token details.
- Authentication, authorisation, organisation scope, state transitions, and rate limiting should be checked deliberately on protected or sensitive routes.
- Audit metadata should stay compact and safe. It should not contain names, email addresses, raw tokens, token hashes, permission sets, full request bodies, raw database errors, or raw provider errors unless a documented safe exception exists.
- Email delivery should go through the central backend email or mail service. Feature code should not call SMTP directly.

## Shared Contracts and Validation

Shared contracts should live in `packages/shared` when both frontend and backend need the same validation or request/response shape. Zod schemas should be treated as executable contracts at trust boundaries rather than as comments beside unvalidated objects.

Shared schemas should be small enough to understand, exported deliberately, and tested where they encode meaningful behaviour. Backend-only or frontend-only validation should stay in the owning package unless another package genuinely needs it.

The shared package currently keeps validation files and schema tests under `packages/shared/src/validation`. Shared contracts should:

- Describe request, response, parameter, and domain validation shapes that are genuinely shared.
- Export through the existing shared package entry points rather than deep-importing unstable files from another package.
- Use Zod refinements when the rule is part of the contract, such as matching confirmation fields, UUID parameters, enum values, or constrained numeric ranges.
- Avoid weakening schemas just to make one caller easier. If a caller has different rules, name that difference clearly.
- Include focused schema tests for non-trivial validation behaviour.
- Keep generated API, DTO, and Swagger wording aligned with the schema where the endpoint is documented.

## Database and Migrations

Database access is handled through Prisma in the backend package. Schema and migration work must stay separate from documentation-only changes and should follow the existing Prisma commands and review expectations.

Migrations should be reviewed as behavioural changes, not treated as incidental generated output. Documentation-only work must not change the Prisma schema or migration files.

Database standards:

- Keep Prisma schema, migration, repository, service, and test updates in the same feature slice when the behaviour depends on a schema change.
- Use committed migrations for persistent schema changes. Do not rely on local database drift.
- Use transaction-aware repository functions when several writes must succeed together.
- Guard lifecycle updates with the current state where stale updates could overwrite a newer decision.
- Keep seed data and test fixtures deterministic and safe. Do not commit real credentials, production data, or private organisation data.
- Use the backend integration-test database flow for database-backed integration behaviour where repository evidence supports it.
- Do not manually edit generated Prisma client files under generated output.

## Testing Expectations

Changes that add or alter behaviour are expected to include relevant tests or a clear reason why the change is documentation-only or otherwise not suited to automated tests. Testing expectations are expanded in the [Testing Policy](testing-policy.md).

At coding-standard level, the expectation is simple: the developer who changes behaviour owns the first layer of tests for that change. Unit tests should cover the smallest practical unit, integration tests should cover real interfaces where mocks are not enough, and E2E or smoke tests should be reserved for important user-visible flows.

Tests should be deterministic. Avoid stale hard-coded dates, production data, arbitrary sleeps, broad snapshots, and assertions that only prove an implementation detail. When a bug is fixed, add or update a regression test that would have failed before the fix.

## Generated Artefacts

Generated artefacts should not be manually edited. If a generated file needs to change, update the source or generator input and run the repository-supported generation command.

Generated and build output such as `dist`, coverage output, Playwright reports, frontend build output, and Prisma generated client files should not be used as hand-written source.

The repository already ignores several generated or output folders in ESLint configuration, including build output, coverage, test results, Playwright reports, and Prisma generated client output. That does not mean generated files are unimportant; it means their source of truth is elsewhere.

When generated artefacts must be refreshed, use the package-supported command and keep the diff reviewable. For example, Prisma client generation belongs to the backend Prisma workflow, while Swagger/OpenAPI documentation should stay aligned with route comments and shared schema components.

## Security-Sensitive Code

Security-sensitive code must avoid leaking secrets, credentials, tokens, raw provider errors, full request bodies, cookies, auth headers, SMTP configuration, or database connection details in logs, audit metadata, test fixtures, or documentation examples.

Validation should happen at trust boundaries, and error messages should be useful without exposing internal state. Security-relevant changes should be checked for authentication, authorisation, organisation scope, rate limiting, session impact, audit metadata, and safe logging where applicable.

Security-sensitive standards:

- Treat tokens, token hashes, passwords, cookies, auth headers, SMTP credentials, database URLs, and provider responses as sensitive.
- Store only the minimum data needed for audit and diagnostics. Prefer stable identifiers and compact flags over raw request or provider content.
- Keep authentication and account-security flows behind the existing middleware and rate-limiting patterns.
- Do not log full request bodies or raw external-service errors.
- Avoid user-controlled HTML unless it goes through an established sanitisation path.
- Keep access-control checks in the service layer even when middleware already rejects obviously invalid requests.
- Use environment variables or CI secrets for secrets. Do not document real secret values in examples.

## Git and Pull Requests

The repository includes Husky hooks, Commitlint configuration, lint-staged formatting, Codeowners, and a pull request template. The template asks for a summary, linked issue, change type, testing evidence, review notes, and a checklist that includes local testing, accessibility impact, unrelated changes, relevant tests, documentation updates, and secret safety.

Pull requests should stay focused on their linked issue, include the commands or manual checks that were run, and call out assumptions that reviewers should verify. Commit messages should follow the configured Commitlint convention.

The current Commitlint configuration accepts only these commit types: `feat`, `fix`, `docs`, and `chore`. The scope is intentionally empty, so commit subjects should follow the form:

```text
docs: update demo 2 coding standards
```

The configured hooks check branch safety, Git identity, environment-file policy, staged-file policy, Prettier formatting through lint-staged, and commit-message format. The hooks help, but they do not replace review. Reviewers should still check whether the change is scoped, supported by tests or manual evidence, and free from unrelated edits.

Pull requests should use the repository template and include:

- A short summary of what changed and why.
- The linked issue.
- The change type.
- Commands or manual checks run.
- Review notes, assumptions, accessibility impact, and deployment impact where relevant.
- Confirmation that no secrets or sensitive values were committed.

## Commands and Enforcement

The following root commands exist in [`package.json`](../../package.json) and are the main local checks for this standard:

| Command             | Purpose                                             | Evidence                                                               |
| ------------------- | --------------------------------------------------- | ---------------------------------------------------------------------- |
| `pnpm lint`         | Runs backend, frontend, and shared ESLint checks.   | Root script chains `lint:backend`, `lint:frontend`, and `lint:shared`. |
| `pnpm format`       | Formats the repository with Prettier.               | Root script runs `prettier --write .`.                                 |
| `pnpm format:check` | Checks Prettier formatting without writing files.   | Root script runs `prettier --check .`.                                 |
| `pnpm typecheck`    | Runs TypeScript checking across workspace packages. | Root script runs `pnpm -r typecheck`.                                  |
| `pnpm test`         | Runs package test scripts across the workspace.     | Root script runs `pnpm -r test`.                                       |

Focused commands also exist for package-level checks:

| Command                                | Purpose                                                                                             |
| -------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `pnpm test:backend`                    | Runs backend unit tests through the backend package script.                                         |
| `pnpm test:frontend`                   | Runs frontend Vitest tests through the frontend package script.                                     |
| `pnpm test:shared`                     | Runs shared package Vitest tests.                                                                   |
| `pnpm docker:test:integration:backend` | Creates or reuses the Docker test database, applies migrations, and runs backend integration tests. |
| `pnpm test:e2e:frontend`               | Runs frontend Playwright tests through the frontend package script.                                 |

These commands are evidence of the current repository configuration. They should not be described as complete proof of quality: linting, formatting, type checking, unit tests, integration tests, E2E tests, and manual review each cover different risks.

## References

- [Root package scripts](../../package.json)
- [pnpm workspace configuration](../../pnpm-workspace.yaml)
- [Prettier configuration](../../.prettierrc)
- [Root ESLint TypeScript base](../../eslint.config.base.js)
- [Frontend ESLint configuration](../../apps/frontend/eslint.config.js)
- [Backend ESLint configuration](../../apps/backend/eslint.config.js)
- [Shared ESLint configuration](../../packages/shared/eslint.config.js)
- [Commitlint configuration](../../commitlint.config.cjs)
- [Pull request template](../../.github/pull_request_template.md)
- [Backend testing notes](../../apps/backend/TESTING.md)
- [Demo 2 Testing Policy](testing-policy.md)
- [Demo 2 Documentation Home](README.md)
- Lecture guidance: Unit Testing / Software Testing, Integration Testing, Non-functional Testing, and Design Systems and CI/CD.

---

Previous section: [Demo 2 Documentation Home](README.md)

Next section: [Testing Policy](testing-policy.md)

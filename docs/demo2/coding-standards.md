# Coding Standards

This document records the coding standards used for Demo 2 work on Insightful Phish. It is based on the current pnpm workspace, TypeScript, ESLint, Prettier, testing scripts, and pull request template in the repository.

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

The goal of these standards is to keep Demo 2 code consistent, reviewable, and safe to change.It describes what is enforced by the repository configuration and what the team should follow when the tools do not enforce it directly.

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

## Frontend Standards

Frontend code should follow the current React, Vite, TypeScript, shared-validation, accessibility, and styling conventions already used in `apps/frontend`.

Frontend changes should keep user-visible behaviour accessible, predictable, and testable. Components should use typed props, avoid duplicating shared validation rules, and prefer behaviour-focused tests over assertions tied to fragile styling details.

## Backend Standards

Backend code should follow the current Express route, controller, service, repository, validation, audit, mail, logging, and Prisma boundaries already used in `apps/backend`.

Backend changes should keep request handling, business workflow, persistence, and infrastructure concerns separated. Controllers should stay thin, services should own use-case behaviour, repositories should isolate data access, and sensitive workflows should use the central audit and email boundaries where those already exist.

## Shared Contracts and Validation

Shared contracts should live in `packages/shared` when both frontend and backend need the same validation or request/response shape. Zod schemas should be treated as executable contracts at trust boundaries rather than as comments beside unvalidated objects.

Shared schemas should be small enough to understand, exported deliberately, and tested where they encode meaningful behaviour. Backend-only or frontend-only validation should stay in the owning package unless another package genuinely needs it.

## Database and Migrations

Database access is handled through Prisma in the backend package. Schema and migration work must stay separate from documentation-only changes and should follow the existing Prisma commands and review expectations.

Migrations should be reviewed as behavioural changes, not treated as incidental generated output. Documentation-only work must not change the Prisma schema or migration files.

## Testing Expectations

Changes that add or alter behaviour are expected to include relevant tests or a clear reason why the change is documentation-only or otherwise not suited to automated tests. Testing expectations are expanded in the [Testing Policy](testing-policy.md).

## Generated Artefacts

Generated artefacts should not be manually edited. If a generated file needs to change, update the source or generator input and run the repository-supported generation command.

Generated and build output such as `dist`, coverage output, Playwright reports, frontend build output, and Prisma generated client files should not be used as hand-written source.

## Security-Sensitive Code

Security-sensitive code must avoid leaking secrets, credentials, tokens, raw provider errors, full request bodies, cookies, auth headers, SMTP configuration, or database connection details in logs, audit metadata, test fixtures, or documentation examples.

Validation should happen at trust boundaries, and error messages should be useful without exposing internal state. Security-relevant changes should be checked for authentication, authorisation, organisation scope, rate limiting, session impact, audit metadata, and safe logging where applicable.

## Git and Pull Requests

The repository includes Husky hooks, Commitlint configuration, lint-staged formatting, Codeowners, and a pull request template. The template asks for a summary, linked issue, change type, testing evidence, review notes, and a checklist that includes local testing, accessibility impact, unrelated changes, relevant tests, documentation updates, and secret safety.

Pull requests should stay focused on their linked issue, include the commands or manual checks that were run, and call out assumptions that reviewers should verify. Commit messages should follow the configured Commitlint convention.

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
- [Backend testing notes](../../apps/backend/TESTING.md)
- [Demo 2 Testing Policy](testing-policy.md)
- [Demo 2 Documentation Home](README.md)
- Lecture guidance: Unit Testing / Software Testing, Integration Testing, Non-functional Testing, and Design Systems and CI/CD.

---

Previous section: [Demo 2 Documentation Home](README.md)

Next section: [Testing Policy](testing-policy.md)

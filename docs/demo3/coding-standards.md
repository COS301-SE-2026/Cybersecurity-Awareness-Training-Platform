# Coding Standards

This document records the coding standards used for Demo 3 work on Insightful Phish. It applies to the current TypeScript monorepo and separates rules enforced by tooling from standards that still depend on careful review.

## Contents

- [Purpose](#purpose)
- [Applicability](#applicability)
- [Tooling and Enforcement](#tooling-and-enforcement)
- [General TypeScript and Formatting Standards](#general-typescript-and-formatting-standards)
- [Naming](#naming)
- [Maintainability and Control Flow](#maintainability-and-control-flow)
- [Frontend Standards](#frontend-standards)
- [Backend Standards](#backend-standards)
- [Error Handling](#error-handling)
- [Shared Contracts and Validation](#shared-contracts-and-validation)
- [Database and Migrations](#database-and-migrations)
- [Testing Expectations](#testing-expectations)
- [Generated Artefacts](#generated-artefacts)
- [Security-Sensitive Code](#security-sensitive-code)
- [Project Examples](#project-examples)
- [Git and Pull Requests](#git-and-pull-requests)
- [Commands](#commands)
- [References](#references)

## Purpose

The goal of these standards is to keep Demo 3 code consistent, reviewable, and safe to change across the Insightful Phish monorepo. They describe the baseline expected for React frontend work, Express backend work, shared Zod contracts, Prisma-backed persistence, tests, scripts, and supporting documentation.

These standards are not a replacement for testing or design review. Formatting, linting, and type checking help catch a variety of mistakes early, while tests and manual review still need to check behaviour, security, accessibility, and requirements fit.

## Applicability

Insightful Phish is a pnpm workspace. The root [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml) includes:

| Workspace area    | Purpose                                                                             |
| ----------------- | ----------------------------------------------------------------------------------- |
| `apps/frontend`   | React and Vite frontend application.                                                |
| `apps/backend`    | Express, Prisma, API, mail, audit, and service-layer backend.                       |
| `packages/shared` | Shared TypeScript contracts and Zod validation schemas used across the application. |

The root [`package.json`](../../package.json) provides workspace-wide scripts that run the relevant package scripts through pnpm filters.

These standards apply to application code, package-level tests, repository scripts, generated-source inputs, and documentation that supports Demo 3 implementation. Earlier demo documentation is treated as a frozen baseline unless a reviewer explicitly requests a correction there.

The coding standards and [Testing Policy](testing-policy.md) sit alongside the Demo 3 SRS, SAS, NFR evidence, user interface notes, and user manual references. Testing details stay in the Testing Policy; this document only states the coding expectations that affect how changes should be written and reviewed.

## Tooling and Enforcement

Repository automation reduces review noise and catches common defects, but it does not prove that a change is architecturally correct, secure, accessible, or aligned with the SRS. The table below describes the current enforcement boundary based on the checked-in config.

| Tool or check                                    | Role in this repository                                                                                                                                   | Enforcement boundary                                                                                                               |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Prettier                                         | Applies the configured whitespace, quote, semicolon, trailing-comma, and print-width style.                                                               | Runs through `pnpm format`, `pnpm format:check`, CI formatting, and lint-staged on staged matching files.                          |
| ESLint                                           | Checks TypeScript and JavaScript rules, unused variables, promise misuse, type-import consistency, React Hooks, and React Refresh rules where configured. | Runs through package lint scripts and CI. Pull requests into `dev` lint changed files; other configured CI cases run full linting. |
| TypeScript                                       | Checks static types in the backend, frontend, and shared package.                                                                                         | Runs through package typecheck scripts and CI typecheck jobs. Runtime input still needs Zod or backend validation.                 |
| Vitest                                           | Runs backend unit tests, frontend unit/component tests, shared schema tests, and backend integration tests where configured.                              | Unit coverage commands run in CI for all packages. Backend integration tests run in CI against PostgreSQL with migrations.         |
| Playwright                                       | Provides frontend browser smoke and accessibility-oriented checks from the frontend package.                                                              | The root `pnpm test:e2e:frontend` command exists for local runs; the checked-in CI workflow does not currently run it.             |
| Lighthouse CI                                    | Audits configured frontend public routes for accessibility, best practices, and SEO, with performance disabled in the frontend Lighthouse config.         | Runs in a separate workflow with `continue-on-error: true`, so it is advisory evidence, not a blocking gate.                       |
| GitHub Actions CI                                | Installs with the lockfile, checks formatting, linting, type checking, unit tests, integration tests, builds, and Docker Compose config.                  | The `required-ci` job depends on those CI jobs passing.                                                                            |
| Policy workflow                                  | Checks committed environment-file policy and frozen historic documentation directories.                                                                   | Runs separately from CI on pull requests, pushes to protected branches, and manual dispatch.                                       |
| Codecov                                          | Receives coverage reports and test results from CI jobs.                                                                                                  | Upload failures are configured as non-blocking, so Codecov is reporting evidence rather than a repository-enforced numeric gate.   |
| SonarCloud, CodeQL, and GitHub Advanced Security | Provide platform-level static-analysis and security feedback when enabled on GitHub.                                                                      | Findings should be reviewed, but this repository does not define them as local commands in `package.json`.                         |
| Husky                                            | Runs local Git hooks for branch safety, Git identity, environment-file policy, staged-file policy, lint-staged formatting, and commit-message validation. | Local hook enforcement depends on installed dependencies and hooks being active; CI and review still verify important outcomes.    |
| Commitlint                                       | Enforces the configured commit-message shape and allowed commit types.                                                                                    | Runs from the Husky `commit-msg` hook together with the repository's custom commit-message check.                                  |
| lint-staged                                      | Formats staged matching files with Prettier before commit.                                                                                                | Runs from the Husky `pre-commit` hook only for staged files.                                                                       |

Review remains responsible for boundaries that tools cannot fully prove: correct layer ownership, safe error handling, backend-authoritative permissions, organisation isolation, appropriate tests, accessible user-visible behaviour, accurate documentation, and keeping unrelated work out of a change.

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

TypeScript standards:

- Prefer strong domain types and narrow interfaces over loose objects that can drift between layers.
- Validate untrusted input at trust boundaries with shared or backend Zod schemas before treating it as typed application data.
- Handle `null` and `undefined` deliberately. Avoid non-null assertions unless the invariant is clear and already checked.
- Keep asynchronous control flow explicit: awaited work should either be awaited, returned, or intentionally detached with a visible reason.
- Avoid unnecessary `any`, unchecked casts, and broad `unknown` handling that is not followed by validation or type narrowing.
- Reuse shared contracts where they exist instead of copying similar request or response types into one package.

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

## Maintainability and Control Flow

Code should be easy to review in the issue where it changes. The repository does not configure a numeric complexity threshold, so maintainability is checked through ESLint, tests, and review rather than a single score.

Maintainability standards:

- Keep functions, React components, services, and repository operations focused on one clear responsibility.
- Prefer understandable branches and early returns when they make validation, permission checks, or terminal states easier to follow.
- Limit nesting in request handlers, service workflows, and JSX. Extract named helpers when a condition or mapping starts to hide the intent.
- Decompose oversized React components into presentational pieces, state helpers, or feature-specific components when a page becomes hard to scan.
- Decompose large backend workflows into service helpers and repository operations without moving business rules into repositories.
- Keep refactors close to the behaviour being changed. Broad unrelated rewrites make review, regression testing, and rollback harder.

## Frontend Standards

Frontend code should follow the current React, Vite, TypeScript, shared-validation, accessibility, and styling conventions already used in `apps/frontend`.

Frontend changes should keep user-visible behaviour accessible, predictable, and testable. Components should use typed props, avoid duplicating shared validation rules, and prefer behaviour-focused tests over assertions tied to fragile styling details.

The frontend source is organised around `components`, `pages`, `routes`, `services`, `hooks`, `context`, `constants`, `lib`, and `testing`. New code should fit that structure before adding another top-level folder.

Frontend standards:

- Keep page components focused on screen composition and flow.
- Put reusable UI in component folders where the existing feature or shared UI structure already expects it before adding page-local duplicates.
- Keep API calls in established service or client helpers, such as the current `apiClient` pattern, instead of spreading raw `fetch` calls through components.
- Use shared schemas from `packages/shared` when the frontend and backend need the same validation contract, especially at form and API boundaries.
- Show explicit loading, error, empty, and success states for user-visible data flows.
- Sanitise rendered HTML where the existing code path handles rich content. The project already uses DOMPurify for this kind of boundary.
- Write accessible controls with useful labels, semantic buttons, keyboard interaction, visible focus, and understandable validation feedback.
- Present backend enum and lifecycle values through typed user-facing labels instead of rendering raw values such as `PENDING_ONBOARDING`.
- Prefer assertions about user-visible behaviour in tests. Avoid tests that only prove a particular utility-class string is present unless the styling contract itself is the behaviour under review.
- Keep design consistency with the current UI and hosted `/brand` guide without turning coding standards into a second Brand Guide.

## Backend Standards

Backend code should follow the current Express route, controller, service, repository, validation, audit, mail, logging, and Prisma boundaries already used in `apps/backend`.

Backend changes should keep request handling, business workflow, persistence, and infrastructure concerns separated. Controllers should stay thin, services should own use-case behaviour, repositories should isolate data access, and sensitive workflows should use the central audit and email boundaries where those already exist.

The backend source is organised into `routes`, `controllers`, `services`, `repositories`, `middleware`, `mappers`, `config`, `errors`, `lib`, `types`, `constants`, `content`, and generated Prisma client output. New backend work should respect those boundaries.

The required backend dependency direction is:

```text
Controller -> Service -> Repository -> Database
```

Backend standards:

- Routes should register middleware, rate limits where required, request validation, and controller handlers. They should not contain business workflows.
- Controllers should own HTTP concerns: request parsing, authenticated context extraction, response codes, and mapping service outcomes or service errors to HTTP responses.
- Services should own use cases: business workflows, permission checks, lifecycle classification, application policy, domain errors, transaction orchestration, audit recording, email hooks, and token or session decisions.
- Repositories should own persistence: Prisma/database access, transaction-aware operations, scoped queries, authoritative post-write reads, and persistence-focused errors.
- Only repositories should access Prisma or database state directly.
- Validation should use existing shared or backend Zod schemas rather than ad hoc request parsing.
- Authentication, authorisation, organisation scope, state transitions, and rate limiting should be checked deliberately on protected or sensitive routes.
- Audit metadata should stay compact and safe. It should not contain names, email addresses, raw tokens, token hashes, permission sets, full request bodies, raw database errors, or raw provider errors unless a documented safe exception exists.
- Email delivery should go through the central backend email or mail service. Feature code should not call SMTP directly.

Prohibited backend shortcuts:

- Controller-to-Repository shortcuts.
- Controller-to-Database or Controller-to-Prisma shortcuts.
- Service-to-Prisma shortcuts.
- Business workflows embedded in controllers.
- Business or permission policy hidden in repositories.
- Ad hoc database access outside repositories.

## Error Handling

Errors should make the failure understandable without turning sensitive internals into user-visible output or logs.

Error-handling standards:

- Do not swallow failures with empty `catch` blocks or convert unknown failures into fake success.
- Do not expose stack traces, SQL details, raw Prisma errors, provider responses, SMTP diagnostics, credentials, passwords, tokens, cookies, auth headers, or private request bodies.
- Controllers should map known service outcomes and application errors to HTTP responses. Unknown failures should continue to the established error-handling path.
- Services should use existing domain or application error types and keep recovery decisions close to the workflow that owns them.
- Repositories may surface persistence-focused errors that services can translate, but they should not decide business permissions.
- Frontend service clients and pages should use the established API error mapping path instead of each page guessing raw response shapes.
- Logs should be useful for diagnosis while using stable identifiers, error categories, and safe flags rather than sensitive values.

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
- Avoid broad `unknown` pass-through objects when a stable DTO or discriminated union would keep frontend and backend behaviour clearer.

## Database and Migrations

Database access is handled through Prisma in the backend package. Schema and migration work must stay separate from documentation-only changes and should follow the existing Prisma commands and review expectations.

Migrations should be reviewed as behavioural changes, not treated as incidental generated output. Documentation-only work must not change the Prisma schema or migration files.

Database standards:

- Keep Prisma schema, migration, repository, service, and test updates in the same feature slice when the behaviour depends on a schema change.
- Use backwards-compatible migration plans where possible and commit persistent migration history. Do not rely on local database drift.
- Use transaction-aware repository functions when several writes must succeed together or when an authoritative post-write read is needed.
- Guard lifecycle updates with the current state where stale updates could overwrite a newer decision.
- Keep seed data and test fixtures deterministic and safe. Do not commit real credentials, production data, or private organisation data.
- Use the backend integration-test database flow for database-backed integration behaviour where repository evidence supports it.
- Do not manually edit generated Prisma client files under generated output.
- Do not hide destructive data changes, local-only assumptions, or manual production shortcuts inside normal committed code or documentation.

## Testing Expectations

Developers must add or update unit tests when they add or change any behaviour. Documentation-only changes may not need automated tests, but they still need review and formatting checks. Testing expectations are expanded in the [Testing Policy](testing-policy.md).

At coding-standard level, the expectation is simple: the developer who changes behaviour owns the feature's unit tests for that change. Database-backed and cross-component backend integration testing is planned through separate, focused integration-test issues. Integration tests complement rather than replace feature-level unit tests. E2E or smoke tests should be reserved for important user-visible flows.

Important new behaviour needs meaningful success and failure coverage. Permission checks and Organisation-isolation paths are security-sensitive and should not be left to happy-path tests only. Tests should verify behaviour rather than pad coverage numbers.

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
- Treat untrusted input as untrusted until it has been validated at the correct boundary.
- Keep authorisation backend-authoritative. Frontend route guards and disabled buttons improve usability, but they are not security boundaries.
- Enforce Organisation isolation on the server for every organisation-scoped action or read.
- Keep access-control checks in the service layer even when middleware already rejects obviously invalid requests.
- Use established session and token services instead of custom shortcuts.
- Use environment variables or CI secrets for secrets. Do not document real secret values in examples.

## Project Examples

These examples are intentionally small. They show the preferred shape without replacing the surrounding feature's real types, imports, or tests.

### Backend Layer Boundary

Avoid controllers that reach into Prisma or repositories:

```ts
// Bad: controller owns persistence and business rules.
export async function disableTrainee(req: Request, res: Response) {
  const trainee = await prisma.organisationTraineeProfile.update({
    where: { id: req.params.traineeId },
    data: { membershipStatus: 'DISABLED' },
  });

  res.status(200).json(trainee);
}
```

Prefer the existing controller/service/repository direction:

```ts
// Good: controller maps HTTP, service owns policy, repository owns Prisma.
export async function disableTrainee(req: Request, res: Response) {
  const result = await disableOrganisationTrainee(
    req.auth.userId,
    req.params.organisationId,
    req.params.traineeId,
    req.body,
  );

  res.status(200).json(result);
}
```

### User-Facing Status Labels

Avoid exposing raw lifecycle values directly to users:

```tsx
// Bad: raw backend enum leaks into the table.
<td>{request.derivedStatus}</td>
```

Prefer a typed mapping with intentional wording:

```tsx
const statusLabels: Record<string, string> = {
  PENDING_ONBOARDING: 'Approved - Waiting For Setup',
  ACTIVE: 'Active',
};

<td>{statusLabels[request.derivedStatus] ?? 'Unknown'}</td>;
```

### Frontend API Boundary

Avoid page-local raw `fetch` calls that bypass shared error handling:

```tsx
// Bad: the page guesses URL, auth, parsing, and errors itself.
const response = await fetch(`/organisations/${organisationId}/trainees`);
const trainees = await response.json();
```

Prefer the established service/client path:

```tsx
// Good: service helper uses the shared apiClient and DTO types.
const result = await getOrganisationTrainees(organisationId, token);
```

## Git and Pull Requests

The repository includes Husky hooks, Commitlint configuration, lint-staged formatting, Codeowners, and a pull request template. The template asks for a summary, linked issue, change type, testing evidence, review notes, and a checklist that includes local testing, accessibility impact, unrelated changes, relevant tests, documentation updates, and secret safety.

Pull requests should stay focused on their linked issue, include the commands or manual checks that were run, and call out assumptions that reviewers should verify. Commit messages should follow the configured Commitlint convention.

The current Commitlint configuration accepts only these commit types: `feat`, `fix`, `docs`, and `chore`. The scope is intentionally empty, so commit subjects should follow the form:

```text
docs: update Demo 3 coding standards
```

The configured hooks check branch safety, Git identity, environment-file policy, staged-file policy, Prettier formatting through lint-staged, and commit-message format. The hooks help, but they do not replace review. Reviewers should still check whether the change is scoped, supported by tests or manual evidence, and free from unrelated edits.

Pull requests should use the repository template and include:

- A short summary of what changed and why.
- The linked issue.
- The change type.
- Commands or manual checks run.
- Review notes, assumptions, accessibility impact, and deployment impact where relevant.
- Confirmation that no secrets or sensitive values were committed.

## Commands

The following root commands exist in [`package.json`](../../package.json) and are the main local commands for this standard:

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

These commands are evidence of the current repository configuration. They should not be described as complete proof of quality: linting, formatting, type checking, unit tests, integration tests, local Playwright runs, advisory checks, and manual review each cover different risks.

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
- [Demo 3 Testing Policy](testing-policy.md)
- [Demo 3 Documentation Home](README.md)
- Lecture guidance: Unit Testing / Software Testing, Integration Testing, Non-functional Testing, and Design Systems and CI/CD.

---

Previous section: [Demo 3 Documentation Home](README.md)

Next section: [Testing Policy](testing-policy.md)

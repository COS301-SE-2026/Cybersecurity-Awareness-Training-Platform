# Testing Policy

This document describes how Insightful Phish tests Demo 3 work. It combines the repository's current Vitest, Playwright, Docker, coverage, Lighthouse, NFR checks, and CI setup with the testing principles covered in the course material.

## Contents

- [Testing Policy](#testing-policy)
  - [Contents](#contents)
  - [Purpose](#purpose)
  - [Testing Principles](#testing-principles)
  - [Test Types](#test-types)
  - [Unit Testing](#unit-testing)
  - [Integration Testing](#integration-testing)
  - [Contract Testing](#contract-testing)
  - [End-to-End and Smoke Testing](#end-to-end-and-smoke-testing)
  - [Manual Acceptance Testing](#manual-acceptance-testing)
  - [Non-Functional Checks](#non-functional-checks)
  - [Test Environments and Data](#test-environments-and-data)
  - [Responsibilities](#responsibilities)
  - [CI and Reporting](#ci-and-reporting)
  - [Regression and Defect Handling](#regression-and-defect-handling)
  - [References](#references)

## Purpose

Testing gives the team evidence that Insightful Phish behaves as required and that changes do not quietly break existing flows. It is dynamic validation: tests execute software with selected inputs, states, and environments to reveal defects, undesirable behaviour, or mismatches with requirements.

Testing does not prove that the system is defect-free. It also does not replace debugging, formatting, linting, type checking, accessibility checks, or code review. Those activities support quality, but they answer different questions from tests.

This policy explains the levels of testing expected for Demo 3 work and how they relate to the repository structure:

| Area                            | Main evidence                                                                                                                             |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Backend                         | Vitest unit tests, Vitest integration tests, Supertest where HTTP behaviour is under review, and the Docker-backed PostgreSQL test setup. |
| Frontend                        | Vitest component and page tests, Testing Library, Playwright smoke or E2E flows, and accessibility-focused checks where configured.       |
| Shared package                  | Vitest tests for Zod schemas and shared validation contracts.                                                                             |
| Documentation and manual review | Manual acceptance evidence for flows that are difficult, expensive, or not yet useful to automate.                                        |

## Testing Principles

Developers must add or update unit tests when they add or change behaviour. Database-backed and cross-component backend integration testing is planned through separate, focused integration-test issues. Integration tests complement rather than replace feature-level unit tests. Documentation-only changes may not need automated tests, but they still need review and formatting checks.

The team follows these principles:

- Tests should assert observable behaviour, not private implementation detail.
- Test data should be deterministic and safe. Avoid stale hard-coded dates, production data, real credentials, and arbitrary sleeps.
- Use Arrange, Act, Assert where it makes the test easier to read.
- Prefer many fast unit tests, fewer integration tests, and a small number of high-value E2E or smoke tests.
- Keep tests granular enough that a failure points to a useful area of the system.
- Add regression coverage for bugs so the same failure is less likely to return.
- Treat coverage as a measure of thoroughness, not as proof of quality. The current repository reports coverage, but this policy must not claim a numeric threshold unless it is enforced by configuration.
- Keep linting, formatting, type checking, Lighthouse, Codecov, SonarQube or SonarCloud, and CodeQL separate from tests in wording and review notes.

Use-case based testing should start from the requirement or user flow being changed. For larger features, identify the relevant use case, choose success and failure scenarios, define the input data, and record the expected outcome before deciding which test level is the best fit.

## Test Types

The project uses different test types for different risks:

| Test type             | What it checks                                                  | Typical Insightful Phish examples                                                                                                        |
| --------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Unit                  | A small practical unit in isolation.                            | Validation helpers, service decision branches with mocked repositories, mappers, and shared schemas.                                     |
| Integration           | Interfaces and data exchange between real components.           | Backend route/service/repository behaviour against a test database, API validation, transaction behaviour, and persistence side effects. |
| Contract              | Shared request, response, and validation rules.                 | Zod schemas in `packages/shared` that must be understood by both frontend and backend.                                                   |
| E2E or smoke          | A meaningful user flow through the running application.         | Login, setup, campaign participation, account settings, and other reviewer-visible flows where a browser check adds confidence.          |
| Manual acceptance     | Human verification of implemented behaviour and demo readiness. | Checking copy, edge cases, visual states, MailPit email output, and flows not yet worth automating.                                      |
| Non-functional checks | Quality properties rather than only functional outcomes.        | Accessibility, security-sensitive behaviour, reliability, maintainability, portability, and selected performance concerns.               |

The right test type depends on the risk. A pure schema rule belongs in a schema test. A service transaction with database state belongs closer to an integration test. A key user journey may deserve a Playwright smoke check.

## Unit Testing

Unit tests focus on the smallest practical testable unit. They should run quickly, stay isolated, remain deterministic, and be granular enough that failures are easy to understand.

Expected unit-test practices:

- Keep setup local to the behaviour under test.
- Mock external boundaries such as repositories, mailers, and provider calls when the unit is not meant to test those systems.
- Use realistic but safe fixtures. Do not use real passwords, real tokens, real email credentials, or production data.
- Use relative dates in the needed direction when the test depends on expiry behaviour.
- Assert success and failure paths that matter to the use case.
- Avoid weakening assertions to accept both correct and incorrect outcomes.
- Avoid snapshots unless the output is intentionally stable and a snapshot is the clearest review tool.

Backend unit tests currently run through:

```bash
pnpm test:backend
```

Frontend unit and component tests currently run through:

```bash
pnpm test:frontend
```

Shared validation tests currently run through:

```bash
pnpm test:shared
```

## Integration Testing

Integration testing verifies that components work together correctly and exchange data through the intended interfaces. It assumes the units involved have already been tested individually.

For Insightful Phish, integration tests are most useful when behaviour depends on:

- Express routing and request validation.
- Service and repository interaction.
- Prisma persistence.
- Database constraints and transactions.
- Authentication or organisation-scope boundaries that cannot be represented honestly with only mocked data.
- Email, audit, token, or session side effects where the real boundary matters.

The backend has a dedicated integration-test setup documented in [Backend Testing](../../apps/backend/TESTING.md). Database-backed integration tests use a PostgreSQL test database named `insightful_phish_test`, and the Docker command prepares that database before running backend integration tests:

```bash
pnpm docker:test:integration:backend
```

If a database is mocked, the test should not be described as a database integration test. It may still be a useful service or controller unit test, but the wording should be honest.

Backend database and integration tests are planned through separate, and should not depend on demo seed data, rather if any new records are needed , such records should be created accordingly.

The common integration strategies from the lecture material are useful vocabulary:

| Strategy  | How it applies here                                                                  |
| --------- | ------------------------------------------------------------------------------------ |
| Top-down  | Useful when route or controller behaviour drives the integration boundary.           |
| Bottom-up | Useful when repositories and service helpers need to be proven before broader flows. |
| Sandwich  | Useful for features where service logic and HTTP behaviour both carry risk.          |
| Big-bang  | Avoid for normal feature work because it makes failures harder to diagnose.          |

## Contract Testing

Contract tests check that shared request, response, and validation shapes behave as expected. In this repository, the clearest contract-testing evidence is in `packages/shared/src/validation`, where Zod schemas and schema tests live together.

Contract tests should cover:

- Required and optional fields.
- UUID, enum, email, date, and numeric constraints.
- Confirmation-field rules such as matching password or email fields.
- Rejection of extra fields where strict schemas are intended.
- Error cases that the frontend and backend both need to understand.

Shared schemas should not become a dumping ground for every package-specific rule. A schema belongs in `packages/shared` when both sides of the application need the same contract. Backend-only or frontend-only validation can stay with the owning package.

## End-to-End and Smoke Testing

End-to-end tests should exercise a meaningful user flow through the application. For this project, true E2E must exercise the real frontend, backend, and test database. We use a test database as to allow for easy reseeding to run these tests multiple times and not disrupt the actual production data base.

The frontend package provides the Playwright command through the root script:

```bash
pnpm test:e2e:frontend
```

The current Playwright suite provides frontend smoke and accessibility checks. API-dependent flows currently use intercepted responses and therefore do not constitute full-stack E2E testing. The `pnpm test:e2e:frontend` command is currently run locally and is not part of the checked-in CI workflow.

E2E and smoke tests should stay small and valuable. They are not the place to retest every validation branch already covered by unit or integration tests.

Good candidates for Demo 3 smoke coverage include:

- Authentication entry and protected-route behaviour.
- Organisation registration and onboarding flows.
- Invitation or setup-token completion.
- Trainee campaign participation paths.
- Account security flows where browser behaviour matters.

Fully mocked or intercepted UI tests should not be called true full-stack E2E tests. They can still be useful frontend smoke, accessibility, component, or page tests, but the label should match what the test actually proves. Full-stack E2E coverage should be added through focused work that runs the real frontend, backend, and test database together.

## Manual Acceptance Testing

Manual acceptance testing confirms implemented flows that are hard, expensive, unstable, or not useful enough to automate yet. It is especially useful for demo readiness, wording, visual states, email previews, accessibility feel, and flows that cross local services such as MailPit.

Manual acceptance evidence should record:

- The date and branch or build checked.
- The user role and relevant organisation context.
- The relevant actor and preconditions.
- The happy path verified.
- Important negative or edge cases checked.
- The documented expected result and observed result.
- Commands, local services, or seeded data used.
- Any failures, follow-up owners, or accepted limitations.

A test passes when the observed result matches its documented expected result. Manual acceptance checks must verify the relevant actor, preconditions, main outcome, and alternate or failure paths. However manual acceptance should not be used as an excuse to skip reasonable automated tests. It complements automation, especially when a reviewer needs confidence that the feature works as a user would experience it.

## Non-Functional Checks

Non-functional checks look at quality properties such as accessibility, security, reliability, maintainability, portability, and selected performance concerns. These checks should be reported separately from functional test results because they do not answer the same question as a unit, integration, or E2E test.

Functional tests check what the system does. Non-functional checks ask whether the system is safe, usable, reliable, maintainable, accessible, performant enough for selected local flows, and portable to run. For Demo 3, these checks are tied to the retained SRS quality requirements and the [NFR traceability matrix](nfr/traceability-matrix.md).

| Quality area                | Demo 3 policy                                                                                                                                                                                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Accessibility and usability | Frontend work should support keyboard access, labels, useful errors, visible focus, clear navigation, and responsive layouts. Playwright accessibility checks and Lighthouse are useful evidence where configured, but failures must be reported honestly.                                 |
| Security                    | Security checks should cover authentication, authorisation, rate limiting, session handling, data integrity, safe audit metadata, safe logging, and the absence of leaked secrets or tokens in bounded evidence.                                                                           |
| Reliability                 | Tests should cover failure handling, stale or repeated actions, recovery paths, transaction behaviour, durable notification state, and duplicate-send prevention where the workflow depends on several writes or external delivery boundaries.                                             |
| Traceability                | Requirement IDs, local documentation links, evidence summaries, and SAS mappings should remain aligned through repeatable traceability checks.                                                                                                                                             |
| Auditability                | Sensitive actions should produce scoped audit records with safe metadata, and failed or stale paths must not create false success milestones.                                                                                                                                              |
| Portability                 | Docker-backed setup, pnpm lockfile use, workspace scripts, documented environment variables, and deployment documentation support repeatable local, CI, and release-preparation runs.                                                                                                      |
| Performance                 | Performance evidence is limited to the Demo 3 local smoke harness route set and thresholds. Do not claim load, stress, spike, endurance, concurrency, soak, or production-scale capacity unless a separate check is added and documented.                                                  |
| Risk assessment             | Reviewers should consider security-sensitive code, configuration changes, CI evidence, NFR evidence, and secret handling. CodeQL, SonarQube or SonarCloud, and GitHub Advanced Security findings may contribute to review when they are available, but they are separate from local tests. |

Demo 3 NFR command classification:

| Check                             | Command                                          | Environment and data prerequisites                                                                                                                                              | CI/manual/release classification                                                                                           | Evidence output location                                                                               | Pass/fail rule                                                                                                                           | Response to failure                                                                                                                         |
| --------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Deterministic NFR bundle          | `pnpm nfr:deterministic`                         | Local repository checkout; no running services required.                                                                                                                        | Stable local check and CI candidate.                                                                                       | Summarised in `docs/demo3/nfr/evidence/`.                                                              | Fails if traceability, bounded security scan, protected route wiring, or audit integrity checks miss their mechanical expectations.      | Fix the implementation, route declaration, audit expectation, or evidence boundary, then rerun the command and update the evidence summary. |
| Traceability/docs check           | `pnpm nfr:traceability -- --strict`              | Local repository checkout with SRS, SAS, and NFR docs present.                                                                                                                  | Stable local check and CI candidate.                                                                                       | `docs/demo3/nfr/traceability-matrix.md` and evidence summaries.                                        | Fails if retained QR IDs or local quality-document links are missing or inconsistent.                                                    | Align the SRS QR IDs, NFR matrix, SAS mapping, and local relative links before acceptance.                                                  |
| Sensitive-data evidence scan      | `pnpm nfr:security`                              | Local repository checkout; bounded generated/evidence paths only.                                                                                                               | Stable local check and CI candidate.                                                                                       | Current evidence summary plus command output.                                                          | Fails if prohibited sensitive values appear in scanned evidence paths.                                                                   | Remove unsafe evidence, replace it with bounded summaries, and keep the underlying implementation from logging or persisting unsafe values. |
| Audit integrity check             | `pnpm nfr:audit`                                 | Local repository checkout; relies on audit sanitiser and focused audit test expectations.                                                                                       | Stable local check and CI candidate.                                                                                       | Current evidence summary plus command output.                                                          | Fails if audit sanitiser coverage or focused audit expectations are missing.                                                             | Add or repair the relevant audit safety check and rerun the command.                                                                        |
| Accessibility check               | `pnpm nfr:accessibility`                         | Frontend dependencies installed; Playwright starts the frontend preview server and runs Chromium at the documented viewport.                                                    | Local or release check until the known registration-page accessibility failure is fixed.                                   | `docs/demo3/nfr/evidence/2026-08-21-summary.md` and ignored Playwright artefacts if generated locally. | Fails when selected pages have critical axe violations or required keyboard focus expectations are not met.                              | Keep the failed evidence visible, fix the page or component, rerun the command, and update the evidence summary.                            |
| Performance smoke check           | `pnpm nfr:performance`                           | Backend service running against seeded Demo 3 data; `DEMO3_NFR_AUTH_TOKEN` set to a short-lived local bearer token; `DEMO3_NFR_ORGANISATION_ID` set to the seeded organisation. | Manual/release check. Do not add to PR CI unless services, seeded data, and safe local authentication become stable there. | Current evidence summary or a small dated evidence summary.                                            | Fails if p95 latency exceeds `2000ms`, error rate exceeds `0.01`, a response body cannot be consumed, or the configured route set fails. | Record actual results, fix the bottleneck or environment issue, and rerun the same authenticated route set.                                 |
| Performance configuration dry-run | `pnpm nfr:performance:dry-run`                   | Local repository checkout; no services, token, or database required.                                                                                                            | Stable local configuration check.                                                                                          | Current evidence summary.                                                                              | Fails if the authenticated seeded route set, workload, timeout, or thresholds are invalid.                                               | Fix the script configuration before running the service-backed smoke check.                                                                 |
| Deployment reproducibility review | Documented deployment configuration/build checks | Release-preparation or deployment environment with required configuration available.                                                                                            | Manual/release check.                                                                                                      | Current evidence summary or deployment evidence note.                                                  | Fails if documented configuration, health checks, secret boundaries, or build/deploy commands cannot be reproduced.                      | Correct documentation or configuration and record the exact command/result in bounded evidence.                                             |

Evidence retention rules:

- Keep evidence bounded and reviewable; summarise command results rather than committing large raw logs.
- Do not include secrets, credentials, production traffic captures, raw tokens, token hashes, rendered action links, private email addresses, SMTP credentials, cookies, auth headers, full request bodies, raw provider responses, or raw database errors.
- Failed and not-run evidence must remain honest. Do not edit a failed check to look passing.
- When a tactic misses the target, record the failure, owner or follow-up path, and the command needed to verify the fix.

Lighthouse is configured for the frontend through [`apps/frontend/lighthouserc.json`](../../apps/frontend/lighthouserc.json). It checks the login and registration routes for accessibility, best practices, and SEO, with performance disabled in that configuration. The workflow is currently non-blocking, so Lighthouse evidence should be reported honestly as a quality signal unless the workflow is changed to enforce it.

The older [Demo 1 testing plan](../demo1/testing.md) remains useful for manual demo thinking, especially around happy paths, negative paths, seeded data, and pass/fail notes. This policy does not copy that plan wholesale; it keeps the reusable testing rules and leaves feature-specific manual checklists in their owning documents.

## Test Environments and Data

Tests must use safe, deterministic data and must not depend on production secrets or production records. Backend integration tests should use the dedicated test database path described in the backend testing notes, while unit tests should keep data local to the behaviour under test.

Expected environments:

| Environment                         | Purpose                                                          | Data rules                                                                                                                                                                |
| ----------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local unit test run                 | Fast package-level checks during development.                    | Use local fixtures, mocks, and safe generated values. Do not depend on running services unless the test type says so.                                                     |
| Backend integration test database   | Database-backed backend checks.                                  | Use `insightful_phish_test` or another database whose name clearly contains `test`. Create records through setup or factories. Do not use demo seed data as a dependency. |
| Frontend Playwright preview server  | Frontend browser smoke and accessibility checks.                 | Playwright builds the frontend and runs against the Vite preview server at `http://127.0.0.1:4173`; API-dependent flows currently use intercepted responses.              |
| NFR deterministic check environment | Traceability, security, route wiring, and audit checks.          | Use a clean local repository checkout. These checks should not require production secrets, database state, or running services.                                           |
| NFR release/manual environment      | Accessibility, performance, and deployment reproducibility.      | Record the exact services, base URLs, viewport, build, branch, and configuration used. Keep evidence bounded and free of sensitive values.                                |
| CI test environment                 | Repeatable verification on pull requests and protected branches. | CI installs with the lockfile, generates Prisma client where needed, runs migrations against the test database, and uploads coverage or test reports where configured.    |
| Manual local environment            | Human acceptance and demo readiness checks.                      | Record the branch or build, roles used, local services such as MailPit, and the exact flow checked.                                                                       |

The backend integration setup is deliberately defensive. It sets `NODE_ENV` to `test`, copies `TEST_DATABASE_URL` into `DATABASE_URL` when present, refuses cleanup unless the database name contains `test`, rejects known development or system databases, rejects production-like hosts, excludes `_prisma_migrations`, and truncates application tables before tests.

Test data should be:

- Deterministic enough that the same test can run tomorrow without changing meaning.
- Isolated from other tests unless the suite deliberately shares setup.
- Safe to print in failure output.
- Free of real passwords, raw tokens, token hashes, SMTP credentials, cookies, auth headers, production data, and private organisation records.
- Created as close as possible to the test that needs it, unless a shared factory makes the setup clearer.

## Responsibilities

The developer who changes behaviour owns the feature's unit test update. Reviewers check whether the evidence matches the risk, whether the PR notes honestly describe what was and was not tested, and whether the submitted testing evidence supports acceptance. All must be accepted by two reviewers to allow the PR to be successfully merged into `dev`.

Responsibilities:

| Role          | Responsibility                                                                                                                                                                         |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Developer     | Add or update unit tests for changed behaviour, run the relevant local commands, record manual checks, and keep fixtures safe.                                                         |
| Reviewer      | Check whether the test level matches the risk, whether important failure paths are covered, whether PR evidence is honest, and whether submitted testing evidence supports acceptance. |
| Feature owner | Decide when a larger flow needs follow-up database-backed integration, cross-component integration, full-stack E2E, or manual acceptance work beyond the first feature slice.          |
| Team          | Keep flaky tests visible and fix them promptly instead of normalising ignored failures.                                                                                                |

If a change cannot reasonably be covered by automated unit tests in the same slice, the PR should explain why and describe the manual acceptance evidence or follow-up issue. Database-backed and cross-component integration tests should be tracked through their focused issues.

## CI and Reporting

CI should provide evidence that required checks were run. Coverage, test-result uploads, Lighthouse reports, and external quality checks should be described according to the repository configuration, without inventing gates that are not enforced.

The current CI workflow provides these checks:

| CI job                    | Evidence produced                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Formatting                | Runs `pnpm format:check`.                                                                                    |
| Linting                   | Runs changed-file ESLint checks for pull requests into `dev`, or full `pnpm lint` in other configured cases. |
| Typecheck                 | Runs backend, frontend, and shared TypeScript checks.                                                        |
| Backend unit tests        | Runs backend unit coverage command and uploads backend coverage and JUnit results where configured.          |
| Frontend unit tests       | Runs frontend unit coverage command and uploads frontend coverage and JUnit results where configured.        |
| Shared unit tests         | Runs shared package coverage command and uploads shared coverage and JUnit results where configured.         |
| Backend integration tests | Starts PostgreSQL, generates Prisma client, deploys migrations, and runs backend integration tests.          |
| Build                     | Builds shared, backend, and frontend packages.                                                               |
| Lighthouse                | Builds the frontend and runs Lighthouse against configured public routes as a non-blocking quality check.    |

The checked-in CI workflow does not currently run `pnpm test:e2e:frontend`. Playwright evidence should therefore be described as local frontend browser smoke or accessibility evidence until a later sprint issue adds full-stack E2E execution.

The checked-in CI workflow does not currently run the new Demo 3 NFR commands. The deterministic commands are stable CI candidates, but this slice does not wire them into PR CI. Accessibility, performance, and deployment reproducibility remain local, manual, or release checks because they depend on browser execution, running services, or a release-preparation environment.

Codecov upload steps are configured for coverage reports and test results, but their upload failures are currently allowed not to fail CI. That means Codecov is useful reporting evidence, not proof that a numeric coverage gate is enforced by this repository.

No repository-enforced numeric coverage requirement was found in the current package or Vitest configuration. Coverage should still be reviewed as a quality signal, especially when new code has little or no behavioural coverage.

CI is a contract with reviewers: a green required build should mean that the configured checks passed. The team should not make empty passing suites, ignored failures, or forced-success commands normal practice.

PR testing notes should include:

- Relevant local commands run.
- Manual acceptance checks, if any.
- Known gaps or follow-up test issues.
- Whether the change affected accessibility, security, database state, or external-service boundaries.

## Regression and Defect Handling

When a defect is fixed, the relevant test set should be rerun and a regression test should be added where practical. Flaky tests should be corrected or isolated with a clear reason, not ignored as a normal practice.

Material failures must be recorded with the environment or build, reproduction steps, expected result, actual result, impact, and owner. Fixes must be retested through regression testing.

Regression testing is the re-execution of a relevant subset of existing tests after a change to confirm that expected behaviour still holds. The subset should be chosen based on the changed code and what it affects.

Useful regression selection includes:

- Tests for the changed component, service, route, schema, or page.
- Tests for nearby workflows that share the same state, policy, token, session, email, audit, or database path.
- A representative sample of broader unit or integration tests when the changed code is shared.
- E2E or manual smoke checks when the change affects a reviewer-visible path.

Defect fixes should prefer a test that would have failed before the fix. If the issue was caused by time, ordering, stale state, concurrent updates, token lifecycle, organisation scope, unsafe metadata, or validation, the regression test should make that specific behaviour visible.

Flaky tests should not be quietly accepted. If a test is unreliable because it depends on time, network timing, data ordering, or external services, stabilise the test data or isolate the boundary. If a test must be skipped temporarily, the reason and follow-up owner should be clear in the PR.

## References

- [Root package scripts](../../package.json)
- [Frontend package scripts](../../apps/frontend/package.json)
- [Backend package scripts](../../apps/backend/package.json)
- [Shared package scripts](../../packages/shared/package.json)
- [Backend Testing](../../apps/backend/TESTING.md)
- [Demo 1 older testing plan](../demo1/testing.md)
- [Frontend Lighthouse configuration](../../apps/frontend/lighthouserc.json)
- [Frontend Playwright configuration](../../apps/frontend/playwright.config.ts)
- [Backend integration test configuration](../../apps/backend/vitest.integration.config.ts)
- [Backend integration setup](../../apps/backend/tests/setup.integration.ts)
- [Backend test database helper](../../apps/backend/tests/helpers/database.ts)
- [Continuous Integration workflow](../../.github/workflows/ci.yml)
- [Lighthouse workflow](../../.github/workflows/lighthouse.yml)
- [Demo 3 Coding Standards](coding-standards.md)
- Lecture guidance: Unit Testing / Software Testing, Integration Testing, Non-functional Testing, and Design Systems and CI/CD.

---

Previous section: [Coding Standards](coding-standards.md)

Next section: [Demo 3 Documentation Home](README.md)

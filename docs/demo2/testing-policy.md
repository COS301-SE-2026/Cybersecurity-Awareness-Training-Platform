# Testing Policy

This document describes how Insightful Phish tests Demo 2 work. It combines the repository's current Vitest, Playwright, Docker, coverage, Lighthouse, and CI setup with the testing principles covered in the course material.

## Contents

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

This policy explains the levels of testing expected for Demo 2 work and how they relate to the repository structure:

| Area                            | Main evidence                                                                                                                             |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Backend                         | Vitest unit tests, Vitest integration tests, Supertest where HTTP behaviour is under review, and the Docker-backed PostgreSQL test setup. |
| Frontend                        | Vitest component and page tests, Testing Library, Playwright smoke or E2E flows, and accessibility-focused checks where configured.       |
| Shared package                  | Vitest tests for Zod schemas and shared validation contracts.                                                                             |
| Documentation and manual review | Manual acceptance evidence for flows that are difficult, expensive, or not yet useful to automate.                                        |

## Testing Principles

Every developer is responsible for adding or updating tests when they add or change behaviour. Documentation-only changes may not need automated tests, but they still need review and formatting checks.

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

Unit tests focus on the smallest practical testable unit. They should be fast, isolated, deterministic, and granular enough that failures are easy to understand.

Expected unit-test practices:

- Keep setup local to the behaviour under test.
- Mock external boundaries such as repositories, mailers, and provider calls when the unit is not meant to test those systems.
- Use realistic but safe fixtures. Do not use real passwords, real tokens, real email credentials, or production data.
- Use relative future or past dates when the test depends on expiry behaviour.
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

Backend database-backed and cross-component integration tests should be added as separate, focused work where the feature needs that level of confidence. They should create their own records through setup or factories and should not depend on Demo 1 seed data.

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

End-to-end tests should exercise a meaningful user flow through the application. For this project, true E2E should drive the browser against a real local or deployed stack where practical. Network interception is best reserved for external third-party services that cannot be controlled in CI.

The frontend package provides the Playwright command through the root script:

```bash
pnpm test:e2e:frontend
```

E2E and smoke tests should stay small and valuable. They are not the place to retest every validation branch already covered by unit or integration tests.

Good candidates for Demo 2 smoke coverage include:

- Authentication entry and protected-route behaviour.
- Organisation registration and onboarding flows.
- Invitation or setup-token completion.
- Trainee campaign participation paths.
- Account security flows where browser behaviour matters.

Fully mocked UI tests should not be called true E2E tests. They can still be useful component or page tests, but the label should match what the test actually proves.

## Manual Acceptance Testing

Manual acceptance testing confirms implemented flows that are hard, expensive, unstable, or not useful enough to automate yet. It is especially useful for demo readiness, wording, visual states, email previews, accessibility feel, and flows that cross local services such as MailPit.

Manual acceptance evidence should record:

- The date and branch or build checked.
- The user role and relevant organisation context.
- The happy path verified.
- Important negative or edge cases checked.
- Commands, local services, or seeded data used.
- Any failures, follow-up owners, or accepted limitations.

Manual acceptance should not be used as an excuse to skip reasonable automated tests. It complements automation, especially when a reviewer needs confidence that the feature works as a user would experience it.

## Non-Functional Checks

Non-functional checks look at quality properties such as accessibility, security, reliability, maintainability, portability, and selected performance concerns. These checks should be reported separately from functional test results because they do not answer the same question as a unit, integration, or E2E test.

Functional tests check what the system does. Non-functional checks ask whether the system is safe, usable, reliable, maintainable, and portable to run. For Demo 2, these checks should be tied to the repo evidence and the SRS quality requirements.

| Quality area                | Demo 2 policy                                                                                                                                                                                                                                                                                |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accessibility and usability | Frontend work should support keyboard access, labels, useful errors, visible focus, clear navigation, and responsive layouts. Playwright accessibility tests and Lighthouse checks are useful evidence where configured.                                                                     |
| Security                    | Security checks should cover authentication, authorisation, rate limiting, session handling, data integrity, safe audit metadata, safe logging, and the absence of leaked secrets or tokens.                                                                                                 |
| Reliability                 | Tests should cover failure handling, stale or repeated actions, recovery paths, and transaction behaviour where the workflow depends on several writes succeeding together.                                                                                                                  |
| Maintainability             | Linting, formatting, type checking, small tests, clear fixtures, and focused documentation help reviewers understand change impact. These are quality checks, not substitutes for behaviour tests.                                                                                           |
| Portability                 | Docker-backed setup, pnpm lockfile use, workspace scripts, and documented environment variables support repeatable local and CI runs.                                                                                                                                                        |
| Performance                 | The repository has no dedicated load, stress, spike, endurance, concurrency, or soak-test tooling configured. Do not claim those checks were run unless a feature explicitly adds and documents them.                                                                                        |
| Risk assessment             | Reviewers should consider security-sensitive code, configuration changes, CI evidence, and secret handling. CodeQL, SonarQube or SonarCloud, and GitHub Advanced Security findings may contribute to review when they are available on the platform, but they are separate from local tests. |

Lighthouse is configured for the frontend through [`apps/frontend/lighthouserc.json`](../../apps/frontend/lighthouserc.json). It checks the login and registration routes for accessibility, best practices, and SEO, with performance disabled in that configuration. The workflow is currently non-blocking, so Lighthouse evidence should be reported honestly as a quality signal unless the workflow is changed to enforce it.

The older [Demo 2 testing plan](testing.md) is still useful for manual demo thinking, especially around happy paths, negative paths, seeded data, and pass/fail notes. This policy does not copy that plan wholesale; it keeps the reusable testing rules and leaves feature-specific manual checklists in the older document until those are replaced by more current Demo 2 acceptance notes.

## Test Environments and Data

Tests must use safe, deterministic data and must not depend on production secrets or production records. Backend integration tests should use the dedicated test database path described in the backend testing notes, while unit tests should keep data local to the behaviour under test.

Expected environments:

| Environment                       | Purpose                                                          | Data rules                                                                                                                                                                  |
| --------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local unit test run               | Fast package-level checks during development.                    | Use local fixtures, mocks, and safe generated values. Do not depend on running services unless the test type says so.                                                       |
| Backend integration test database | Database-backed backend checks.                                  | Use `insightful_phish_test` or another database whose name clearly contains `test`. Create records through setup or factories. Do not use Demo 1 seed data as a dependency. |
| Frontend E2E preview server       | Browser smoke and E2E checks.                                    | Playwright builds the frontend and runs against the Vite preview server at `http://127.0.0.1:4173`.                                                                         |
| CI test environment               | Repeatable verification on pull requests and protected branches. | CI installs with the lockfile, generates Prisma client where needed, runs migrations against the test database, and uploads coverage or test reports where configured.      |
| Manual local environment          | Human acceptance and demo readiness checks.                      | Record the branch or build, roles used, local services such as MailPit, and the exact flow checked.                                                                         |

The backend integration setup is deliberately defensive. It sets `NODE_ENV` to `test`, copies `TEST_DATABASE_URL` into `DATABASE_URL` when present, refuses cleanup unless the database name contains `test`, rejects known development or system databases, rejects production-like hosts, excludes `_prisma_migrations`, and truncates application tables before tests.

Test data should be:

- Deterministic enough that the same test can run tomorrow without changing meaning.
- Isolated from other tests unless the suite deliberately shares setup.
- Safe to print in failure output.
- Free of real passwords, raw tokens, token hashes, SMTP credentials, cookies, auth headers, production data, and private organisation records.
- Created as close as possible to the test that needs it, unless a shared factory makes the setup clearer.

## Responsibilities

The developer who changes behaviour owns the first test update. Reviewers check whether the evidence matches the risk and whether the PR notes honestly describe what was and was not tested.

Responsibilities:

| Role          | Responsibility                                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Developer     | Add or update tests for changed behaviour, run the relevant local commands, record manual checks, and keep fixtures safe.      |
| Reviewer      | Check whether the test level matches the risk, whether important failure paths are covered, and whether PR evidence is honest. |
| Feature owner | Decide when a larger flow needs follow-up integration, E2E, or manual acceptance work beyond the first feature slice.          |
| Team          | Keep flaky tests visible and fix them promptly instead of normalising ignored failures.                                        |

If a change cannot reasonably be covered by automated tests in the same slice, the PR should explain why and describe the manual acceptance evidence or follow-up issue.

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
- [Demo 2 Lighthouse Notes](LIGHTHOUSE.md)
- [Demo 2 older testing plan](testing.md)
- [Frontend Lighthouse configuration](../../apps/frontend/lighthouserc.json)
- [Frontend Playwright configuration](../../apps/frontend/playwright.config.ts)
- [Backend integration test configuration](../../apps/backend/vitest.integration.config.ts)
- [Backend integration setup](../../apps/backend/tests/setup.integration.ts)
- [Backend test database helper](../../apps/backend/tests/helpers/database.ts)
- [Continuous Integration workflow](../../.github/workflows/ci.yml)
- [Lighthouse workflow](../../.github/workflows/lighthouse.yml)
- [Demo 2 Coding Standards](coding-standards.md)
- Lecture guidance: Unit Testing / Software Testing, Integration Testing, Non-functional Testing, and Design Systems and CI/CD.

---

Previous section: [Coding Standards](coding-standards.md)

Next section: [Demo 2 Documentation Home](README.md)

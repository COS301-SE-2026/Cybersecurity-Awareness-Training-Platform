# Demo 4 Local NFR Verification - 2026-09-28

## Verification Context

| Field            | Value                                      |
| ---------------- | ------------------------------------------ |
| Evidence class   | LOCAL / PRE-RC                             |
| Date             | 2026-09-28                                 |
| Time zone        | South Africa Standard Time (UTC+02:00)     |
| Branch           | `chore/demo4-nfr/adriano`                  |
| Revision         | `7f218f11a55b181f790876bfb55a77d6a28dbf38` |
| Operating system | Microsoft Windows 10.0.26200.9457          |
| Node.js          | 24.14.0                                    |
| pnpm             | 10.33.2                                    |
| Docker Compose   | 5.0.2                                      |

This is local, pre-release-candidate evidence. It does not establish release deployment or production performance. No credentials, connection strings, or test data are recorded here.

## Result Summary

| Requirement         | Result  | Basis                                                                                                                                                                                                                                                    |
| ------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `QR-AUTH-01`        | PARTIAL | Static route inventory passed and bounded access-related unit checks passed. Database-backed access and Campaign assignment suites were blocked because the committed migration chain cannot construct the schema expected by the current Prisma client. |
| `QR-DATA-01`        | PARTIAL | Bounded evidence scan and selected AI, audit, portal, and security-boundary unit checks passed. Some database-backed boundary suites remained blocked.                                                                                                   |
| `QR-ACCESS-01`      | PARTIAL | Five public screens passed Chromium axe and keyboard-focus checks. Authenticated trainee and administrator screens were not exercised.                                                                                                                   |
| `QR-RELIABILITY-01` | PARTIAL | Selected unit checks passed; three database-backed suites passed, but assignment, delivery, lifecycle, and account-security integration coverage was incomplete because the committed migration chain cannot construct the current schema.               |
| `QR-PERF-01`        | PARTIAL | Performance configuration dry-run passed. No HTTP latency or error-rate measurement was performed.                                                                                                                                                       |
| `QR-TRACE-01`       | PASS    | Strict eight-ID parity and scoped local-link checks passed.                                                                                                                                                                                              |
| `QR-AUDIT-01`       | PASS    | Static audit checks, audit unit tests, and the audit integration suite passed, including redaction assertions.                                                                                                                                           |
| `QR-DEPLOY-01`      | BLOCKED | Compose configuration checks passed, but there was no exact #573 release candidate or deployed environment. Local shell syntax validation was unavailable.                                                                                               |

## Commands and Observations

### Deterministic, Traceability, Data Scan, and Performance Configuration

| Command                             | Result | Observation                                                                                                                                                                                                   |
| ----------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm nfr:deterministic`            | PASS   | Verified all eight Demo 4 QR identifiers, local links, selected protected-route declarations, bounded evidence scanning, and static audit expectations.                                                       |
| `pnpm nfr:traceability -- --strict` | PASS   | Verified QR parity across the SRS, NFR matrix, and SAS mapping, plus scoped local Markdown targets.                                                                                                           |
| `pnpm nfr:security`                 | PASS   | The bounded Demo 4 evidence scan found none of its prohibited sensitive-value patterns.                                                                                                                       |
| `pnpm nfr:performance:dry-run`      | PASS   | Configuration contained seven routes, ten requests per route, concurrency two, 5000 ms timeout, p95 threshold at most 2000 ms, and error-rate threshold at most 0.01. This was not a performance measurement. |

### Selected Unit Runtime Checks

Two bounded backend Vitest runs covered action-token handling, account changes, email dispatch and persistence, Campaign assignment and content lifecycle, Quiz handling, organisation administration and invitations, AI builder/proposal/variant boundaries, audit redaction, portal services, and persisted adaptive resolution.

Result: **PASS - 19 files and 260 tests passed.**

The requested portal-persistence test path was not present under the supplied unit-test location and therefore contributed no result.

### Selected Integration Runtime Checks

The bounded integration selection covered access control, account security, Campaign assignment, content lifecycle, email delivery, Quiz attempts, audit logging, organisation security settings, and organisation trainee actions.

Result: **PARTIAL - 3 files and 63 tests passed; 6 files and 41 tests failed.**

Passing integration areas included audit logging, organisation security settings, and Quiz attempt/submission behaviour. The failures were not accepted as functional PASS or FAIL evidence because the test database schema did not match the current generated Prisma client. Representative failures reported missing columns.

The documented setup creates the isolated `insightful_phish_test` database and runs committed migrations. At this revision, the migration directory ends at `20260919130000_add_adaptive_campaign_resolutions`, while the current Prisma schema contains later portal, simulation, and delivery changes. Recreating the disposable database through the supported setup would therefore reproduce the mismatch. The cached local workspace image also lacked its configured entrypoint. No database reset or unsupported schema push was performed.

The run also emitted an OpenAPI parser warning for the Campaign copy route annotation ending in `copy;`. This warning is outside this evidence-only commit and should be corrected separately.

### Accessibility

Command: `pnpm nfr:accessibility`

Result: **PARTIAL - 6 Playwright tests passed in Chromium in 49.5 seconds.**

The representative public screens were:

- `/login`
- `/register`
- `/forgot-password`
- `/organisation-registration-request`
- `/status`

The core page checks used a 1366 by 768 viewport. They reported zero critical axe violations and passed the configured keyboard-focus assertion. The separate login accessibility test also passed. No stable authenticated browser fixture was available, so trainee Campaign/activity and administrator Content/Campaign Management screens were not exercised.

### Deployment Preparation

The root, production, and development Docker Compose configuration checks completed successfully using the repository example environment files. Local Bash syntax checks could not produce reliable evidence from this Windows environment because the working files use CRLF line endings and WSL execution was unavailable.

No exact #573 release candidate, deployed health result, routed smoke result, image promotion result, or rollback execution was available. `QR-DEPLOY-01` therefore remains **BLOCKED**.

## Limitations and Follow-up

- Restore the committed migrations needed to reproduce the current Prisma schema in a separate product/database change, rebuild the workspace image, and then recreate the isolated integration database before rerunning the blocked suites.
- Add a stable authenticated Playwright fixture before claiming the full selected-screen accessibility target.
- Run `pnpm nfr:performance` against the exact seeded release environment and record measured p95 and error rate.
- Record exact-RC build, migration, deployment, health, routing, promotion, and rollback-input evidence under #573.
- Correct the Campaign copy OpenAPI annotation in a separate product/documentation change.

---

Back to the [Evidence Index](README.md).

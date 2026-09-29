# Demo 4 Historical Pre-Merge Local Verification - 2026-09-28

## Verification Context

| Field            | Value                                      |
| ---------------- | ------------------------------------------ |
| Evidence class   | LOCAL / PRE-RC                             |
| Date             | 2026-09-28                                 |
| Time zone        | South Africa Standard Time (UTC+02:00)     |
| Branch           | `chore/demo4-nfr/adriano`                  |
| Revision         | `6d6961d196d61d7d5d3732db83f5acd014c727d9` |
| Operating system | Microsoft Windows 10.0.26200.9457          |
| Node.js          | 24.14.0                                    |
| pnpm             | 10.33.2                                    |
| Docker Compose   | 5.0.2                                      |

This is historical local, pre-release-candidate evidence for the exact revision above. Later Demo 4 changes are not covered by these results; see the evidence index for subsequent verification. It does not establish release deployment or production performance. No credentials, connection strings, or test data are recorded here.

## Result Summary

| Requirement         | Result  | Basis                                                                                                                                                                                                                                                               |
| ------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `QR-AUTH-01`        | PASS    | Static route inventory and the selected access-control, account-security, Campaign assignment, content-lifecycle, organisation-security, and organisation-trainee runtime suites passed.                                                                            |
| `QR-DATA-01`        | PARTIAL | Bounded evidence scanning plus selected AI, audit-redaction, account-security, and response-boundary tests passed. No focused portal-persistence test exists at the mapped path, so that boundary remains without direct local evidence.                            |
| `QR-ACCESS-01`      | PARTIAL | Five public screens passed Chromium axe and keyboard-focus checks. Authenticated trainee and administrator screens were not exercised.                                                                                                                              |
| `QR-RELIABILITY-01` | PASS    | The selected action-token, account/session, email-delivery, assignment/unassignment, content-lifecycle, Quiz, and persisted adaptive-resolution unit and integration suites passed.                                                                                 |
| `QR-PERF-01`        | PARTIAL | A real local measurement passed all seven authenticated routes, but no exact release-candidate measurement was available.                                                                                                                                           |
| `QR-TRACE-01`       | PASS    | Strict eight-ID parity and scoped local-link checks passed.                                                                                                                                                                                                         |
| `QR-AUDIT-01`       | PASS    | Static audit checks, audit unit tests, and the audit integration suite passed, including redaction assertions.                                                                                                                                                      |
| `QR-DEPLOY-01`      | BLOCKED | The workspace build, three Compose configuration checks, and local backend health check passed. The committed migrations cannot reconstruct the current schema, no exact #573 release candidate was available, and deployment/promotion/rollback were not executed. |

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

Result: **PASS - 9 files and 104 tests passed.**

| Suite                                                | Tests | Result |
| ---------------------------------------------------- | ----: | ------ |
| `access-control.integration.test.ts`                 |    10 | PASS   |
| `account-security.integration.test.ts`               |    23 | PASS   |
| `campaign-assignment.integration.test.ts`            |    26 | PASS   |
| `content-lifecycle.integration.test.ts`              |     2 | PASS   |
| `email-delivery.integration.test.ts`                 |    10 | PASS   |
| `organisationTrainee.api.test.ts`                    |    17 | PASS   |
| `audit-log.integration.test.ts`                      |     6 | PASS   |
| `organisation-security-settings.integration.test.ts` |     5 | PASS   |
| `uc03-quiz.integration.test.ts`                      |     5 | PASS   |

At revision `6d6961d196d61d7d5d3732db83f5acd014c727d9`, the documented migration setup could not create the schema used by that revision's Prisma client: its migration directory ended at `20260919130000_add_adaptive_campaign_resolutions`, while its schema contained later portal, simulation, and delivery changes. For that historical local run only, the disposable `insightful_phish_test` database was synchronized directly from that revision's `schema.prisma` using `prisma db push`; the Prisma client was then regenerated locally. This historical workaround did not validate migration or deployment repeatability and is not a statement about the current migration chain.

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

### Local Performance Measurement

Command: `pnpm nfr:performance`

Result: **LOCAL PASS - 70 authenticated requests, ten per route at concurrency two, with zero errors.**

| Route                                                                |    p95 | Error rate |
| -------------------------------------------------------------------- | -----: | ---------: |
| `GET /account`                                                       | 185 ms |          0 |
| `GET /account/sessions`                                              |  37 ms |          0 |
| `GET /organisations/{organisationId}/trainees`                       |  61 ms |          0 |
| `GET /organisations/{organisationId}/admins`                         |  51 ms |          0 |
| `GET /organisations/{organisationId}/campaigns`                      |  61 ms |          0 |
| `GET /organisations/{organisationId}/campaign-content/catalog`       |  66 ms |          0 |
| `GET /organisations/{organisationId}/campaign-assignment-candidates` |  52 ms |          0 |

The temporary backend used port 4100, an organisation administrator created through the existing test fixture and real login flow, and the documented local `AUTH_RATE_LIMIT_MAX_REQUESTS=20` setting. An initial run against a leftover temporary process using the code default of five requests was invalidated by rate limiting; the stale process was stopped before the recorded run. The recorded worst p95 of 185 ms passed the 2000 ms target and all route error rates passed the 0.01 target. This is local evidence, not exact-RC performance evidence, so `QR-PERF-01` remains **PARTIAL**.

### Deployment Preparation

The following local preparation checks passed:

- `pnpm build` for shared, backend, and frontend production builds;
- root, production, and development Docker Compose configuration rendering with temporary non-secret values;
- the temporary backend `/health` endpoint returned HTTP 200;
- static inspection confirmed SHA-addressed image inputs and current/previous release-marker and rollback handling in the deployment script.

Bash syntax validation remained unavailable: Windows-host execution was unsuitable for the CRLF working files, and the existing local application images do not contain Bash. No deployment, image promotion, migration-chain execution, routed production health check, or rollback was performed.

No exact #573 release candidate, deployed health result, routed smoke result, image promotion result, or rollback execution was available. `QR-DEPLOY-01` therefore remains **BLOCKED**.

## Limitations and Follow-up

- This historical run did not have the committed migrations needed to reproduce its Prisma schema. Later evidence must retest the then-current committed migration chain rather than carrying this limitation forward.
- Add a stable authenticated Playwright fixture before claiming the full selected-screen accessibility target.
- Repeat the passing performance measurement against the exact seeded release candidate before promoting `QR-PERF-01` from PARTIAL.
- Record exact-RC build, migration, deployment, health, routing, promotion, and rollback-input evidence under #573.
- Correct the Campaign copy OpenAPI annotation in a separate product/documentation change.

---

Back to the [Evidence Index](README.md).

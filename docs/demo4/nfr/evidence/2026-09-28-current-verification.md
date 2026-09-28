# Demo 4 Current-Revision Local NFR Verification - 2026-09-28

## Verification Context

| Field            | Value                                                                        |
| ---------------- | ---------------------------------------------------------------------------- |
| Evidence class   | LOCAL / CURRENT-REVISION / PRE-RC                                            |
| Date             | 2026-09-28                                                                   |
| Time zone        | South Africa Standard Time (UTC+02:00)                                       |
| Branch           | `chore/demo4-nfr/adriano`                                                    |
| Base revision    | `0c937a37a0a469b80e4762eabce06fa2b50223b6`                                   |
| Working state    | Base revision plus the uncommitted PR-review changes listed in this evidence |
| Operating system | Microsoft Windows 10.0.26200.9457                                            |
| Node.js / pnpm   | 24.14.0 / 10.33.2                                                            |
| Database         | Disposable PostgreSQL 16 container on a loopback-only port                   |
| Browser          | Playwright Chromium, desktop viewport                                        |

No credential, token, cookie, database URL, or private test value is recorded. The base SHA is exact; because the user performs commits manually, the current review changes do not yet have a commit SHA. This evidence must not be relabelled as release-candidate evidence.

## Result Summary

| Requirement         | Result  | Current local basis                                                                                                                                                                                       |
| ------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `QR-AUTH-01`        | PASS    | Representative access, account, organisation, assignment, lifecycle, trainee, portal, and adaptive boundaries passed in the fixed integration selection.                                                  |
| `QR-DATA-01`        | PASS    | Bounded evidence scan, frontend zero-capture serialization, backend raw-field rejection, and exact durable portal-record inspection passed.                                                               |
| `QR-ACCESS-01`      | PASS    | Five public screens, trainee Campaigns, a trainee Training Document activity, Content Management, and Campaign Management passed the critical-axe and documented keyboard checks.                         |
| `QR-RELIABILITY-01` | PASS    | Fixed unit/integration selections passed, including real-database adaptive-resolution concurrency and portal occurrence constraints.                                                                      |
| `QR-PERF-01`        | PARTIAL | Demo 4-only configuration and unchanged thresholds passed dry-run; no exact-RC measurement exists.                                                                                                        |
| `QR-TRACE-01`       | PASS    | Strict raw definition parity, unexpected-ID rejection, duplicate-definition rejection, and local file/fragment validation passed.                                                                         |
| `QR-AUDIT-01`       | PASS    | Current database-backed account, organisation, trainee, assignment, lifecycle, and redaction checks passed.                                                                                               |
| `QR-DEPLOY-01`      | PARTIAL | The full 55-migration committed chain deployed to a fresh database and local builds/config checks are available; exact-RC deployment, routed health, promotion, and rollback evidence remain unavailable. |

## Exact Commands and Results

### Tooling and Documentation

| Command                             | Result | Observed result                                                                                                                                             |
| ----------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm nfr:tooling:test`             | PASS   | 2 Node tests passed.                                                                                                                                        |
| `pnpm nfr:deterministic`            | PASS   | All Demo 4 deterministic groups passed.                                                                                                                     |
| `pnpm nfr:traceability -- --strict` | PASS   | Exactly eight authoritative definitions and both mapping files passed; local Markdown files and fragments resolved.                                         |
| `pnpm nfr:security`                 | PASS   | Bounded Demo 4 evidence scan found no prohibited pattern.                                                                                                   |
| `pnpm nfr:performance:dry-run`      | PASS   | Seven Demo 4 route templates; 10 requests per route; concurrency 2; timeout 5000 ms; p95 target 2000 ms; error-rate target 0.01. This is not a measurement. |

### Fixed Runtime Selections

| Command                        | Environment                                       | Result                                                                                                                                                                    |
| ------------------------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm nfr:runtime:unit`        | Local Node.js                                     | PASS: 11 files, 285 tests.                                                                                                                                                |
| `pnpm nfr:runtime:frontend`    | Local jsdom                                       | PASS: 2 files, 9 tests.                                                                                                                                                   |
| `pnpm nfr:runtime:integration` | Fresh migrated disposable PostgreSQL              | PASS after correcting the new test fixture: 11 files, 117 tests. The initial run's only failure was the new zero-capture fixture; the corrected focused test then passed. |
| `pnpm nfr:accessibility`       | Production frontend build and Playwright Chromium | PASS: 9 tests across public, trainee, and administrator surfaces.                                                                                                         |

The integration command uses the exact file selection encoded in `package.json`. Database preparation used a fresh PostgreSQL 16 container and:

```text
DATABASE_URL=<redacted disposable test URL> pnpm --filter @insightful-phish/backend prisma:migrate:deploy
```

All 55 committed migrations, ending at `20260927120000_retain_portal_history_on_unassign`, applied successfully. No `prisma db push` workaround was used.

## Database-Backed Data Boundary

The portal persistence integration test creates a real organisation trainee, Campaign assignment/item, approved Simulated Inbox, managed portal source and opaque token. It records a canonical `CREDENTIAL_SUBMISSION_ATTEMPTED` event through the public HTTP route, verifies that a request containing a unique fake raw value is rejected, and queries the exact `ManagedPortalLink` and `PortalInteractionEvent` records. One allowed metadata event remains and the raw sentinel is absent.

The frontend portal client tests separately verify that identifier and credential values held by the browser are not serialized into the request body.

## Database-Backed Adaptive Concurrency

The adaptive integration test creates real Campaign, assignment, item, alternatives, and reusable content rows. Eight competing service calls target the same `(campaignAssignmentId, campaignItemId)` key with competing valid candidates. All callers converge on one winner, exactly one call reports creation, and a direct durable query finds exactly one valid `AdaptiveCampaignResolution`.

## Accessibility Surfaces

Public screens: `/login`, `/register`, `/forgot-password`, `/organisation-registration-request`, and `/status`.

Authenticated screens: trainee `/campaigns`, trainee `/training/:campaignItemId`, administrator Content Management, and administrator Campaign Management. Keyboard checks cover Campaign expansion with Enter, Training Document completion with Enter, sequential focus across multiple Content Management tabs, and Campaign creation navigation with Enter. All selected screens have zero critical axe violations.

## Release-Candidate Limitation

No exact #573 release identifier, deployed image digest, or accessible deployed release environment was identifiable locally. Therefore no exact-RC performance measurement, routed health result, promotion marker, or rollback evidence is claimed. `QR-PERF-01` and `QR-DEPLOY-01` remain PARTIAL pending that external evidence.

---

Back to the [Evidence Index](README.md).
